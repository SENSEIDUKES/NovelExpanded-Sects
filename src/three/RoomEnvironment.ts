import * as THREE from 'three';
import { PLANET_SCALE } from './cameraZoomRig';

export interface RoomEnvironmentHandles {
  group: THREE.Group;
  atmosphereRimMaterial: THREE.ShaderMaterial;
  innerTroposphereMaterial: THREE.ShaderMaterial;
  skyMaterial: THREE.ShaderMaterial;
  starfieldPoints: THREE.Group;
  updateTimeOfDay: (
    dayFactor: number,
    twilightFactor: number,
    nightFactor: number,
    elapsedTime: number,
    planetQuaternion?: THREE.Quaternion,
    weatherIntensity?: number,
  ) => void;
  /** Tint the glowing atmosphere for the active world type (white = untinted) */
  setAtmosphereTint: (tint: THREE.Color) => void;
}

/**
 * Outer radius of the planetary atmosphere in world units.
 * Encompasses the 1.2x scaled planet (0.90 base radius) as well as all
 * orbiting clouds, rain/snow showers, hot air balloons, and shooting stars.
 */
export const ATMOSPHERE_OUTER_RADIUS = 0.75 * PLANET_SCALE * 1.56; // ~1.404 world units

/**
 * Tuned atmospheric glow parameters for a soft, airy, natural horizon haze.
 */
export const ATMOSPHERE_GLOW_CONFIG = {
  rimBaseOpacity: 0.46,
  rimHaloBoost: 0.08,
  rimMaxOpacity: 0.54,
  innerBloomStrength: 0.14,
  innerBloomMaxOpacity: 0.17,
} as const;

/**
 * Deterministic pseudo-random generator for reproducible 3D star distribution.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

interface StarShellConfig {
  name: string;
  count: number;
  seedOffset: number;
  minRadius: number;
  maxRadius: number;
  minSize: number;
  maxSize: number;
  minLuma: number;
  maxLuma: number;
  flareThreshold: number;
  flareStrength: number;
  parallaxFactor: number;
}

/**
 * Builds a single spherical shell of 3D stars using a custom circular radial
 * ShaderMaterial (strictly discarding outside the unit circle so zero box/square
 * artifacts can ever render) with true perspective size attenuation.
 */
function createStarShell(
  cfg: StarShellConfig,
  dpr: number,
): {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  parallaxFactor: number;
} {
  const positions = new Float32Array(cfg.count * 3);
  const colors = new Float32Array(cfg.count * 3);
  const sizes = new Float32Array(cfg.count);
  const phases = new Float32Array(cfg.count);
  const flares = new Float32Array(cfg.count);

  const palette = [
    new THREE.Color('#ffffff'), // Pure starlight white
    new THREE.Color('#d6e8ff'), // Crisp celestial ice-blue
    new THREE.Color('#ffecc8'), // Warm golden-white giant
    new THREE.Color('#e6dcff'), // Soft lavender-silver
    new THREE.Color('#bef2ff'), // Subtle cyan-white
  ];

  for (let i = 0; i < cfg.count; i++) {
    const seed = cfg.seedOffset + i * 13.37;
    const r1 = seededRandom(seed + 1.1);
    const r2 = seededRandom(seed + 2.3);
    const r3 = seededRandom(seed + 3.7);
    const r4 = seededRandom(seed + 5.1);
    const r5 = seededRandom(seed + 7.9);

    const theta = r1 * Math.PI * 2;
    const uniformCosPhi = 2 * r2 - 1;
    // Gently concentrate ~35% of stars toward a tilted galactic band
    const inBand = i % 3 === 0;
    const cosPhi = inBand
      ? THREE.MathUtils.clamp(uniformCosPhi * 0.44, -0.98, 0.98)
      : uniformCosPhi;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));

    const radius =
      cfg.minRadius + Math.pow(r3, 0.85) * (cfg.maxRadius - cfg.minRadius);
    // Power curve so fine pinpoint stars are numerous and giant beacons are rare
    const sizeCurve = Math.pow(r4, 2.6);
    const baseSize = cfg.minSize + sizeCurve * (cfg.maxSize - cfg.minSize);
    const flare = r4 > cfg.flareThreshold ? cfg.flareStrength : 0.0;

    const rawX = radius * sinPhi * Math.cos(theta);
    const rawY = radius * cosPhi;
    const rawZ = radius * sinPhi * Math.sin(theta);

    // Tilt galactic plane by ~28 degrees
    const tilt = 0.48;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    positions[i * 3] = rawX;
    positions[i * 3 + 1] = rawY * cosT - rawZ * sinT;
    positions[i * 3 + 2] = rawY * sinT + rawZ * cosT;

    const baseCol = palette[Math.floor(r5 * palette.length)];
    const luma = cfg.minLuma + Math.pow(r4, 1.3) * (cfg.maxLuma - cfg.minLuma);
    colors[i * 3] = baseCol.r * luma;
    colors[i * 3 + 1] = baseCol.g * luma;
    colors[i * 3 + 2] = baseCol.b * luma;

    sizes[i] = baseSize;
    phases[i] = r1 * Math.PI * 2 + r3 * 30.0;
    flares[i] = flare;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  starGeo.setAttribute('aFlare', new THREE.BufferAttribute(flares, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0.0 },
      uPixelRatio: { value: dpr },
      uNightBoost: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      attribute float aFlare;

      varying vec3 vColor;
      varying float vTwinkle;
      varying float vFlare;
      varying float vDepthFade;

      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uNightBoost;

      void main() {
        vColor = aColor;
        vFlare = aFlare;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(0.8, -mvPosition.z);

        // Organic per-star scintillation
        float speed = 1.2 + fract(aPhase * 0.37) * 2.1;
        float wave = sin(uTime * speed + aPhase) * 0.5 + 0.5;
        vTwinkle = mix(0.64, 1.0, wave) * (1.0 + uNightBoost * 0.2);

        // Fade out smoothly if camera zooms extremely close to a foreground mote
        // and subtly attenuate ultra-distant stars for natural atmospheric depth cue
        float nearFade = smoothstep(1.1, 2.8, dist);
        float farAtten = clamp(1.18 - dist * 0.012, 0.48, 1.0);
        vDepthFade = nearFade * farAtten;

        // Perspective size attenuation
        float perspectiveScale = 36.0 / dist;
        float pointSize = aSize * perspectiveScale * uPixelRatio * (0.9 + 0.14 * wave);
        gl_PointSize = clamp(pointSize, 1.8 * uPixelRatio, 18.0 * uPixelRatio);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vFlare;
      varying float vDepthFade;

      void main() {
        // Map point sprite UV from [0,1] to [-1,1] radial coordinates
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float r = length(uv);

        // Strictly discard outside unit circle — prevents any square/box corners
        if (r > 1.0) discard;

        // Smooth circular airy disk core + soft radial halo
        float core = exp(-r * r * 15.0);
        float halo = exp(-r * r * 4.2) * 0.52;
        float radialEdge = 1.0 - smoothstep(0.62, 1.0, r);

        // Delicate celestial cross-flare on bright beacon stars only
        float spikeX = exp(-abs(uv.y) * 18.0) * exp(-abs(uv.x) * 3.4);
        float spikeY = exp(-abs(uv.x) * 18.0) * exp(-abs(uv.y) * 3.4);
        float spikes = (spikeX + spikeY) * vFlare * 0.42;

        float alpha = (core + halo + spikes) * radialEdge * vTwinkle * vDepthFade;
        vec3 finalCol = mix(vColor, vec3(1.0), core * 0.7);

        gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 1.0));
      }
    `,
  });

  const points = new THREE.Points(starGeo, material);
  points.name = cfg.name;
  points.renderOrder = -8;
  return { points, material, parallaxFactor: cfg.parallaxFactor };
}

/**
 * Creates the open-space starry cosmos environment for the Sect World:
 * 1. Deep cosmos shader dome with smooth nebula wisps & galactic band (zero blocky grid stars).
 * 2. 3-Layer 3D parallax starfield (`near`, `mid`, `deep` shells) with round radial point shaders
 *    and multi-plane rotational + radial depth parallax.
 * 3. Rich, opaque glowing purple/blue planetary atmosphere (`ATMOSPHERE_OUTER_RADIUS`) that
 *    veils background stars behind the planet's sky and encloses all clouds, rain, snow,
 *    and hot air balloons.
 */
export function createRoomEnvironment(
  _envMap?: THREE.Texture,
): RoomEnvironmentHandles {
  const group = new THREE.Group();

  // ---------------------------------------------------------------------------
  // 1. DEEP COSMOS SKY DOME (Smooth Nebula Gradients & Galactic Dust Band)
  // ---------------------------------------------------------------------------
  const skyGeo = new THREE.SphereGeometry(52, 64, 48);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uDayFactor: { value: 1.0 },
      uTwilightFactor: { value: 0.0 },
      uNightFactor: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vLocalPos;
      uniform float uDayFactor;
      uniform float uTwilightFactor;
      uniform float uNightFactor;
      uniform float uTime;

      float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }

      float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float n000 = hash(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash(i + vec3(0.0, 0.0, 0.0));
        float n101 = hash(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash(i + vec3(1.0, 1.0, 1.0));

        float nx00 = mix(n000, n100, f.x);
        float nx10 = mix(n010, n110, f.x);
        float nx01 = mix(n001, n101, f.x);
        float nx11 = mix(n011, n111, f.x);

        float nxy0 = mix(nx00, nx10, f.y);
        float nxy1 = mix(nx01, nx11, f.y);

        return mix(nxy0, nxy1, f.z);
      }

      void main() {
        vec3 dir = normalize(vLocalPos);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

        // Deep cosmic void base gradient
        vec3 daySpaceBottom = vec3(0.036, 0.050, 0.106);
        vec3 daySpaceTop    = vec3(0.012, 0.018, 0.048);
        vec3 daySpace = mix(daySpaceBottom, daySpaceTop, smoothstep(0.0, 1.0, h));

        vec3 twiSpaceBottom = vec3(0.046, 0.038, 0.102);
        vec3 twiSpaceTop    = vec3(0.010, 0.014, 0.042);
        vec3 twiSpace = mix(twiSpaceBottom, twiSpaceTop, smoothstep(0.0, 1.0, h));

        vec3 nightSpaceBottom = vec3(0.018, 0.024, 0.056);
        vec3 nightSpaceTop    = vec3(0.005, 0.008, 0.022);
        vec3 nightSpace = mix(nightSpaceBottom, nightSpaceTop, smoothstep(0.0, 1.0, h));

        vec3 sky = daySpace * uDayFactor + twiSpace * uTwilightFactor + nightSpace * uNightFactor;

        // Tilted galactic dust band & soft multi-octave nebula clouds
        vec3 galDir = vec3(dir.x, dir.y * 0.88 - dir.z * 0.46, dir.y * 0.46 + dir.z * 0.88);
        float galacticBand = exp(-galDir.y * galDir.y * 7.0);

        float neb1 = noise3D(dir * 2.4 + vec3(0.0, uTime * 0.003, 0.0));
        float neb2 = noise3D(dir * 4.8 - vec3(uTime * 0.002, 0.0, 0.0));
        float neb3 = noise3D(dir * 9.5);
        float nebulaCloud = smoothstep(0.38, 0.84, neb1 * 0.55 + neb2 * 0.30 + neb3 * 0.15);

        vec3 nebulaAmethyst = vec3(0.15, 0.09, 0.28);
        vec3 nebulaTeal     = vec3(0.05, 0.17, 0.26);
        vec3 nebulaRose     = vec3(0.20, 0.11, 0.22);
        vec3 nebulaTint = mix(nebulaAmethyst, nebulaTeal, smoothstep(0.25, 0.75, neb2));
        nebulaTint = mix(nebulaTint, nebulaRose, uTwilightFactor * 0.45);

        sky += nebulaTint * nebulaCloud * (0.16 + 0.15 * galacticBand);
        sky += vec3(0.06, 0.08, 0.16) * galacticBand * neb1 * 0.32;

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
  skyMesh.name = 'spaceSkyDome';
  skyMesh.renderOrder = -10;
  group.add(skyMesh);

  // ---------------------------------------------------------------------------
  // 2. 3-LAYER 3D PARALLAX STARFIELD (Foreground Motes, Mid Stars, Deep Cosmos)
  // ---------------------------------------------------------------------------
  const dpr =
    typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;

  const starfieldGroup = new THREE.Group();
  starfieldGroup.name = 'parallaxStarfield';

  const shells = [
    // Foreground-mid cosmic dust & nearby starlets: strongest parallax response
    createStarShell(
      {
        name: 'starShellNear',
        count: 190,
        seedOffset: 101.0,
        minRadius: 3.4,
        maxRadius: 7.8,
        minSize: 0.7,
        maxSize: 1.9,
        minLuma: 0.48,
        maxLuma: 0.88,
        flareThreshold: 0.88,
        flareStrength: 0.5,
        parallaxFactor: 0.62,
      },
      dpr,
    ),
    // Mid-space star shell: balanced parallax and crisp medium-bright stars
    createStarShell(
      {
        name: 'starShellMid',
        count: 520,
        seedOffset: 503.0,
        minRadius: 8.5,
        maxRadius: 19.5,
        minSize: 1.2,
        maxSize: 3.4,
        minLuma: 0.58,
        maxLuma: 0.96,
        flareThreshold: 0.82,
        flareStrength: 0.85,
        parallaxFactor: 0.36,
      },
      dpr,
    ),
    // Deep-cosmos background shell: hundreds of fine pinpricks + rare bright beacons
    createStarShell(
      {
        name: 'starShellDeep',
        count: 840,
        seedOffset: 1207.0,
        minRadius: 21.0,
        maxRadius: 42.0,
        minSize: 1.3,
        maxSize: 5.2,
        minLuma: 0.42,
        maxLuma: 1.0,
        flareThreshold: 0.93,
        flareStrength: 1.0,
        parallaxFactor: 0.16,
      },
      dpr,
    ),
  ];

  for (const shell of shells) {
    starfieldGroup.add(shell.points);
  }
  group.add(starfieldGroup);

  // ---------------------------------------------------------------------------
  // 3. SOFT GLOWING PLANETARY ATMOSPHERE (Enclosing Weather & Sky)
  // ---------------------------------------------------------------------------
  // Uses NormalBlending at renderOrder = -5 (after stars at -8, before weather/sun at 0)
  // with a gentle translucent falloff so the atmosphere wraps the horizon in a soft,
  // airy haze without overpowering the terrain or cosmos.
  const rimGeo = new THREE.SphereGeometry(ATMOSPHERE_OUTER_RADIUS, 64, 64);
  const atmosphereRimMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uDayFactor: { value: 1.0 },
      uTwilightFactor: { value: 0.0 },
      uNightFactor: { value: 0.0 },
      uWeatherIntensity: { value: 0.35 },
      uTime: { value: 0.0 },
      uRimBaseOpacity: { value: ATMOSPHERE_GLOW_CONFIG.rimBaseOpacity },
      uRimHaloBoost: { value: ATMOSPHERE_GLOW_CONFIG.rimHaloBoost },
      uRimMaxOpacity: { value: ATMOSPHERE_GLOW_CONFIG.rimMaxOpacity },
      // World-type tint (white = untinted)
      uTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;

      uniform float uDayFactor;
      uniform float uTwilightFactor;
      uniform float uNightFactor;
      uniform float uWeatherIntensity;
      uniform float uRimBaseOpacity;
      uniform float uRimHaloBoost;
      uniform float uRimMaxOpacity;
      uniform vec3 uTint;
      uniform float uTime;

      void main() {
        vec3 N = normalize(vNormalWorld);
        vec3 V = normalize(vViewDir);
        float viewDot = abs(dot(N, V));

        // Radial fraction from planet center:
        // 0.0 at center -> ~0.64 at planet terrain limb -> 1.0 at outer atmosphere edge
        float radialFrac = sqrt(clamp(1.0 - viewDot * viewDot, 0.0, 1.0));

        // Soft, gradual atmospheric body from the planet surface through the cloud zone,
        // feathering smoothly into space with a gentle power curve
        float innerRise = smoothstep(0.50, 0.65, radialFrac);
        float outerFade = 1.0 - smoothstep(0.64, 0.99, radialFrac);
        float coreBody  = pow(outerFade, 1.35);
        float rimGlow   = smoothstep(0.60, 0.76, radialFrac) * (1.0 - smoothstep(0.76, 0.98, radialFrac));

        // Subtle animated upper-atmosphere shimmer
        vec3 dir = normalize(vWorldPos);
        float wave = sin(dir.x * 5.0 + uTime * 0.3) * cos(dir.y * 4.5 - uTime * 0.22) * 0.5 + 0.5;
        float weatherBoost = 1.0 + uWeatherIntensity * 0.06;

        // Calm cerulean-blue lower troposphere -> soft lavender/indigo upper atmosphere
        vec3 dayHorizon = vec3(0.42, 0.66, 0.94);
        vec3 dayMid     = vec3(0.36, 0.46, 0.88);
        vec3 dayOuter   = vec3(0.38, 0.30, 0.78);

        vec3 twiHorizon = vec3(0.48, 0.50, 0.90);
        vec3 twiMid     = vec3(0.42, 0.36, 0.84);
        vec3 twiOuter   = vec3(0.44, 0.28, 0.76);

        vec3 nightHorizon = vec3(0.24, 0.38, 0.74);
        vec3 nightMid     = vec3(0.22, 0.28, 0.68);
        vec3 nightOuter   = vec3(0.24, 0.18, 0.58);

        vec3 horizonCol = dayHorizon * uDayFactor + twiHorizon * uTwilightFactor + nightHorizon * uNightFactor;
        vec3 midCol     = dayMid     * uDayFactor + twiMid     * uTwilightFactor + nightMid     * uNightFactor;
        vec3 outerCol   = dayOuter   * uDayFactor + twiOuter   * uTwilightFactor + nightOuter   * uNightFactor;

        float tMid = smoothstep(0.58, 0.78, radialFrac);
        float tOut = smoothstep(0.74, 0.95, radialFrac) * (0.88 + 0.12 * wave);
        vec3 atmoColor = mix(horizonCol, midCol, tMid);
        atmoColor = mix(atmoColor, outerCol, tOut);

        // Gentle radiance in the heart of the sky band without harsh over-bloom
        atmoColor *= (0.88 + rimGlow * 0.10) * weatherBoost;

        // Translucent opacity so the atmosphere reads as a delicate veil
        float opacity = clamp(
          (innerRise * coreBody * uRimBaseOpacity + rimGlow * uRimHaloBoost) * weatherBoost,
          0.0,
          uRimMaxOpacity
        );

        gl_FragColor = vec4(atmoColor * uTint, opacity);
      }
    `,
  });

  const atmosphereRimMesh = new THREE.Mesh(rimGeo, atmosphereRimMaterial);
  atmosphereRimMesh.name = 'atmosphereRimHalo';
  atmosphereRimMesh.renderOrder = -5;
  group.add(atmosphereRimMesh);

  // Secondary subtle additive bloom shell right around the troposphere cloud-layer
  // to give the horizon a delicate, velvety inner cushion
  const innerTroposphereGeo = new THREE.SphereGeometry(
    0.75 * PLANET_SCALE * 1.38,
    48,
    48,
  );
  const innerTroposphereMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uDayFactor: { value: 1.0 },
      uTwilightFactor: { value: 0.0 },
      uNightFactor: { value: 0.0 },
      uInnerBloomStrength: { value: ATMOSPHERE_GLOW_CONFIG.innerBloomStrength },
      uInnerBloomMaxOpacity: { value: ATMOSPHERE_GLOW_CONFIG.innerBloomMaxOpacity },
      uTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;

      uniform float uDayFactor;
      uniform float uTwilightFactor;
      uniform float uNightFactor;
      uniform float uInnerBloomStrength;
      uniform float uInnerBloomMaxOpacity;
      uniform vec3 uTint;

      void main() {
        vec3 N = normalize(vNormalWorld);
        vec3 V = normalize(vViewDir);
        float viewDot = abs(dot(N, V));
        float radialFrac = sqrt(clamp(1.0 - viewDot * viewDot, 0.0, 1.0));

        // Subtle inner glow peaking gently between the horizon and cloud tops
        float band = smoothstep(0.58, 0.78, radialFrac) * smoothstep(0.98, 0.74, radialFrac);
        vec3 col = vec3(0.40, 0.60, 0.92) * uDayFactor
                 + vec3(0.50, 0.40, 0.88) * uTwilightFactor
                 + vec3(0.28, 0.38, 0.78) * uNightFactor;

        gl_FragColor = vec4(col * uTint, clamp(band * uInnerBloomStrength, 0.0, uInnerBloomMaxOpacity));
      }
    `,
  });
  const innerTroposphereMesh = new THREE.Mesh(
    innerTroposphereGeo,
    innerTroposphereMaterial,
  );
  innerTroposphereMesh.name = 'innerTroposphereHalo';
  innerTroposphereMesh.renderOrder = -4;
  group.add(innerTroposphereMesh);

  const identityQuat = new THREE.Quaternion();
  const ambientDriftQuat = new THREE.Quaternion();
  const ambientEuler = new THREE.Euler();
  const targetShellQuat = new THREE.Quaternion();

  const updateTimeOfDay = (
    dayFactor: number,
    twilightFactor: number,
    nightFactor: number,
    elapsedTime: number,
    planetQuaternion?: THREE.Quaternion,
    weatherIntensity = 0.35,
  ) => {
    skyMaterial.uniforms.uDayFactor.value = dayFactor;
    skyMaterial.uniforms.uTwilightFactor.value = twilightFactor;
    skyMaterial.uniforms.uNightFactor.value = nightFactor;
    skyMaterial.uniforms.uTime.value = elapsedTime;

    const nightBoost = nightFactor + twilightFactor * 0.5;

    // Gentle celestial drift combined with multi-plane rotational parallax when the globe spins
    for (let i = 0; i < shells.length; i++) {
      const shell = shells[i];
      shell.material.uniforms.uTime.value = elapsedTime;
      shell.material.uniforms.uNightBoost.value = nightBoost;

      const driftSpeed = (0.004 + i * 0.0025) * elapsedTime;
      ambientEuler.set(
        Math.sin(elapsedTime * 0.003 + i) * 0.025,
        driftSpeed,
        0,
      );
      ambientDriftQuat.setFromEuler(ambientEuler);

      if (planetQuaternion) {
        targetShellQuat
          .copy(identityQuat)
          .slerp(planetQuaternion, shell.parallaxFactor)
          .multiply(ambientDriftQuat);
        shell.points.quaternion.slerp(targetShellQuat, 0.18);
      } else {
        shell.points.quaternion.copy(ambientDriftQuat);
      }
    }

    // Subtle deep-cosmos parallax on the nebula sky dome itself
    if (planetQuaternion) {
      targetShellQuat
        .copy(identityQuat)
        .slerp(planetQuaternion, 0.1)
        .multiply(ambientDriftQuat);
      skyMesh.quaternion.slerp(targetShellQuat, 0.12);
    }

    atmosphereRimMaterial.uniforms.uDayFactor.value = dayFactor;
    atmosphereRimMaterial.uniforms.uTwilightFactor.value = twilightFactor;
    atmosphereRimMaterial.uniforms.uNightFactor.value = nightFactor;
    atmosphereRimMaterial.uniforms.uWeatherIntensity.value = weatherIntensity;
    atmosphereRimMaterial.uniforms.uTime.value = elapsedTime;

    innerTroposphereMaterial.uniforms.uDayFactor.value = dayFactor;
    innerTroposphereMaterial.uniforms.uTwilightFactor.value = twilightFactor;
    innerTroposphereMaterial.uniforms.uNightFactor.value = nightFactor;
  };

  /** Tint the glowing atmosphere for the active world type (white = untinted) */
  const setAtmosphereTint = (tint: THREE.Color) => {
    atmosphereRimMaterial.uniforms.uTint.value.copy(tint);
    innerTroposphereMaterial.uniforms.uTint.value.copy(tint);
  };

  return {
    group,
    setAtmosphereTint,
    atmosphereRimMaterial,
    innerTroposphereMaterial,
    skyMaterial,
    starfieldPoints: starfieldGroup,
    updateTimeOfDay,
  };
}
