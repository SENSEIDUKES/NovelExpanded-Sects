import * as THREE from 'three';

export function createOakTreeMesh(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: '#734e34',
    roughness: 0.86,
    flatShading: true,
  });
  const darkBarkMat = new THREE.MeshStandardMaterial({
    color: '#5c3d27',
    roughness: 0.9,
    flatShading: true,
  });

  // Flared buttress roots gripping the ground
  for (let r = 0; r < 4; r++) {
    const a = (r / 4) * Math.PI * 2 + 0.3;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0048, 0.014, 5),
      darkBarkMat,
    );
    root.position.set(Math.cos(a) * 0.0065, 0.0045, Math.sin(a) * 0.0065);
    root.rotation.z = -Math.cos(a) * 0.55;
    root.rotation.x = Math.sin(a) * 0.55;
    group.add(root);
  }

  // Gnarled lower & upper trunk
  const lowerTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.0098, 0.022, 7),
    trunkMat,
  );
  lowerTrunk.position.y = 0.01;
  lowerTrunk.castShadow = true;
  group.add(lowerTrunk);

  const upperTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.0068, 0.02, 7),
    trunkMat,
  );
  upperTrunk.position.set(0.001, 0.027, 0);
  upperTrunk.rotation.z = -0.08;
  upperTrunk.castShadow = true;
  group.add(upperTrunk);

  // 3 visible diverging primary boughs reaching into the canopy
  const branches = [
    { x: 0.006, y: 0.036, z: 0.004, rz: -0.58, rx: 0.28 },
    { x: -0.006, y: 0.035, z: -0.004, rz: 0.52, rx: -0.25 },
    { x: -0.002, y: 0.038, z: 0.006, rz: 0.18, rx: 0.55 },
  ];
  branches.forEach((b) => {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.004, 0.018, 5),
      trunkMat,
    );
    branch.position.set(b.x, b.y, b.z);
    branch.rotation.z = b.rz;
    branch.rotation.x = b.rx;
    branch.castShadow = true;
    group.add(branch);
  });

  // Tiny cozy wooden birdhouse on the side of the trunk
  const birdhouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.0055, 0.0065, 0.0055),
    new THREE.MeshStandardMaterial({ color: '#e8c882', roughness: 0.75 }),
  );
  birdhouse.position.set(0.0085, 0.024, 0.002);
  group.add(birdhouse);

  const birdhouseRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.0048, 0.004, 4),
    new THREE.MeshStandardMaterial({ color: '#c95b49', roughness: 0.7 }),
  );
  birdhouseRoof.rotation.y = Math.PI / 4;
  birdhouseRoof.position.set(0.0085, 0.029, 0.002);
  group.add(birdhouseRoof);

  // Multi-tone sculpted canopy puffs
  const greens = ['#72c257', '#58ad49', '#87d466', '#4c9c42', '#9be074'];
  const puffs = [
    { x: 0, y: 0.05, z: 0, r: 0.022, c: 0 },
    { x: 0.014, y: 0.042, z: 0.008, r: 0.016, c: 1 },
    { x: -0.014, y: 0.044, z: -0.007, r: 0.017, c: 2 },
    { x: -0.005, y: 0.058, z: 0.008, r: 0.015, c: 4 },
    { x: 0.008, y: 0.054, z: -0.01, r: 0.015, c: 2 },
    { x: -0.009, y: 0.041, z: 0.012, r: 0.014, c: 3 },
    { x: 0.011, y: 0.041, z: -0.011, r: 0.013, c: 3 },
  ];
  puffs.forEach((p) => {
    const mat = new THREE.MeshStandardMaterial({
      color: greens[p.c],
      roughness: 0.78,
      flatShading: true,
    });
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r, 1), mat);
    puff.position.set(p.x, p.y, p.z);
    puff.scale.set(1.08, 0.88, 1.05);
    puff.castShadow = true;
    puff.receiveShadow = true;
    group.add(puff);
  });

  return group;
}

export function createPineTreeMesh(snowCapped = false): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: '#63422b',
    roughness: 0.88,
    flatShading: true,
  });
  const coneNutMat = new THREE.MeshStandardMaterial({
    color: '#4a2f1d',
    roughness: 0.85,
  });
  const snowMat = new THREE.MeshStandardMaterial({
    color: '#f2f8fc',
    roughness: 0.65,
    flatShading: true,
  });

  // Flared root collar + tapered trunk
  const rootBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.0095, 0.009, 7),
    trunkMat,
  );
  rootBase.position.y = 0.003;
  group.add(rootBase);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0038, 0.0068, 0.032, 7),
    trunkMat,
  );
  trunk.position.y = 0.015;
  trunk.castShadow = true;
  group.add(trunk);

  // 5 overlapping feathered conifer tiers with rotated facets
  const tiers = [
    { y: 0.028, r: 0.024, h: 0.026, col: '#2d663c', rot: 0.0 },
    { y: 0.041, r: 0.021, h: 0.025, col: '#347546', rot: 0.45 },
    { y: 0.054, r: 0.017, h: 0.024, col: '#3f8752', rot: 0.9 },
    { y: 0.066, r: 0.013, h: 0.022, col: '#48965c', rot: 1.35 },
    {
      y: 0.077,
      r: 0.009,
      h: 0.019,
      col: snowCapped ? '#eff7fc' : '#54a668',
      rot: 1.8,
    },
  ];
  tiers.forEach((t, idx) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(t.r, t.h, 8),
      new THREE.MeshStandardMaterial({
        color: t.col,
        roughness: 0.8,
        flatShading: true,
      }),
    );
    cone.position.y = t.y;
    cone.rotation.y = t.rot;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);

    if (snowCapped && idx >= 2) {
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(t.r * 0.72, t.h * 0.55, 8),
        snowMat,
      );
      snowCap.position.y = t.y + t.h * 0.24;
      snowCap.rotation.y = t.rot + 0.2;
      group.add(snowCap);
    }
  });

  // Tiny hanging pinecones under the lower boughs
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2 + 0.4;
    const pinecone = new THREE.Mesh(
      new THREE.SphereGeometry(0.0022, 6, 6),
      coneNutMat,
    );
    pinecone.scale.set(0.8, 1.35, 0.8);
    pinecone.position.set(Math.cos(a) * 0.014, 0.02, Math.sin(a) * 0.014);
    group.add(pinecone);
  }

  return group;
}

export function createPalmTreeMesh(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: '#9c734e',
    roughness: 0.85,
    flatShading: true,
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#7d5938',
    roughness: 0.88,
    flatShading: true,
  });

  // Curved 7-segment coconut palm trunk with raised bark rings
  let curX = 0;
  let curY = 0;
  for (let i = 0; i < 7; i++) {
    const rTop = 0.0056 - i * 0.00042;
    const rBot = 0.0064 - i * 0.00042;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, 0.0105, 7),
      trunkMat,
    );
    const tilt = (i + 0.4) * 0.068;
    curX += Math.sin(tilt) * 0.009;
    curY += Math.cos(tilt) * 0.009;
    seg.position.set(curX, curY - 0.003, 0);
    seg.rotation.z = -tilt;
    seg.castShadow = true;
    group.add(seg);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(rTop * 1.03, 0.0007, 5, 8),
      ringMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.rotation.y = -tilt;
    collar.position.set(curX, curY + 0.0015, 0);
    group.add(collar);
  }

  const crown = new THREE.Group();
  crown.position.set(curX + 0.002, curY + 0.003, 0);

  const frondMat = new THREE.MeshStandardMaterial({
    color: '#6ec454',
    roughness: 0.72,
    flatShading: true,
  });
  const frondAltMat = new THREE.MeshStandardMaterial({
    color: '#56ab40',
    roughness: 0.75,
    flatShading: true,
  });

  // 8 multi-segment gracefully arching feather palm fronds
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = angle;
    frondPivot.rotation.z = (i % 2 === 0 ? 0.12 : -0.06);

    const mat = i % 2 === 0 ? frondMat : frondAltMat;

    const seg1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.0024, 0.0075),
      mat,
    );
    seg1.position.set(0.0065, 0.0015, 0);
    seg1.rotation.z = 0.18;
    seg1.castShadow = true;
    frondPivot.add(seg1);

    const seg2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.0022, 0.0095),
      mat,
    );
    seg2.position.set(0.018, 0.0002, 0);
    seg2.rotation.z = -0.26;
    seg2.castShadow = true;
    frondPivot.add(seg2);

    const seg3 = new THREE.Mesh(
      new THREE.ConeGeometry(0.0048, 0.012, 5),
      mat,
    );
    seg3.rotation.z = -Math.PI / 2 - 0.62;
    seg3.scale.set(0.5, 1.0, 1.2);
    seg3.position.set(0.028, -0.0055, 0);
    seg3.castShadow = true;
    frondPivot.add(seg3);

    crown.add(frondPivot);
  }

  // Cluster of 4 coconuts nestled under the fronds
  const cocoMat = new THREE.MeshStandardMaterial({
    color: '#573a22',
    roughness: 0.8,
  });
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2;
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 7, 7), cocoMat);
    coco.scale.set(0.9, 1.15, 0.9);
    coco.position.set(Math.cos(a) * 0.0048, -0.0032, Math.sin(a) * 0.0048);
    crown.add(coco);
  }

  group.add(crown);
  return group;
}

export function createFlowerClusterMesh(): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({
    color: '#4f9c49',
    roughness: 0.8,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#5eb352',
    roughness: 0.78,
    flatShading: true,
  });
  const pollenMat = new THREE.MeshStandardMaterial({
    color: '#ffcf33',
    roughness: 0.5,
  });
  const petalColors = ['#ff7898', '#ffde59', '#b994ff', '#ffffff', '#ff9b63'];

  // Basal green foliage leaves radiating on the ground
  for (let l = 0; l < 6; l++) {
    const la = (l / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.0038, 0.011, 5),
      leafMat,
    );
    leaf.rotation.z = -Math.PI / 2 + 0.35;
    leaf.rotation.y = la;
    leaf.scale.set(0.45, 1.0, 1.1);
    leaf.position.set(Math.cos(la) * 0.009, 0.0025, Math.sin(la) * 0.009);
    group.add(leaf);
  }

  // 5 multi-petaled blossoms with golden pollen centers
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + (i % 2) * 0.3;
    const dist = i === 0 ? 0 : 0.0115;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const h = 0.011 + (i % 3) * 0.0032;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0011, 0.0013, h, 5),
      stemMat,
    );
    stem.position.set(x, h * 0.5, z);
    group.add(stem);

    const headGroup = new THREE.Group();
    headGroup.position.set(x, h + 0.0015, z);
    headGroup.rotation.x = (i === 0 ? 0 : 0.22) * Math.sin(angle);
    headGroup.rotation.z = (i === 0 ? 0 : -0.22) * Math.cos(angle);

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.002, 6, 6),
      pollenMat,
    );
    center.scale.set(1, 0.65, 1);
    headGroup.add(center);

    const petalMat = new THREE.MeshStandardMaterial({
      color: petalColors[i % petalColors.length],
      roughness: 0.58,
      flatShading: true,
    });
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.0021, 6, 6),
        petalMat,
      );
      petal.scale.set(1.15, 0.5, 0.85);
      petal.position.set(Math.cos(pa) * 0.0028, 0, Math.sin(pa) * 0.0028);
      petal.rotation.y = -pa;
      petal.castShadow = true;
      headGroup.add(petal);
    }

    group.add(headGroup);
  }

  return group;
}
