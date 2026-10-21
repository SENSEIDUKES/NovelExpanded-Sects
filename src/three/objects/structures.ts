import * as THREE from 'three';

const HOUSE_PALETTES = [
  { wall: '#fae4ad', roof: '#d96b4c', door: '#6e472b', trim: '#fffdf7', shutter: '#58826b' },
  { wall: '#f7c5b4', roof: '#6b7d99', door: '#593a28', trim: '#fcf9f2', shutter: '#4f627d' },
  { wall: '#c5e8cf', roof: '#c95b49', door: '#63412c', trim: '#ffffff', shutter: '#a85042' },
  { wall: '#ced7f7', roof: '#8f6578', door: '#4d3527', trim: '#faf8f5', shutter: '#6e4f5d' },
];

export function createPastelHouseMesh(variantIndex: number): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const palette = HOUSE_PALETTES[variantIndex % HOUSE_PALETTES.length];
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#9c9891',
    roughness: 0.88,
    flatShading: true,
  });
  const stoneQuoinMat = new THREE.MeshStandardMaterial({
    color: '#858079',
    roughness: 0.9,
    flatShading: true,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: '#6b4930',
    roughness: 0.82,
  });

  // Stone foundation plinth + front porch step + stepping stones
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.022, 0.058),
    plinthMat,
  );
  plinth.position.y = 0.004;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const doorstep = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.007, 0.014),
    stoneQuoinMat,
  );
  doorstep.position.set(-0.01, 0.012, 0.032);
  group.add(doorstep);

  const frontStone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.008, 0.004, 6),
    stoneQuoinMat,
  );
  frontStone.position.set(-0.01, 0.008, 0.044);
  group.add(frontStone);

  const wallMat = new THREE.MeshStandardMaterial({
    color: palette.wall,
    roughness: 0.76,
    flatShading: true,
  });
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(0.062, 0.048, 0.052),
    wallMat,
  );
  walls.position.y = 0.036;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Corner timber posts & horizontal half-timber beams
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cornerPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.0038, 0.049, 0.0038),
        timberMat,
      );
      cornerPost.position.set(sx * 0.0305, 0.036, sz * 0.0255);
      group.add(cornerPost);
    }
  }
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.064, 0.0032, 0.054),
    timberMat,
  );
  beam.position.y = 0.059;
  group.add(beam);

  const gableGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.052, 3);
  gableGeo.rotateY(Math.PI / 2);
  gableGeo.scale(1.0, 0.55, 1.0);
  const gable = new THREE.Mesh(gableGeo, wallMat);
  gable.position.y = 0.066;
  gable.castShadow = true;
  group.add(gable);

  // Exposed gable collar beam & bargeboards on front and back gables
  for (const sz of [-0.0262, 0.0262]) {
    const collarBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.0024, 0.0024),
      timberMat,
    );
    collarBeam.position.set(0, 0.071, sz);
    group.add(collarBeam);

    const kingPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.0024, 0.015, 0.0024),
      timberMat,
    );
    kingPost.position.set(0, 0.077, sz);
    group.add(kingPost);
  }

  const tileMat = new THREE.MeshStandardMaterial({
    color: palette.roof,
    roughness: 0.65,
    flatShading: true,
  });
  const tileAltMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.roof).offsetHSL(0.01, 0.03, -0.05),
    roughness: 0.65,
    flatShading: true,
  });

  // Layered shingle courses + bargeboard trim
  const roofSlopeAngle = 0.62;
  for (let side = -1; side <= 1; side += 2) {
    for (let row = 0; row < 5; row++) {
      const t = row / 4;
      const distDown = 0.005 + (1 - t) * 0.027;
      const yPos = 0.083 - (1 - t) * 0.022;
      const xPos = side * distDown;

      const tileRow = new THREE.Mesh(
        new THREE.BoxGeometry(0.0105, 0.0045, 0.063),
        row % 2 === 0 ? tileMat : tileAltMat,
      );
      tileRow.position.set(xPos, yPos, 0);
      tileRow.rotation.z = -side * roofSlopeAngle;
      tileRow.castShadow = true;
      tileRow.receiveShadow = true;
      group.add(tileRow);
    }
  }

  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.006, 0.065),
    tileMat,
  );
  ridge.position.set(0, 0.086, 0);
  ridge.castShadow = true;
  group.add(ridge);

  // Brick Chimney + Rim + Terracotta Chimney Pot
  const chimneyMat = new THREE.MeshStandardMaterial({
    color: '#b85d4b',
    roughness: 0.8,
  });
  const chimneyRimMat = new THREE.MeshStandardMaterial({
    color: '#e6dcd2',
    roughness: 0.7,
  });
  const chimneyShaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.028, 0.012),
    chimneyMat,
  );
  chimneyShaft.position.set(0.016, 0.084, -0.012);
  chimneyShaft.castShadow = true;
  group.add(chimneyShaft);

  const chimneyRim = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.0045, 0.016),
    chimneyRimMat,
  );
  chimneyRim.position.set(0.016, 0.098, -0.012);
  chimneyRim.castShadow = true;
  group.add(chimneyRim);

  const chimneyPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.004, 0.007, 8),
    chimneyMat,
  );
  chimneyPot.position.set(0.016, 0.103, -0.012);
  group.add(chimneyPot);

  // Arched wooden plank door + timber canopy awning + brass doorknob + iron strap hinges
  const doorMat = new THREE.MeshStandardMaterial({
    color: palette.door,
    roughness: 0.8,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.7,
  });
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.026, 0.0035),
    frameMat,
  );
  doorFrame.position.set(-0.01, 0.027, 0.026);
  group.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.013, 0.024, 0.0045),
    doorMat,
  );
  door.position.set(-0.01, 0.026, 0.0265);
  group.add(door);

  const doorAwning = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.003, 0.011),
    tileMat,
  );
  doorAwning.position.set(-0.01, 0.041, 0.029);
  doorAwning.rotation.x = 0.28;
  group.add(doorAwning);

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.0012, 6, 6),
    new THREE.MeshStandardMaterial({ color: '#e5bc57', metalness: 0.7, roughness: 0.25 }),
  );
  knob.position.set(-0.006, 0.025, 0.0292);
  group.add(knob);

  // Banded wooden rain barrel at front right corner + stacked firewood logs along side wall
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0052, 0.0046, 0.013, 8),
    timberMat,
  );
  barrel.position.set(0.028, 0.019, 0.03);
  barrel.castShadow = true;
  group.add(barrel);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3 - row; col++) {
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, 0.014, 6),
        timberMat,
      );
      log.rotation.x = Math.PI / 2;
      log.position.set(
        -0.034,
        0.016 + row * 0.0038,
        -0.01 + col * 0.0046 + row * 0.0023,
      );
      group.add(log);
    }
  }

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff3c4',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);

  const shutterMat = new THREE.MeshStandardMaterial({
    color: palette.shutter,
    roughness: 0.75,
  });

  const addWindow = (x: number, y: number, z: number, rotY: number, withFlowerBox: boolean) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(x, y, z);
    winGroup.rotation.y = rotY;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.015, 0.003),
      frameMat,
    );
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(0.011, 0.011, 0.004),
      winMat,
    );
    const vBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.0016, 0.013, 0.0048),
      frameMat,
    );
    const hBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.0016, 0.0048),
      frameMat,
    );
    winGroup.add(frame, pane, vBar, hBar);

    // Louvered side shutters
    for (const side of [-1, 1]) {
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(0.0042, 0.0145, 0.0025),
        shutterMat,
      );
      shutter.position.set(side * 0.0095, 0, 0.0012);
      shutter.rotation.y = -side * 0.18;
      winGroup.add(shutter);
    }

    // Window sill + flower box with colorful blossoms
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.0025, 0.0055),
      timberMat,
    );
    sill.position.set(0, -0.0082, 0.002);
    winGroup.add(sill);

    if (withFlowerBox) {
      const planter = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.004, 0.005),
        timberMat,
      );
      planter.position.set(0, -0.0095, 0.0032);
      winGroup.add(planter);

      const bloomCols = ['#ff7890', '#ffe066', '#b892ff'];
      for (let b = -1; b <= 1; b++) {
        const bloom = new THREE.Mesh(
          new THREE.SphereGeometry(0.0022, 6, 6),
          new THREE.MeshStandardMaterial({ color: bloomCols[b + 1], roughness: 0.6 }),
        );
        bloom.position.set(b * 0.0042, -0.0068, 0.0038);
        winGroup.add(bloom);
      }
    }

    group.add(winGroup);
  };

  addWindow(0.013, 0.036, 0.026, 0, true);
  addWindow(0.031, 0.036, 0.0, Math.PI / 2, true);
  addWindow(-0.031, 0.036, 0.0, -Math.PI / 2, false);
  // Attic gable circular window + frame
  const atticFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.0052, 0.001, 6, 12),
    timberMat,
  );
  atticFrame.position.set(0, 0.066, 0.0265);
  group.add(atticFrame);

  const atticWin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0048, 0.0048, 0.004, 10),
    winMat,
  );
  atticWin.rotation.x = Math.PI / 2;
  atticWin.position.set(0, 0.066, 0.0255);
  group.add(atticWin);

  return { group, windowMaterials };
}

export function createWhiteWindmillMesh(): {
  group: THREE.Group;
  rotor: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#9e978d',
    roughness: 0.88,
    flatShading: true,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: '#827c73',
    roughness: 0.9,
    flatShading: true,
  });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.044, 0.026, 10),
    stoneMat,
  );
  base.position.y = 0.012;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Projecting dressed stone masonry quoins around the octagonal base
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.011, 0.009, 0.006),
      i % 2 === 0 ? darkStoneMat : stoneMat,
    );
    block.position.set(Math.sin(a) * 0.04, 0.009 + (i % 2) * 0.007, Math.cos(a) * 0.04);
    block.rotation.y = a;
    group.add(block);
  }

  const whiteMat = new THREE.MeshStandardMaterial({
    color: '#f8f6f0',
    roughness: 0.72,
    flatShading: true,
  });
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.035, 0.088, 10),
    whiteMat,
  );
  tower.position.y = 0.064;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#785235',
    roughness: 0.8,
  });

  // Arched miller's door + stone steps + two burlap flour sacks beside the entry
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.023, 0.005),
    darkStoneMat,
  );
  doorFrame.position.set(0, 0.018, 0.038);
  group.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.02, 0.006),
    woodMat,
  );
  door.position.set(0, 0.018, 0.0385);
  group.add(door);

  const step = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.006, 0.012),
    darkStoneMat,
  );
  step.position.set(0, 0.005, 0.044);
  group.add(step);

  const sackMat = new THREE.MeshStandardMaterial({
    color: '#e8dec3',
    roughness: 0.88,
    flatShading: true,
  });
  for (let s = 0; s < 2; s++) {
    const sack = new THREE.Mesh(
      new THREE.SphereGeometry(0.0052, 7, 7),
      sackMat,
    );
    sack.scale.set(0.9, 1.25, 0.85);
    sack.position.set(0.014 + s * 0.006, 0.009, 0.039 - s * 0.004);
    sack.rotation.z = -0.15 + s * 0.25;
    sack.castShadow = true;
    group.add(sack);
  }

  // Octagonal timber balcony gallery + handrail posts + top rail
  const gallery = new THREE.Mesh(
    new THREE.CylinderGeometry(0.039, 0.036, 0.0048, 10),
    woodMat,
  );
  gallery.position.y = 0.042;
  gallery.castShadow = true;
  group.add(gallery);

  const railRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.0375, 0.0015, 6, 12),
    woodMat,
  );
  railRing.rotation.x = Math.PI / 2;
  railRing.position.y = 0.052;
  group.add(railRing);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0012, 0.0012, 0.011, 6),
      woodMat,
    );
    post.position.set(Math.cos(a) * 0.0375, 0.047, Math.sin(a) * 0.0375);
    group.add(post);

    // Diagonal support struts under the balcony
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.0022, 0.015, 0.0022),
      woodMat,
    );
    strut.position.set(Math.cos(a) * 0.033, 0.035, Math.sin(a) * 0.033);
    strut.rotation.y = -a;
    strut.rotation.z = 0.45;
    group.add(strut);
  }

  // Domed shingle cap + rear tailpole & spoked fantail wind-wheel
  const capGeo = new THREE.SphereGeometry(
    0.0258,
    12,
    10,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.6,
  );
  const capMat = new THREE.MeshStandardMaterial({
    color: '#63442d',
    roughness: 0.75,
    flatShading: true,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.106;
  cap.castShadow = true;
  group.add(cap);

  const tailBoom = new THREE.Mesh(
    new THREE.BoxGeometry(0.003, 0.003, 0.012),
    woodMat,
  );
  tailBoom.position.set(0, 0.11, -0.024);
  group.add(tailBoom);

  const fantailRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.009, 0.0014, 6, 12),
    woodMat,
  );
  fantailRing.rotation.y = Math.PI / 2;
  fantailRing.position.set(0, 0.112, -0.03);
  group.add(fantailRing);

  for (let f = 0; f < 6; f++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.001, 0.017, 0.0022),
      woodMat,
    );
    spoke.position.set(0, 0.112, -0.03);
    spoke.rotation.x = (f / 6) * Math.PI;
    group.add(spoke);
  }

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff3c4',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);
  for (const wy of [0.062, 0.086]) {
    const winFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.0135, 0.0155, 0.004),
      woodMat,
    );
    winFrame.position.set(0, wy, 0.0285);
    group.add(winFrame);

    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.0105, 0.0125, 0.0052),
      winMat,
    );
    win.position.set(0, wy, 0.029);
    group.add(win);
  }

  const rotor = new THREE.Group();
  rotor.position.set(0, 0.108, 0.062);

  const hubCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0078, 0.0086, 0.010, 10),
    darkStoneMat,
  );
  hubCollar.rotation.x = Math.PI / 2;
  hubCollar.position.z = -0.035;
  rotor.add(hubCollar);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0058, 0.0068, 0.048, 10),
    woodMat,
  );
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.019;
  rotor.add(hub);

  const hubCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.0062, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#d4af63', metalness: 0.6, roughness: 0.3 }),
  );
  hubCap.position.z = 0.005;
  rotor.add(hubCap);

  const canvasSailMat = new THREE.MeshStandardMaterial({
    color: '#fcf6e6',
    roughness: 0.85,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 4; i++) {
    const bladeGroup = new THREE.Group();
    bladeGroup.rotation.z = (i * Math.PI) / 2 + 0.25;

    const spar = new THREE.Mesh(
      new THREE.BoxGeometry(0.0035, 0.076, 0.0035),
      woodMat,
    );
    spar.position.y = 0.039;
    spar.castShadow = true;
    bladeGroup.add(spar);

    // Lattice grid bars + stitched canvas sail
    for (let r = 0; r < 6; r++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.0018, 0.002),
        woodMat,
      );
      bar.position.set(0.0085, 0.018 + r * 0.011, 0);
      bladeGroup.add(bar);
    }
    const outerRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.0018, 0.058, 0.002),
      woodMat,
    );
    outerRail.position.set(0.018, 0.046, 0);
    bladeGroup.add(outerRail);

    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.056, 0.0015),
      canvasSailMat,
    );
    sail.position.set(0.0095, 0.046, 0.0012);
    sail.rotation.y = 0.14;
    sail.castShadow = true;
    bladeGroup.add(sail);

    rotor.add(bladeGroup);
  }

  group.add(rotor);
  return { group, rotor, windowMaterials };
}

export function createStripedLighthouseMesh(): {
  group: THREE.Group;
  beamPivot: THREE.Group;
  coneMats: THREE.MeshBasicMaterial[];
  pointLight: THREE.PointLight;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const rockMat = new THREE.MeshStandardMaterial({
    color: '#7d828c',
    roughness: 0.9,
    flatShading: true,
  });
  const darkRockMat = new THREE.MeshStandardMaterial({
    color: '#636873',
    roughness: 0.92,
    flatShading: true,
  });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.046, 0.024, 10),
    rockMat,
  );
  base.position.y = 0.01;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Craggy coastal cliff boulders & stone wave-break wall around foundation
  const boulderSpecs = [
    { x: 0.038, y: 0.006, z: 0.018, r: 0.011 },
    { x: 0.032, y: 0.005, z: -0.026, r: 0.013 },
    { x: -0.038, y: 0.006, z: -0.022, r: 0.012 },
    { x: 0.012, y: 0.005, z: -0.04, r: 0.01 },
    { x: -0.014, y: 0.005, z: 0.038, r: 0.009 },
  ];
  boulderSpecs.forEach((b, idx) => {
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(b.r, 0),
      idx % 2 === 0 ? darkRockMat : rockMat,
    );
    boulder.position.set(b.x, b.y, b.z);
    boulder.scale.set(1.2, 0.75, 1.1);
    boulder.castShadow = true;
    group.add(boulder);
  });

  const redMat = new THREE.MeshStandardMaterial({
    color: '#d6473c',
    roughness: 0.65,
    flatShading: true,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: '#f7f4eb',
    roughness: 0.68,
    flatShading: true,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: '#2d3138',
    roughness: 0.5,
    metalness: 0.5,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#e5bc57',
    metalness: 0.72,
    roughness: 0.25,
  });

  // Attached coastal keeper's annex cottage with gable roof, brick chimney & doorway
  const annex = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.026, 0.026),
    whiteMat,
  );
  annex.position.set(-0.028, 0.024, 0.006);
  annex.castShadow = true;
  annex.receiveShadow = true;
  group.add(annex);

  const annexRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.024, 0.016, 4),
    redMat,
  );
  annexRoof.rotation.y = Math.PI / 4;
  annexRoof.scale.set(1.15, 1.0, 0.95);
  annexRoof.position.set(-0.028, 0.044, 0.006);
  annexRoof.castShadow = true;
  group.add(annexRoof);

  const annexChimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.0065, 0.014, 0.0065),
    redMat,
  );
  annexChimney.position.set(-0.036, 0.048, -0.001);
  group.add(annexChimney);

  // Arched lighthouse entryway door & stone steps at front of tower
  const entryDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.011, 0.018, 0.005),
    ironMat,
  );
  entryDoor.position.set(0.01, 0.021, 0.032);
  entryDoor.rotation.y = 0.28;
  group.add(entryDoor);

  const entryStep = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.006, 0.01),
    darkRockMat,
  );
  entryStep.position.set(0.012, 0.01, 0.037);
  entryStep.rotation.y = 0.28;
  group.add(entryStep);

  // 5-band tapered masonry tower
  const bandHeight = 0.021;
  for (let i = 0; i < 5; i++) {
    const t0 = i / 5;
    const t1 = (i + 1) / 5;
    const rBottom = THREE.MathUtils.lerp(0.029, 0.019, t0);
    const rTop = THREE.MathUtils.lerp(0.029, 0.019, t1);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBottom, bandHeight, 16),
      i % 2 === 0 ? redMat : whiteMat,
    );
    band.position.y = 0.022 + i * bandHeight + bandHeight * 0.5;
    band.castShadow = true;
    band.receiveShadow = true;
    group.add(band);
  }

  // Corbel brackets under observation gallery deck + wrought-iron guardrail + stanchions
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.027, 0.022, 0.0055, 16),
    ironMat,
  );
  deck.position.y = 0.128;
  deck.castShadow = true;
  group.add(deck);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    // Supporting stone corbel under the deck
    const corbel = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.007, 0.005),
      whiteMat,
    );
    corbel.position.set(Math.sin(a) * 0.0205, 0.123, Math.cos(a) * 0.0205);
    corbel.rotation.y = a;
    group.add(corbel);

    // Vertical iron railing stanchion
    const stanchion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0008, 0.0008, 0.009, 5),
      ironMat,
    );
    stanchion.position.set(Math.sin(a) * 0.025, 0.1325, Math.cos(a) * 0.025);
    group.add(stanchion);
  }

  const guardrail = new THREE.Mesh(
    new THREE.TorusGeometry(0.025, 0.0012, 6, 18),
    ironMat,
  );
  guardrail.rotation.x = Math.PI / 2;
  guardrail.position.y = 0.137;
  group.add(guardrail);

  // Miniature red lifebuoy ring mounted on the gallery railing
  const lifebuoy = new THREE.Mesh(
    new THREE.TorusGeometry(0.0035, 0.0011, 6, 12),
    redMat,
  );
  lifebuoy.position.set(0, 0.133, 0.0265);
  group.add(lifebuoy);

  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#fff7d6',
    emissive: new THREE.Color('#ffca57'),
    emissiveIntensity: 0.4,
    roughness: 0.15,
  });
  windowMaterials.push(lanternMat);

  // Brass-framed porthole windows spiraling up the shaft + keeper annex windows
  for (let w = 0; w < 3; w++) {
    const portZ = 0.0255 - w * 0.0032;
    const portY = 0.045 + w * 0.032;
    const brassRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.0042, 0.0009, 6, 12),
      brassMat,
    );
    brassRim.position.set(0, portY, portZ);
    group.add(brassRim);

    const porthole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.0038, 0.004, 10),
      lanternMat,
    );
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(0, portY, portZ - 0.0005);
    group.add(porthole);
  }

  for (const wz of [0.0195, -0.0075]) {
    const annexWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.0075, 0.0085, 0.004),
      lanternMat,
    );
    annexWin.position.set(-0.028, 0.025, wz);
    group.add(annexWin);
  }

  // Translucent glass lantern room + internal brass-and-crystal Fresnel lens
  const lanternGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0165, 0.0165, 0.021, 14),
    lanternMat,
  );
  lanternGlass.position.y = 0.14;
  group.add(lanternGlass);

  for (const ringY of [0.135, 0.14, 0.145]) {
    const fresnelRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.0168, 0.0007, 6, 14),
      brassMat,
    );
    fresnelRing.rotation.x = Math.PI / 2;
    fresnelRing.position.y = ringY;
    group.add(fresnelRing);
  }

  // Helical/vertical cage bars around the glass lantern room
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0009, 0.0009, 0.022, 6),
      ironMat,
    );
    bar.position.set(Math.cos(a) * 0.017, 0.14, Math.sin(a) * 0.017);
    group.add(bar);
  }

  // Cupola dome with projecting cornice rim, weathervane & lightning rod finial
  const cupolaRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.0195, 0.0014, 6, 16),
    ironMat,
  );
  cupolaRim.rotation.x = Math.PI / 2;
  cupolaRim.position.y = 0.15;
  group.add(cupolaRim);

  const cupola = new THREE.Mesh(
    new THREE.ConeGeometry(0.021, 0.019, 16),
    redMat,
  );
  cupola.position.y = 0.159;
  cupola.castShadow = true;
  group.add(cupola);

  const finialBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.003, 8, 8),
    brassMat,
  );
  finialBall.position.y = 0.169;
  group.add(finialBall);

  const lightningRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0005, 0.0009, 0.012, 6),
    ironMat,
  );
  lightningRod.position.y = 0.175;
  group.add(lightningRod);

  const weathervane = new THREE.Mesh(
    new THREE.BoxGeometry(0.011, 0.0018, 0.0008),
    brassMat,
  );
  weathervane.position.set(0.002, 0.174, 0);
  group.add(weathervane);

  const beamPivot = new THREE.Group();
  beamPivot.position.y = 0.14;

  const coneMats: THREE.MeshBasicMaterial[] = [];
  const createBeamCone = (dirSign: number) => {
    const coneGeo = new THREE.ConeGeometry(0.045, 0.48, 20, 1, true);
    coneGeo.translate(0, -0.24, 0);
    coneGeo.rotateX((dirSign * Math.PI) / 2);

    const pos = coneGeo.attributes.position;
    const colors: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const dist = v.length() / 0.48;
      const intensity = Math.pow(1.0 - THREE.MathUtils.clamp(dist, 0, 1), 1.6);
      colors.push(1.0 * intensity, 0.91 * intensity, 0.62 * intensity);
    }
    coneGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    coneMats.push(mat);
    return new THREE.Mesh(coneGeo, mat);
  };

  beamPivot.add(createBeamCone(1));
  beamPivot.add(createBeamCone(-1));

  const pointLight = new THREE.PointLight('#ffcf6e', 0, 0.55, 1.5);
  pointLight.position.y = 0.01;
  beamPivot.add(pointLight);

  group.add(beamPivot);

  return { group, beamPivot, coneMats, pointLight, windowMaterials };
}

export function createStoneWellMesh(): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#918d86',
    roughness: 0.88,
    flatShading: true,
  });
  const stoneAltMat = new THREE.MeshStandardMaterial({
    color: '#7d7972',
    roughness: 0.88,
    flatShading: true,
  });

  // Circular cobblestone base apron around the well
  const apron = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.034, 0.004, 14),
    stoneAltMat,
  );
  apron.position.y = 0.002;
  apron.receiveShadow = true;
  group.add(apron);

  const ringRadius = 0.021;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + row * 0.26;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.0115, 0.008, 0.009),
        (i + row) % 2 === 0 ? stoneMat : stoneAltMat,
      );
      block.position.set(
        Math.sin(angle) * ringRadius,
        0.005 + row * 0.0075,
        Math.cos(angle) * ringRadius,
      );
      block.rotation.y = angle;
      block.castShadow = true;
      block.receiveShadow = true;
      group.add(block);
    }
  }

  // Flat stone coping rim on top of the well wall
  const copingRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.021, 0.0045, 6, 16),
    stoneMat,
  );
  copingRim.rotation.x = Math.PI / 2;
  copingRim.position.y = 0.025;
  copingRim.scale.set(1, 1, 0.55);
  group.add(copingRim);

  const waterDisk = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 14),
    new THREE.MeshStandardMaterial({
      color: '#34b8c9',
      roughness: 0.12,
      metalness: 0.15,
    }),
  );
  waterDisk.rotation.x = -Math.PI / 2;
  waterDisk.position.y = 0.02;
  group.add(waterDisk);

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#734f34',
    roughness: 0.82,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: '#c9ad79',
    roughness: 0.88,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: '#2e3238',
    metalness: 0.55,
    roughness: 0.45,
  });

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.0048, 0.044, 0.0048),
      woodMat,
    );
    post.position.set(side * 0.021, 0.04, 0);
    post.castShadow = true;
    group.add(post);

    // Diagonal knee braces at top of posts
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(0.0028, 0.011, 0.0028),
      woodMat,
    );
    brace.position.set(side * 0.016, 0.055, 0);
    brace.rotation.z = side * 0.65;
    group.add(brace);
  }

  // Windlass spindle + coiled rope wraps + iron crank handle
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0028, 0.0028, 0.046, 8),
    woodMat,
  );
  spindle.rotation.z = Math.PI / 2;
  spindle.position.y = 0.048;
  group.add(spindle);

  for (let r = -2; r <= 2; r++) {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.0033, 0.0008, 6, 10),
      ropeMat,
    );
    coil.rotation.y = Math.PI / 2;
    coil.position.set(r * 0.0014, 0.048, 0);
    group.add(coil);
  }

  // Iron crank arm on right post
  const crankArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.0015, 0.009, 0.0015),
    ironMat,
  );
  crankArm.position.set(0.025, 0.045, 0);
  group.add(crankArm);

  const crankHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.001, 0.001, 0.005, 6),
    woodMat,
  );
  crankHandle.rotation.z = Math.PI / 2;
  crankHandle.position.set(0.0275, 0.041, 0);
  group.add(crankHandle);

  // Hanging rope & iron-banded wooden stave bucket
  const hangingRope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0007, 0.0007, 0.015, 5),
    ropeMat,
  );
  hangingRope.position.y = 0.041;
  group.add(hangingRope);

  const bucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0052, 0.0042, 0.0085, 8),
    woodMat,
  );
  bucket.position.y = 0.032;
  bucket.castShadow = true;
  group.add(bucket);

  const bucketBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.0048, 0.0006, 5, 10),
    ironMat,
  );
  bucketBand.rotation.x = Math.PI / 2;
  bucketBand.position.y = 0.034;
  group.add(bucketBand);

  // Layered shingle gable roof + ridge beam
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#8c583a',
    roughness: 0.78,
    flatShading: true,
  });
  const roofAltMat = new THREE.MeshStandardMaterial({
    color: '#78482d',
    roughness: 0.8,
    flatShading: true,
  });
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      const slope = new THREE.Mesh(
        new THREE.BoxGeometry(0.054, 0.0032, 0.01),
        row % 2 === 0 ? roofMat : roofAltMat,
      );
      slope.position.set(0, 0.066 - row * 0.0042, side * (0.004 + row * 0.0065));
      slope.rotation.x = side * 0.52;
      slope.castShadow = true;
      group.add(slope);
    }
  }

  const ridgeBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.004, 0.0045),
    woodMat,
  );
  ridgeBeam.position.y = 0.068;
  group.add(ridgeBeam);

  return group;
}

export function createWoodenFenceMesh(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#a87c56',
    roughness: 0.84,
    flatShading: true,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: '#8a6240',
    roughness: 0.86,
    flatShading: true,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#918d86',
    roughness: 0.9,
    flatShading: true,
  });

  // 3 chamfered fence posts with stone base collars & pyramid caps
  for (const px of [-0.025, 0, 0.025]) {
    const stoneBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0044, 0.0054, 0.0055, 6),
      stoneMat,
    );
    stoneBase.position.set(px, 0.0025, 0);
    group.add(stoneBase);

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.0054, 0.029, 0.0054),
      woodMat,
    );
    post.position.set(px, 0.0145, 0);
    post.castShadow = true;
    group.add(post);

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.0046, 0.0042, 4),
      darkWoodMat,
    );
    cap.rotation.y = Math.PI / 4;
    cap.position.set(px, 0.0308, 0);
    group.add(cap);
  }

  // Double horizontal mortised rails + diagonal cross braces
  for (const h of [0.0105, 0.0215]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.054, 0.0038, 0.0028),
      woodMat,
    );
    rail.position.set(0, h, 0.0016);
    rail.castShadow = true;
    group.add(rail);
  }

  for (const side of [-1, 1]) {
    const diag = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.0028, 0.0022),
      darkWoodMat,
    );
    diag.position.set(side * 0.0125, 0.016, -0.0012);
    diag.rotation.z = side * 0.42;
    group.add(diag);
  }

  return group;
}

export function createSteppingPathMesh(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#c9bfa8',
    roughness: 0.9,
    flatShading: true,
  });
  const warmStoneMat = new THREE.MeshStandardMaterial({
    color: '#b8ac93',
    roughness: 0.9,
    flatShading: true,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: '#6eb856',
    roughness: 0.85,
    flatShading: true,
  });

  const slabs = [
    { x: -0.016, z: -0.005, r: 0.0085, sy: 0.0048, warm: false },
    { x: -0.005, z: 0.005, r: 0.0095, sy: 0.0052, warm: true },
    { x: 0.007, z: -0.003, r: 0.0105, sy: 0.005, warm: false },
    { x: 0.018, z: 0.004, r: 0.008, sy: 0.0045, warm: true },
    { x: -0.012, z: 0.012, r: 0.0045, sy: 0.0035, warm: true },
    { x: 0.014, z: -0.011, r: 0.005, sy: 0.0038, warm: false },
  ];
  slabs.forEach((o, i) => {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(o.r, o.r * 1.12, o.sy, 7),
      o.warm ? warmStoneMat : stoneMat,
    );
    stone.position.set(o.x, o.sy * 0.45, o.z);
    stone.rotation.y = i * 0.8;
    stone.receiveShadow = true;
    group.add(stone);
  });

  // Tiny lush moss tufts between flagstones
  for (const [mx, mz] of [
    [-0.01, -0.001],
    [0.001, 0.002],
    [0.012, 0.001],
  ]) {
    const moss = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.0028, 0),
      mossMat,
    );
    moss.scale.set(1.2, 0.55, 1.1);
    moss.position.set(mx, 0.0018, mz);
    group.add(moss);
  }

  return group;
}

export function createWoodenDockMesh(isBridge = false): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#8f6340',
    roughness: 0.85,
    flatShading: true,
  });
  const plankAltMat = new THREE.MeshStandardMaterial({
    color: '#a3754f',
    roughness: 0.84,
    flatShading: true,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: '#69452a',
    roughness: 0.88,
    flatShading: true,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#8c8881',
    roughness: 0.9,
    flatShading: true,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: '#2e3238',
    metalness: 0.55,
    roughness: 0.45,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: '#cfb482',
    roughness: 0.88,
  });

  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#fff4c2',
    emissive: new THREE.Color('#ffba42'),
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  windowMaterials.push(lanternMat);

  if (isBridge) {
    // Arched footbridge with dressed stone abutments, wing walls, cambered planks, X-truss balustrades & bridge lanterns
    for (const side of [-1, 1]) {
      const abutment = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.024, 0.015),
        stoneMat,
      );
      abutment.position.set(0, 0.006, side * 0.039);
      abutment.castShadow = true;
      group.add(abutment);

      // Stone coping stones on abutment corners
      for (const sx of [-0.012, 0.012]) {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.0055, 0.012, 0.0055),
          stoneMat,
        );
        pillar.position.set(sx, 0.02, side * 0.042);
        group.add(pillar);
      }
    }

    const plankCount = 11;
    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1) - 0.5; // -0.5 .. 0.5
      const z = t * 0.074;
      const archY = 0.014 + (0.25 - t * t) * 0.068;
      const slope = -t * 0.56;

      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.0034, 0.0064),
        i % 2 === 0 ? woodMat : plankAltMat,
      );
      plank.position.set(0, archY, z);
      plank.rotation.x = slope;
      plank.castShadow = true;
      plank.receiveShadow = true;
      group.add(plank);

      // Newel posts + ball caps + center bridge lanterns
      if (i % 2 === 0) {
        for (const rx of [-0.0115, 0.0115]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.0026, 0.015, 0.0026),
            darkWoodMat,
          );
          post.position.set(rx, archY + 0.0075, z);
          group.add(post);

          if (i === 5) {
            // Warm glowing bridge lanterns at the apex of the arch
            const lantern = new THREE.Mesh(
              new THREE.CylinderGeometry(0.0024, 0.002, 0.005, 6),
              lanternMat,
            );
            lantern.position.set(rx, archY + 0.017, z);
            group.add(lantern);
          }
        }
      }
    }

    // Segmented arched top & middle handrails following the camber of the bridge
    for (const rx of [-0.0115, 0.0115]) {
      for (let s = 0; s < 4; s++) {
        const t0 = s / 4 - 0.5;
        const t1 = (s + 1) / 4 - 0.5;
        const tm = (t0 + t1) * 0.5;
        const z = tm * 0.074;
        const archY = 0.014 + (0.25 - tm * tm) * 0.068;
        const slope = -tm * 0.56;

        const topRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.0024, 0.0024, 0.02),
          darkWoodMat,
        );
        topRail.position.set(rx, archY + 0.014, z);
        topRail.rotation.x = slope;
        group.add(topRail);

        const midRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.0018, 0.0018, 0.02),
          woodMat,
        );
        midRail.position.set(rx, archY + 0.008, z);
        midRail.rotation.x = slope;
        group.add(midRail);
      }
    }
  } else {
    // Coastal timber pier dock with shoreward stone abutment, sloped land-access ramp, cross-braced pilings, deck boards, mooring bollard, cargo barrel & hanging lantern
    for (let row = 0; row < 5; row++) {
      const z = -0.032 + row * 0.0155;
      for (const side of [-0.012, 0.012]) {
        const piling = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0028, 0.003, 0.036, 7),
          darkWoodMat,
        );
        piling.position.set(side, 0.006, z);
        piling.castShadow = true;
        group.add(piling);
      }
      // Crossbeam cap between piling pairs
      const crossCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.003, 0.0035),
        darkWoodMat,
      );
      crossCap.position.set(0, 0.0165, z);
      group.add(crossCap);
    }

    // Longitudinal stringers + side wheel-guard curbs along main pier deck
    for (const sx of [-0.0125, 0.0125]) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.0028, 0.0025, 0.076),
        darkWoodMat,
      );
      curb.position.set(sx, 0.0215, 0.001);
      group.add(curb);
    }

    // Individual beveled deck boards along horizontal pier section
    for (let i = 0; i < 13; i++) {
      const z = -0.035 + i * 0.0061;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.0032, 0.0052),
        i % 2 === 0 ? woodMat : plankAltMat,
      );
      plank.position.set(0, 0.019, z);
      plank.castShadow = true;
      plank.receiveShadow = true;
      group.add(plank);
    }

    // Sloped wooden shore-access ramp & stone landward abutment connecting the pier deck onto the dry grassy bank above terrain
    const rampSlope = 0.24;
    for (const sx of [-0.0125, 0.0125]) {
      const rampCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.0028, 0.0028, 0.042),
        darkWoodMat,
      );
      rampCurb.position.set(sx, 0.015, -0.055);
      rampCurb.rotation.x = rampSlope;
      group.add(rampCurb);

      const rampHandrail = new THREE.Mesh(
        new THREE.BoxGeometry(0.0022, 0.0022, 0.042),
        woodMat,
      );
      rampHandrail.position.set(sx, 0.025, -0.055);
      rampHandrail.rotation.x = rampSlope;
      group.add(rampHandrail);

      for (const [pz, py] of [
        [-0.038, 0.023],
        [-0.055, 0.019],
        [-0.072, 0.015],
      ]) {
        const rampPost = new THREE.Mesh(
          new THREE.BoxGeometry(0.0024, 0.012, 0.0024),
          darkWoodMat,
        );
        rampPost.position.set(sx, py, pz);
        group.add(rampPost);
      }
    }

    for (let r = 0; r < 7; r++) {
      const t = (r + 0.5) / 7;
      const rz = THREE.MathUtils.lerp(-0.037, -0.073, t);
      const ry = THREE.MathUtils.lerp(0.0185, 0.0098, t);
      const rampPlank = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.0032, 0.005),
        r % 2 === 0 ? woodMat : plankAltMat,
      );
      rampPlank.position.set(0, ry, rz);
      rampPlank.rotation.x = rampSlope;
      rampPlank.castShadow = true;
      rampPlank.receiveShadow = true;
      group.add(rampPlank);
    }

    const shoreAbutment = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.014, 0.016),
      stoneMat,
    );
    shoreAbutment.position.set(0, 0.004, -0.076);
    shoreAbutment.castShadow = true;
    shoreAbutment.receiveShadow = true;
    group.add(shoreAbutment);

    // Cast-iron mooring bollard with coiled hemp rope on left of pier head
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0024, 0.0028, 0.007, 7),
      ironMat,
    );
    bollard.position.set(-0.009, 0.0235, 0.028);
    group.add(bollard);

    const ropeCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.0032, 0.001, 5, 10),
      ropeMat,
    );
    ropeCoil.rotation.x = Math.PI / 2;
    ropeCoil.position.set(-0.009, 0.0215, 0.028);
    group.add(ropeCoil);

    // Wooden cargo barrel & crate stacked near shore end of pier
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0042, 0.0038, 0.0095, 8),
      darkWoodMat,
    );
    barrel.position.set(-0.007, 0.025, -0.012);
    barrel.castShadow = true;
    group.add(barrel);

    // Wrought-iron dock lantern post + hanging bracket + glass lantern at pier head
    const lanternPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0016, 0.0022, 0.028, 6),
      ironMat,
    );
    lanternPost.position.set(0.011, 0.034, 0.029);
    lanternPost.castShadow = true;
    group.add(lanternPost);

    const lanternArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.0016, 0.0016),
      ironMat,
    );
    lanternArm.position.set(0.008, 0.047, 0.029);
    group.add(lanternArm);

    const lanternBulb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0032, 0.0024, 0.007, 6),
      lanternMat,
    );
    lanternBulb.position.set(0.005, 0.042, 0.029);
    group.add(lanternBulb);

    const lanternRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.0042, 0.003, 6),
      ironMat,
    );
    lanternRoof.position.set(0.005, 0.0465, 0.029);
    group.add(lanternRoof);
  }

  return { group, windowMaterials };
}

// ---------------------------------------------------------------------------
// NEW TOOL MESHES: B. COZY VILLAGE & COUNTRYSIDE LANDMARKS
// ---------------------------------------------------------------------------

export function createCampfireMesh(): {
  group: THREE.Group;
  flameGroup: THREE.Group;
  embers: THREE.Points;
  light: THREE.PointLight;
} {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#87837c',
    roughness: 0.9,
    flatShading: true,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: '#6e6a64',
    roughness: 0.92,
    flatShading: true,
  });

  // 10-stone firepit ring + glowing ember coal bed at center
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.0052, 0),
      i % 2 === 0 ? stoneMat : darkStoneMat,
    );
    stone.scale.set(1.15, 0.78, 1.0);
    stone.position.set(Math.cos(a) * 0.017, 0.003, Math.sin(a) * 0.017);
    stone.rotation.y = a;
    stone.castShadow = true;
    group.add(stone);
  }

  const coalBed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.014, 0.0035, 10),
    new THREE.MeshStandardMaterial({
      color: '#ff511a',
      emissive: new THREE.Color('#ff3b00'),
      emissiveIntensity: 0.9,
      roughness: 0.6,
    }),
  );
  coalBed.position.y = 0.0018;
  group.add(coalBed);

  const logMat = new THREE.MeshStandardMaterial({
    color: '#5e3c23',
    roughness: 0.88,
  });
  const benchLogMat = new THREE.MeshStandardMaterial({
    color: '#785032',
    roughness: 0.85,
    flatShading: true,
  });

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + 0.25;
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0026, 0.0032, 0.026, 6),
      logMat,
    );
    log.position.set(0, 0.0055, 0);
    log.rotation.order = 'YXZ';
    log.rotation.y = a;
    log.rotation.z = Math.PI / 2 - 0.24;
    log.castShadow = true;
    group.add(log);
  }

  // Two rustic log-bench seats placed outside the stone ring for villagers
  for (const side of [-1, 1]) {
    const benchLog = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.004, 0.022, 7),
      benchLogMat,
    );
    benchLog.rotation.z = Math.PI / 2;
    benchLog.position.set(0, 0.0038, side * 0.028);
    benchLog.castShadow = true;
    group.add(benchLog);
  }

  // Rustic wooden tripod cooking frame + hanging cast-iron kettle pot over the fire
  const ironMat = new THREE.MeshStandardMaterial({
    color: '#282a2e',
    metalness: 0.6,
    roughness: 0.45,
  });
  for (let t = 0; t < 3; t++) {
    const ta = (t / 3) * Math.PI * 2 + 0.4;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.001, 0.0014, 0.044, 5),
      logMat,
    );
    pole.position.set(Math.cos(ta) * 0.011, 0.019, Math.sin(ta) * 0.011);
    pole.rotation.z = Math.cos(ta) * 0.36;
    pole.rotation.x = -Math.sin(ta) * 0.36;
    pole.castShadow = true;
    group.add(pole);
  }

  const kettleChain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0005, 0.0005, 0.012, 4),
    ironMat,
  );
  kettleChain.position.y = 0.031;
  group.add(kettleChain);

  const kettle = new THREE.Mesh(
    new THREE.SphereGeometry(0.0048, 8, 8),
    ironMat,
  );
  kettle.scale.set(1.05, 0.88, 1.05);
  kettle.position.y = 0.0235;
  kettle.castShadow = true;
  group.add(kettle);

  const flameGroup = new THREE.Group();
  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.009, 0.023, 7),
    new THREE.MeshBasicMaterial({ color: '#ff6d24' }),
  );
  outerFlame.position.y = 0.013;
  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.0055, 0.016, 6),
    new THREE.MeshBasicMaterial({ color: '#ffe066' }),
  );
  innerFlame.position.y = 0.011;
  const sideTongue = new THREE.Mesh(
    new THREE.ConeGeometry(0.0045, 0.014, 5),
    new THREE.MeshBasicMaterial({ color: '#ff9636' }),
  );
  sideTongue.position.set(0.0035, 0.011, 0.002);
  sideTongue.rotation.z = -0.22;
  flameGroup.add(outerFlame, innerFlame, sideTongue);
  group.add(flameGroup);

  // Rising glowing ember particles
  const emberCount = 12;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (Math.random() - 0.5) * 0.015;
    emberPos[i * 3 + 1] = 0.01 + (i / emberCount) * 0.048;
    emberPos[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({
      color: '#ffaa33',
      size: 0.012,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(embers);

  const light = new THREE.PointLight('#ff8833', 0.65, 0.36, 1.6);
  light.position.y = 0.024;
  group.add(light);

  return { group, flameGroup, embers, light };
}

export function createStoneWatchtowerMesh(): {
  group: THREE.Group;
  flagMesh: THREE.Mesh;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#918d86',
    roughness: 0.88,
    flatShading: true,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: '#78746d',
    roughness: 0.9,
    flatShading: true,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: '#4c5d78',
    roughness: 0.68,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#5e3e26',
    roughness: 0.82,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#d4af63',
    metalness: 0.65,
    roughness: 0.3,
  });

  // Battered octagonal stone plinth base + stone steps + arched oak portcullis door
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.039, 0.022, 10),
    darkStoneMat,
  );
  plinth.position.y = 0.009;
  plinth.castShadow = true;
  group.add(plinth);

  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.022, 0.006),
    darkStoneMat,
  );
  doorFrame.position.set(0, 0.019, 0.032);
  group.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.0115, 0.019, 0.0065),
    woodMat,
  );
  door.position.set(0, 0.0185, 0.0325);
  group.add(door);

  const step = new THREE.Mesh(
    new THREE.BoxGeometry(0.017, 0.006, 0.011),
    darkStoneMat,
  );
  step.position.set(0, 0.005, 0.038);
  group.add(step);

  // Main cylindrical stone keep shaft + middle decorative stone stringcourse ring
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.078, 12),
    stoneMat,
  );
  shaft.position.y = 0.055;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  const stringCourse = new THREE.Mesh(
    new THREE.TorusGeometry(0.028, 0.0016, 6, 12),
    darkStoneMat,
  );
  stringCourse.rotation.x = Math.PI / 2;
  stringCourse.position.y = 0.052;
  group.add(stringCourse);

  // Attached fairytale side stair-turret (bartizan) with its own conical slate roof
  const sideTurret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.009, 0.042, 8),
    stoneMat,
  );
  sideTurret.position.set(-0.024, 0.072, 0.008);
  sideTurret.castShadow = true;
  group.add(sideTurret);

  const sideTurretBase = new THREE.Mesh(
    new THREE.ConeGeometry(0.01, 0.014, 8),
    darkStoneMat,
  );
  sideTurretBase.rotation.x = Math.PI;
  sideTurretBase.position.set(-0.024, 0.046, 0.008);
  group.add(sideTurretBase);

  const sideTurretRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.013, 0.022, 8),
    slateRoofMat,
  );
  sideTurretRoof.position.set(-0.024, 0.103, 0.008);
  sideTurretRoof.castShadow = true;
  group.add(sideTurretRoof);

  // Crenelated parapet ring + supporting machicolation corbels + 8 battlements
  const parapet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0295, 0.0265, 0.012, 12),
    darkStoneMat,
  );
  parapet.position.y = 0.096;
  group.add(parapet);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const corbel = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.007, 0.005),
      darkStoneMat,
    );
    corbel.position.set(Math.cos(a) * 0.026, 0.088, Math.sin(a) * 0.026);
    corbel.rotation.y = -a;
    group.add(corbel);

    const merlon = new THREE.Mesh(
      new THREE.BoxGeometry(0.0072, 0.0085, 0.0052),
      stoneMat,
    );
    merlon.position.set(Math.cos(a) * 0.0265, 0.104, Math.sin(a) * 0.0265);
    merlon.rotation.y = -a;
    group.add(merlon);
  }

  // Fairytale conical slate turret roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.0265, 0.044, 12),
    slateRoofMat,
  );
  roof.position.y = 0.123;
  roof.castShadow = true;
  group.add(roof);

  // Glowing lancet windows on main tower & side bartizan
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff3c4',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);
  for (const side of [-1, 1]) {
    const slit = new THREE.Mesh(
      new THREE.BoxGeometry(0.0055, 0.015, 0.0045),
      winMat,
    );
    slit.position.set(side * 0.026, 0.066, 0);
    slit.rotation.y = Math.PI / 2;
    group.add(slit);
  }
  const frontWin = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.014, 0.0045),
    winMat,
  );
  frontWin.position.set(0, 0.072, 0.026);
  group.add(frontWin);

  const turretWin = new THREE.Mesh(
    new THREE.BoxGeometry(0.0045, 0.009, 0.004),
    winMat,
  );
  turretWin.position.set(-0.024, 0.074, 0.018);
  group.add(turretWin);

  // Brass Flagpole + Finial Orb & Waving Pennant Flag
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.001, 0.0013, 0.028, 6),
    brassMat,
  );
  pole.position.y = 0.153;
  group.add(pole);

  const poleBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.0022, 6, 6),
    brassMat,
  );
  poleBall.position.y = 0.168;
  group.add(poleBall);

  const flagGeo = new THREE.BoxGeometry(0.023, 0.0095, 0.0015, 4, 1, 1);
  flagGeo.translate(0.0115, 0, 0);
  const flagMesh = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({
      color: '#e3564b',
      roughness: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  flagMesh.position.set(0, 0.16, 0);
  group.add(flagMesh);

  return { group, flagMesh, windowMaterials };
}

export function createBeehiveMesh(): {
  group: THREE.Group;
  butterflySwarm: THREE.Group;
} {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#8c623d',
    roughness: 0.85,
  });
  const darkSlotMat = new THREE.MeshStandardMaterial({
    color: '#26180d',
    roughness: 0.9,
  });

  // Raised timber hive stand with 4 corner legs + landing board
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.004, 0.028),
    woodMat,
  );
  base.position.y = 0.0065;
  group.add(base);

  for (const lx of [-0.01, 0.01]) {
    for (const lz of [-0.01, 0.01]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.0032, 0.006, 0.0032),
        woodMat,
      );
      leg.position.set(lx, 0.003, lz);
      group.add(leg);
    }
  }

  // Two painted pastel Langstroth apiary hive boxes with entrance slot & side handles
  const box1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.014, 0.022),
    new THREE.MeshStandardMaterial({
      color: '#fae39c',
      roughness: 0.72,
      flatShading: true,
    }),
  );
  box1.position.y = 0.0155;
  box1.castShadow = true;
  group.add(box1);

  const entranceSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.0022, 0.002),
    darkSlotMat,
  );
  entranceSlot.position.set(0, 0.0095, 0.0112);
  group.add(entranceSlot);

  const box2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.021, 0.012, 0.021),
    new THREE.MeshStandardMaterial({
      color: '#bfe3c8',
      roughness: 0.72,
      flatShading: true,
    }),
  );
  box2.position.y = 0.0285;
  box2.castShadow = true;
  group.add(box2);

  const upperHole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0016, 0.0016, 0.002, 8),
    darkSlotMat,
  );
  upperHole.rotation.x = Math.PI / 2;
  upperHole.position.set(0, 0.0285, 0.0106);
  group.add(upperHole);

  // Pitched gabled hive roof with overhangs & ridge cap
  for (const side of [-1, 1]) {
    const roofSlope = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.0028, 0.025),
      woodMat,
    );
    roofSlope.position.set(side * 0.006, 0.0375, 0);
    roofSlope.rotation.z = -side * 0.45;
    roofSlope.castShadow = true;
    group.add(roofSlope);
  }

  // Miniature golden honey jar resting beside the hive stand
  const honeyJar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.0035, 0.0065, 8),
    new THREE.MeshStandardMaterial({
      color: '#f5b027',
      roughness: 0.25,
      metalness: 0.1,
    }),
  );
  honeyJar.position.set(0.017, 0.0032, 0.008);
  group.add(honeyJar);

  const jarLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0034, 0.0034, 0.0018, 8),
    new THREE.MeshStandardMaterial({ color: '#fcf6e6', roughness: 0.7 }),
  );
  jarLid.position.set(0.017, 0.007, 0.008);
  group.add(jarLid);

  // Swarm of 5 detailed pastel butterflies & plump striped golden honeybees
  const butterflySwarm = new THREE.Group();
  butterflySwarm.position.y = 0.048;

  const darkBodyMat = new THREE.MeshStandardMaterial({
    color: '#2e2621',
    roughness: 0.7,
  });
  const beeGoldMat = new THREE.MeshStandardMaterial({
    color: '#f5b82e',
    roughness: 0.55,
  });

  const wingColors = ['#ff9ebb', '#ffd954', '#9ed8ff', '#d4a6ff', '#ffb870'];
  for (let i = 0; i < 5; i++) {
    const bPivot = new THREE.Group();
    const angle = (i / 5) * Math.PI * 2;
    bPivot.position.set(
      Math.cos(angle) * 0.025,
      (i % 2) * 0.012,
      Math.sin(angle) * 0.025,
    );
    bPivot.rotation.y = -angle;

    const isHoneybee = i % 2 === 1;

    if (isHoneybee) {
      // Plump golden honeybee with black stripe band & translucent wings
      const leftWingGroup = new THREE.Group();
      const rightWingGroup = new THREE.Group();
      const translucentWingMat = new THREE.MeshBasicMaterial({
        color: '#eef8ff',
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      });

      const lw = new THREE.Mesh(
        new THREE.CircleGeometry(0.0032, 8),
        translucentWingMat,
      );
      lw.scale.set(1.3, 0.75, 1.0);
      lw.position.set(-0.0032, 0.001, 0);
      leftWingGroup.add(lw);

      const rw = new THREE.Mesh(
        new THREE.CircleGeometry(0.0032, 8),
        translucentWingMat,
      );
      rw.scale.set(1.3, 0.75, 1.0);
      rw.position.set(0.0032, 0.001, 0);
      rightWingGroup.add(rw);

      // Keep children[0] and children[1] as left/right wing groups for animation
      bPivot.add(leftWingGroup, rightWingGroup);

      const beeBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.0022, 8, 8),
        beeGoldMat,
      );
      beeBody.scale.set(0.85, 0.85, 1.45);
      bPivot.add(beeBody);

      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 0.0016, 8),
        darkBodyMat,
      );
      stripe.rotation.x = Math.PI / 2;
      bPivot.add(stripe);
    } else {
      // Sculpted 4-wing Butterfly with thorax, abdomen & fore/hind wings
      const wingMat = new THREE.MeshBasicMaterial({
        color: wingColors[i],
        side: THREE.DoubleSide,
      });

      const leftWingGroup = new THREE.Group();
      const foreLeft = new THREE.Mesh(
        new THREE.CircleGeometry(0.0038, 8),
        wingMat,
      );
      foreLeft.scale.set(1.25, 0.88, 1.0);
      foreLeft.position.set(-0.0034, 0, 0.0014);
      const hindLeft = new THREE.Mesh(
        new THREE.CircleGeometry(0.0026, 8),
        wingMat,
      );
      hindLeft.position.set(-0.0026, 0, -0.0022);
      leftWingGroup.add(foreLeft, hindLeft);

      const rightWingGroup = new THREE.Group();
      const foreRight = new THREE.Mesh(
        new THREE.CircleGeometry(0.0038, 8),
        wingMat,
      );
      foreRight.scale.set(1.25, 0.88, 1.0);
      foreRight.position.set(0.0034, 0, 0.0014);
      const hindRight = new THREE.Mesh(
        new THREE.CircleGeometry(0.0026, 8),
        wingMat,
      );
      hindRight.position.set(0.0026, 0, -0.0022);
      rightWingGroup.add(foreRight, hindRight);

      bPivot.add(leftWingGroup, rightWingGroup);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0007, 0.0006, 0.0068, 6),
        darkBodyMat,
      );
      body.rotation.x = Math.PI / 2;
      bPivot.add(body);
    }

    butterflySwarm.add(bPivot);
  }

  group.add(butterflySwarm);
  return { group, butterflySwarm };
}

export function createLanternPostMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  // Stone shrine lantern: plinth, pillar, glowing firebox, flared cap
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#9a958c',
    roughness: 0.9,
    flatShading: true,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: '#7b766e',
    roughness: 0.92,
    flatShading: true,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0062, 0.0074, 0.005, 6),
    darkStoneMat,
  );
  base.position.y = 0.0025;
  base.castShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0026, 0.0032, 0.02, 6),
    stoneMat,
  );
  pillar.position.y = 0.015;
  pillar.castShadow = true;
  group.add(pillar);

  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(0.011, 0.0028, 0.011),
    darkStoneMat,
  );
  shelf.position.y = 0.0264;
  group.add(shelf);

  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#fff1c4',
    emissive: new THREE.Color('#ffb03a'),
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  windowMaterials.push(lanternMat);

  const firebox = new THREE.Mesh(
    new THREE.BoxGeometry(0.0072, 0.0072, 0.0072),
    lanternMat,
  );
  firebox.position.y = 0.0314;
  group.add(firebox);

  // Stone frame posts around the firebox
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.0016, 0.0076, 0.0016),
        stoneMat,
      );
      post.position.set(sx * 0.0042, 0.0314, sz * 0.0042);
      group.add(post);
    }
  }

  const capGeo = new THREE.CylinderGeometry(0.0022, 0.0088, 0.0048, 4);
  capGeo.rotateY(Math.PI / 4);
  const cap = new THREE.Mesh(capGeo, darkStoneMat);
  cap.position.y = 0.0376;
  cap.castShadow = true;
  group.add(cap);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 6, 4), stoneMat);
  knob.position.y = 0.0414;
  group.add(knob);

  return { group, windowMaterials };
}
