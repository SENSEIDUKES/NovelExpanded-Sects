import * as THREE from 'three';

export function createHotAirBalloonMesh(variantIdx: number): {
  group: THREE.Group;
  burnerMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  const basketMat = new THREE.MeshStandardMaterial({
    color: '#9c6f44',
    roughness: 0.86,
    flatShading: true,
  });
  const leatherRimMat = new THREE.MeshStandardMaterial({
    color: '#634126',
    roughness: 0.78,
  });
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: '#d9c49a',
    roughness: 0.88,
  });

  // Woven wicker gondola basket + padded leather rim + 4 corner sandbags
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.013, 0.016),
    basketMat,
  );
  basket.position.y = -0.042;
  basket.castShadow = true;
  group.add(basket);

  const basketRim = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.0025, 0.018),
    leatherRimMat,
  );
  basketRim.position.y = -0.035;
  group.add(basketRim);

  // 4 rigging lines + corner ballast sandbags
  const ropeMat = new THREE.MeshStandardMaterial({
    color: '#5c432c',
    roughness: 0.8,
  });
  for (const sx of [-0.0065, 0.0065]) {
    for (const sz of [-0.0065, 0.0065]) {
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0006, 0.0006, 0.022, 4),
        ropeMat,
      );
      rope.position.set(sx, -0.025, sz);
      group.add(rope);

      const bag = new THREE.Mesh(
        new THREE.SphereGeometry(0.0022, 6, 6),
        sandbagMat,
      );
      bag.scale.set(0.85, 1.3, 0.85);
      bag.position.set(sx * 1.35, -0.039, sz * 1.35);
      group.add(bag);
    }
  }

  // Throat collar ring + burner flame inside throat
  const throatRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.012, 0.0014, 6, 14),
    leatherRimMat,
  );
  throatRing.rotation.x = Math.PI / 2;
  throatRing.position.y = -0.017;
  group.add(throatRing);

  const burnerMat = new THREE.MeshStandardMaterial({
    color: '#fff3b8',
    emissive: new THREE.Color('#ff9d2e'),
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const burner = new THREE.Mesh(
    new THREE.SphereGeometry(0.0046, 8, 8),
    burnerMat,
  );
  burner.scale.set(0.9, 1.3, 0.9);
  burner.position.y = -0.022;
  group.add(burner);

  // Striped pastel balloon envelope with equator bunting band & crown medallion
  const envGeo = new THREE.IcosahedronGeometry(0.036, 2);
  const pos = envGeo.attributes.position;
  const colors: number[] = [];
  const stripePalettes = [
    [new THREE.Color('#f7a899'), new THREE.Color('#fff5d6')],
    [new THREE.Color('#a6dec4'), new THREE.Color('#fef6e4')],
    [new THREE.Color('#b8caf7'), new THREE.Color('#fde2e8')],
  ];
  const pair = stripePalettes[variantIdx % stripePalettes.length];
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Taper bottom of balloon envelope into a teardrop shape
    if (v.y < 0) {
      const t = Math.abs(v.y) / 0.036;
      v.x *= 1.0 - t * 0.48;
      v.z *= 1.0 - t * 0.48;
      v.y *= 1.15;
    }
    pos.setXYZ(i, v.x, v.y, v.z);

    const angle = Math.atan2(v.z, v.x);
    const stripeIdx = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8);
    const c = stripeIdx % 2 === 0 ? pair[0] : pair[1];
    colors.push(c.r, c.g, c.b);
  }
  envGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  envGeo.computeVertexNormals();

  const envelope = new THREE.Mesh(
    envGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.68,
      flatShading: true,
    }),
  );
  envelope.position.y = 0.012;
  envelope.castShadow = true;
  group.add(envelope);

  // Decorative gold equator band & top crown cap on the envelope
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: '#f2c968',
    roughness: 0.45,
    metalness: 0.35,
  });
  const equatorBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.0358, 0.0014, 6, 18),
    goldTrimMat,
  );
  equatorBand.rotation.x = Math.PI / 2;
  equatorBand.position.y = 0.014;
  group.add(equatorBand);

  const crownCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.012, 0.003, 12),
    goldTrimMat,
  );
  crownCap.position.y = 0.0475;
  group.add(crownCap);

  return { group, burnerMat };
}

// ---------------------------------------------------------------------------
// NEW TOOL MESHES: C. WEATHER & ELEMENTAL POWERS
// ---------------------------------------------------------------------------

export function createRainbowArchMesh(): THREE.Group {
  const group = new THREE.Group();
  const bandColors = [
    '#ff7575',
    '#ffb866',
    '#fff275',
    '#75e096',
    '#75c4ff',
    '#b88aff',
  ];

  const baseY = 0.016;
  bandColors.forEach((hex, idx) => {
    const radius = 0.068 - idx * 0.0042;
    const arcGeo = new THREE.TorusGeometry(radius, 0.0028, 8, 40, Math.PI);
    const arcMat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.y = baseY;
    group.add(arc);
  });

  // Soft white cloud anchor puffs at both feet of the rainbow arch
  const cloudFootMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.85,
    flatShading: true,
  });
  for (const side of [-1, 1]) {
    const footX = side * 0.058;
    for (const [ox, oy, oz, r] of [
      [0, baseY + 0.001, 0, 0.012],
      [-0.007, baseY - 0.002, 0.004, 0.009],
      [0.007, baseY - 0.002, -0.003, 0.009],
    ]) {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 1),
        cloudFootMat,
      );
      puff.position.set(footX + ox, oy, oz);
      group.add(puff);
    }
  }

  return group;
}

export function createShootingStarMesh(): THREE.Group {
  const group = new THREE.Group();

  // Multi-point faceted star head + golden aura ring
  const starMat = new THREE.MeshBasicMaterial({ color: '#fffbe0' });
  const headA = new THREE.Mesh(new THREE.OctahedronGeometry(0.019, 0), starMat);
  const headB = new THREE.Mesh(new THREE.OctahedronGeometry(0.019, 0), starMat);
  headB.rotation.set(Math.PI / 4, Math.PI / 4, 0);
  group.add(headA, headB);

  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.028, 1),
    new THREE.MeshBasicMaterial({
      color: '#ffd966',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  group.add(halo);

  // Tapered glowing comet tail along -Z
  const tailGeo = new THREE.ConeGeometry(0.015, 0.26, 12, 1, true);
  tailGeo.translate(0, -0.13, 0);
  tailGeo.rotateX(Math.PI / 2);

  const pos = tailGeo.attributes.position;
  const colors: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dist = Math.abs(v.z) / 0.26;
    const fade = Math.pow(1.0 - THREE.MathUtils.clamp(dist, 0, 1), 1.6);
    colors.push(1.0 * fade, 0.94 * fade, 0.68 * fade);
  }
  tailGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const tail = new THREE.Mesh(
    tailGeo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  group.add(tail);

  return group;
}

export function createPuffyCloudMesh(isSnow = false): {
  group: THREE.Group;
  rainLines: THREE.LineSegments;
  rainMat: THREE.LineBasicMaterial;
  snowPoints?: THREE.Points;
  snowMat?: THREE.PointsMaterial;
} {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: isSnow ? '#e8f4ff' : '#ffffff',
    roughness: 0.88,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.96,
  });
  const underCloudMat = new THREE.MeshStandardMaterial({
    color: isSnow ? '#cce4fc' : '#e6eef7',
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.94,
  });

  // Upper billowy cumulus crowns + lower flat-bottomed shadowed puffs
  const puffs = [
    { x: 0, y: 0.008, z: 0, r: 0.044, sx: 1.08, sy: 0.96, sz: 1.04, under: false },
    { x: 0.034, y: -0.004, z: 0.008, r: 0.033, sx: 1.05, sy: 0.88, sz: 1.0, under: false },
    { x: -0.035, y: -0.003, z: -0.006, r: 0.035, sx: 1.06, sy: 0.9, sz: 1.0, under: false },
    { x: 0.016, y: 0.016, z: -0.018, r: 0.029, sx: 1.0, sy: 0.95, sz: 1.0, under: false },
    { x: -0.016, y: 0.014, z: 0.021, r: 0.028, sx: 1.0, sy: 0.95, sz: 1.0, under: false },
    { x: 0.024, y: -0.011, z: -0.015, r: 0.024, sx: 1.15, sy: 0.72, sz: 1.1, under: true },
    { x: -0.024, y: -0.011, z: 0.015, r: 0.025, sx: 1.15, sy: 0.72, sz: 1.1, under: true },
    { x: 0, y: -0.013, z: 0, r: 0.036, sx: 1.35, sy: 0.62, sz: 1.2, under: true },
  ];

  puffs.forEach((p) => {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.r, 1),
      p.under ? underCloudMat : cloudMat,
    );
    mesh.position.set(p.x, p.y, p.z);
    mesh.scale.set(p.sx, p.sy, p.sz);
    mesh.castShadow = true;
    group.add(mesh);
  });

  // Subtle icy crystal crown on Snow Clouds
  if (isSnow) {
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: new THREE.Color('#bfe3ff'),
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    for (let i = 0; i < 3; i++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.0065, 0),
        crystalMat,
      );
      crystal.position.set((i - 1) * 0.022, 0.042 - Math.abs(i - 1) * 0.006, 0);
      group.add(crystal);
    }
  }

  const dropCount = 26;
  const positions = new Float32Array(dropCount * 6);
  for (let i = 0; i < dropCount; i++) {
    const angle = (i / dropCount) * Math.PI * 2;
    const rad = 0.01 + (i % 4) * 0.012;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const yTop = -0.02 - (i % 5) * 0.045;
    const yBot = yTop - 0.042;

    positions[i * 6] = x;
    positions[i * 6 + 1] = yTop;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = yBot;
    positions[i * 6 + 5] = z;
  }

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: '#b8e3ff',
    transparent: true,
    opacity: 0.0,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  group.add(rainLines);

  let snowPoints: THREE.Points | undefined;
  let snowMat: THREE.PointsMaterial | undefined;

  if (isSnow) {
    const flakeCount = 32;
    const flakePos = new Float32Array(flakeCount * 3);
    for (let i = 0; i < flakeCount; i++) {
      const a = (i / flakeCount) * Math.PI * 2;
      const r = 0.008 + (i % 5) * 0.011;
      flakePos[i * 3] = Math.cos(a) * r;
      flakePos[i * 3 + 1] = -0.025 - (i / flakeCount) * 0.24;
      flakePos[i * 3 + 2] = Math.sin(a) * r;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
    snowMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.016,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    snowPoints = new THREE.Points(snowGeo, snowMat);
    group.add(snowPoints);
  }

  return { group, rainLines, rainMat, snowPoints, snowMat };
}

