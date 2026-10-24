import * as THREE from 'three';
import { createRoomEnvTexture } from '../../utils/textures';
import { createRoomEnvironment, RoomEnvironmentHandles } from '../RoomEnvironment';
import type { DaylightFactors } from './DayNightSystem';

/**
 * Lighting, sky and atmosphere: the starfield and glowing atmosphere, the space fill and
 * key lights and the little sun and moon circling the planet.
 */
export class SkySystem {
  readonly roomEnv: RoomEnvironmentHandles;

  private roomWindowLight: THREE.DirectionalLight;
  private roomAmbientLight: THREE.AmbientLight;
  private roomHemiLight: THREE.HemisphereLight;
  private sunGroup!: THREE.Group;
  private sunLight!: THREE.DirectionalLight;
  private moonGroup!: THREE.Group;
  private moonLight!: THREE.DirectionalLight;
  /** World-owned texture used only by temporary placement effects. */
  readonly glowSprite: THREE.Texture;

  /** Builds the starry cosmos, atmosphere rim and scene-level lights */
  constructor(scene: THREE.Scene) {
    this.glowSprite = this.createGlowSprite();
    const envMap = createRoomEnvTexture();
    scene.environment = envMap;

    // 1. Starry Cosmos & Atmospheric Rim Environment (replaces domestic room & glass orb)
    this.roomEnv = createRoomEnvironment(envMap);
    scene.add(this.roomEnv.group);

    // 2. Celestial Space Fill & Key Lighting
    this.roomAmbientLight = new THREE.AmbientLight('#eae4f7', 0.56);
    scene.add(this.roomAmbientLight);

    this.roomHemiLight = new THREE.HemisphereLight('#d6dcff', '#3d3552', 0.54);
    scene.add(this.roomHemiLight);

    this.roomWindowLight = new THREE.DirectionalLight('#ffe4c4', 1.32);
    this.roomWindowLight.position.set(-4.8, 4.6, 3.8);
    this.roomWindowLight.castShadow = true;
    this.roomWindowLight.shadow.mapSize.set(2048, 2048);
    this.roomWindowLight.shadow.camera.near = 1.0;
    this.roomWindowLight.shadow.camera.far = 16.0;
    const d = 3.6;
    this.roomWindowLight.shadow.camera.left = -d;
    this.roomWindowLight.shadow.camera.right = d;
    this.roomWindowLight.shadow.camera.top = d;
    this.roomWindowLight.shadow.camera.bottom = -d;
    this.roomWindowLight.shadow.bias = -0.0005;
    scene.add(this.roomWindowLight);
  }

  addCelestialBodies(planetRoot: THREE.Group) {
    // 1. Radiant Storybook Sun with Sculpted Sunbeam Crown & Astrolabe Ring
    this.sunGroup = new THREE.Group();

    const sunCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.055, 2),
      new THREE.MeshBasicMaterial({ color: '#fff5b8' }),
    );
    this.sunGroup.add(sunCore);

    // Inner & outer rotating sunbeam crowns (12 alternating long/short sculpted rays)
    const rayCrown = new THREE.Group();
    rayCrown.name = 'sunRayCrown';
    const rayPrimaryMat = new THREE.MeshBasicMaterial({ color: '#ffd45c' });
    const raySecondaryMat = new THREE.MeshBasicMaterial({ color: '#ffae36' });

    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const isLong = i % 2 === 0;
      const rayLen = isLong ? 0.036 : 0.024;
      const rayRad = isLong ? 0.011 : 0.0085;
      const rayGeo = new THREE.ConeGeometry(rayRad, rayLen, 4);
      const ray = new THREE.Mesh(
        rayGeo,
        isLong ? rayPrimaryMat : raySecondaryMat,
      );
      const dist = 0.052 + rayLen * 0.45;
      ray.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
      ray.rotation.z = angle - Math.PI / 2;
      rayCrown.add(ray);
    }
    this.sunGroup.add(rayCrown);

    // Delicate tilted golden astrolabe ring around the Sun
    const sunRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.086, 0.0016, 8, 36),
      new THREE.MeshBasicMaterial({
        color: '#ffe28a',
        transparent: true,
        opacity: 0.65,
      }),
    );
    sunRing.name = 'sunAstrolabeRing';
    sunRing.rotation.set(0.65, 0.35, 0);
    this.sunGroup.add(sunRing);

    const sunHalo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.098, 2),
      new THREE.MeshBasicMaterial({
        color: '#ffbe4f',
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.sunGroup.add(sunHalo);
    planetRoot.add(this.sunGroup);

    // Little sun directional light casting moving shadows across the 1.2x planet
    this.sunLight = new THREE.DirectionalLight('#fff0c2', 1.9);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 0.2;
    this.sunLight.shadow.camera.far = 4.2;
    const sd = 1.32;
    this.sunLight.shadow.camera.left = -sd;
    this.sunLight.shadow.camera.right = sd;
    this.sunLight.shadow.camera.top = sd;
    this.sunLight.shadow.camera.bottom = -sd;
    this.sunLight.shadow.bias = -0.0008;
    planetRoot.add(this.sunLight);
    planetRoot.add(this.sunLight.target);

    // 2. Detailed Cratered Moon with Lunar Mare Basins & Companion Starlets
    this.moonGroup = new THREE.Group();
    const moonMat = new THREE.MeshStandardMaterial({
      color: '#e8effc',
      emissive: new THREE.Color('#8eabdc'),
      emissiveIntensity: 0.55,
      roughness: 0.72,
      flatShading: true,
    });
    const craterMat = new THREE.MeshStandardMaterial({
      color: '#bccbe6',
      emissive: new THREE.Color('#6b88b8'),
      emissiveIntensity: 0.45,
      roughness: 0.82,
      flatShading: true,
    });

    const moonBody = new THREE.Group();
    moonBody.name = 'moonBody';

    const moonMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.052, 2),
      moonMat,
    );
    moonBody.add(moonMesh);

    // Sculpted rimmed craters & lunar basins on the Moon surface
    const craterSpecs: [number, number, number, number][] = [
      [0.35, 0.25, 0.9, 0.013],
      [-0.48, 0.38, 0.79, 0.0105],
      [0.18, -0.52, 0.83, 0.0115],
      [-0.65, -0.25, 0.71, 0.009],
      [0.58, 0.42, -0.69, 0.012],
      [-0.25, 0.68, -0.69, 0.01],
      [0.12, -0.74, -0.66, 0.011],
    ];
    for (const [cx, cy, cz, cr] of craterSpecs) {
      const dir = new THREE.Vector3(cx, cy, cz).normalize();
      const craterGroup = new THREE.Group();
      craterGroup.position.copy(dir.clone().multiplyScalar(0.0505));
      craterGroup.lookAt(dir.clone().multiplyScalar(0.15));

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(cr, cr * 0.26, 6, 12),
        craterMat,
      );
      const basin = new THREE.Mesh(
        new THREE.CircleGeometry(cr * 0.85, 10),
        craterMat,
      );
      basin.position.z = -0.0008;
      craterGroup.add(rim, basin);
      moonBody.add(craterGroup);
    }
    this.moonGroup.add(moonBody);

    // Orbiting silver companion starlets around the Moon
    const starletGroup = new THREE.Group();
    starletGroup.name = 'moonStarlets';
    const starletMat = new THREE.MeshBasicMaterial({ color: '#eef5ff' });
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const starlet = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.0055 - i * 0.001, 0),
        starletMat,
      );
      starlet.position.set(
        Math.cos(angle) * 0.078,
        Math.sin(angle * 1.5) * 0.018,
        Math.sin(angle) * 0.078,
      );
      starletGroup.add(starlet);
    }
    this.moonGroup.add(starletGroup);

    const moonHalo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.076, 2),
      new THREE.MeshBasicMaterial({
        color: '#b5d0ff',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    );
    this.moonGroup.add(moonHalo);
    planetRoot.add(this.moonGroup);

    // Moon directional light to illuminate silver edges on terrain at night
    this.moonLight = new THREE.DirectionalLight('#b8d4ff', 0.0);
    planetRoot.add(this.moonLight);
    planetRoot.add(this.moonLight.target);
  }

  /** Build the glow sprite without creating an ambient particle layer. */
  private createGlowSprite(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 248, 150, 1)');
    grad.addColorStop(0.4, 'rgba(215, 245, 110, 0.65)');
    grad.addColorStop(1, 'rgba(180, 230, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  /** Release the glow texture after the world's temporary effects have been removed. */
  dispose() {
    this.glowSprite.dispose();
  }

  /** Circle the sun and moon for the time of day and set every light's strength and color */
  update(
    timeOfDay: number,
    light: DaylightFactors,
    elapsed: number,
    planetQuaternion: THREE.Quaternion,
    weatherIntensity: number,
  ) {
    const { day: dayFactor, twilight: twilightFactor, night: nightFactor } = light;

    // Orbit the Little Sun & Pale Moon on opposing sides of a tilted curved path
    const orbitAngle = (timeOfDay - 0.22) * Math.PI * 2;
    const orbitRadius = 1.24; // Inside the 1.50 glass orb
    const sunPos = new THREE.Vector3(
      Math.sin(orbitAngle) * orbitRadius,
      Math.cos(orbitAngle) * orbitRadius * 0.72 + 0.12,
      Math.cos(orbitAngle) * orbitRadius * 0.68,
    );
    const moonPos = sunPos.clone().negate();

    this.sunGroup.position.copy(sunPos);
    this.sunGroup.lookAt(0, 0, 0);
    const sunRayCrown = this.sunGroup.getObjectByName('sunRayCrown');
    if (sunRayCrown) {
      sunRayCrown.rotation.z = elapsed * 0.45;
    }
    const sunAstrolabeRing = this.sunGroup.getObjectByName('sunAstrolabeRing');
    if (sunAstrolabeRing) {
      sunAstrolabeRing.rotation.x = 0.65 + Math.sin(elapsed * 0.8) * 0.25;
      sunAstrolabeRing.rotation.y = elapsed * 0.6;
    }

    this.sunLight.position.copy(sunPos);
    this.moonGroup.position.copy(moonPos);
    const moonBody = this.moonGroup.getObjectByName('moonBody');
    if (moonBody) {
      moonBody.rotation.y = elapsed * 0.22;
    }
    const moonStarlets = this.moonGroup.getObjectByName('moonStarlets');
    if (moonStarlets) {
      moonStarlets.rotation.y = -elapsed * 0.65;
      moonStarlets.rotation.z = Math.sin(elapsed * 0.9) * 0.18;
    }
    this.moonLight.position.copy(moonPos);

    // Update lighting intensities for Day, Blue Twilight, and Night
    this.sunLight.intensity = 1.95 * dayFactor + 0.75 * twilightFactor;
    this.sunLight.color.setRGB(
      1.0,
      THREE.MathUtils.lerp(0.95, 0.68, twilightFactor),
      THREE.MathUtils.lerp(0.78, 0.45, twilightFactor),
    );

    // Moon illuminates silver edges on terrain at night
    this.moonLight.intensity = 1.35 * nightFactor + 0.45 * twilightFactor;

    // Room evening window light & interior fill darken in Night mode
    this.roomWindowLight.intensity =
      1.35 * dayFactor + 0.65 * twilightFactor + 0.18 * nightFactor;
    this.roomAmbientLight.intensity =
      0.55 * dayFactor + 0.38 * twilightFactor + 0.22 * nightFactor;
    this.roomHemiLight.intensity =
      0.52 * dayFactor + 0.44 * twilightFactor + 0.28 * nightFactor;

    this.roomEnv.updateTimeOfDay(
      dayFactor,
      twilightFactor,
      nightFactor,
      elapsed,
      planetQuaternion,
      weatherIntensity,
    );
  }
}
