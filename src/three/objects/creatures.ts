import * as THREE from 'three';

// Disciple robes: muted Eastern tones, each paired with a contrasting trim for collar, sash and cuffs
const DISCIPLE_ROBES = [
  { robe: '#3f7d6a', trim: '#efe8d6' }, // jade
  { robe: '#34416e', trim: '#d7b45f' }, // indigo
  { robe: '#9a2e2c', trim: '#2b2a2f' }, // crimson
  { robe: '#ebe6d8', trim: '#3f7d6a' }, // off-white
  { robe: '#2b2a30', trim: '#a8322e' }, // ink
  { robe: '#66456f', trim: '#efe8d6' }, // plum
  { robe: '#b58a40', trim: '#4a3424' }, // ochre
  { robe: '#2e6b75', trim: '#efe8d6' }, // teal
];

const HAIR_COLORS = ['#1f1a17', '#2c221e', '#3b2a20', '#1a1a1f', '#4a3222'];
const LEG_COLORS = ['#2b2a2f', '#3a2f28', '#2f3434', '#3b3330'];

/**
 * A Sect disciple in long robes. Internally still the "villager": the scene animates
 * the returned pivots (body bob, leg and arm swing, head turn) exactly as before.
 */
export function createVillagerMesh(colorIdx: number): {
  group: THREE.Group;
  bodyMesh: THREE.Object3D;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
} {
  const group = new THREE.Group();
  // Slightly larger, clearly readable storybook figurine scale
  const inner = new THREE.Group();
  inner.scale.setScalar(1.22);

  const palette = DISCIPLE_ROBES[colorIdx % DISCIPLE_ROBES.length];
  const robeMat = new THREE.MeshStandardMaterial({
    color: palette.robe,
    roughness: 0.74,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.7,
    flatShading: true,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: LEG_COLORS[colorIdx % LEG_COLORS.length],
    roughness: 0.8,
    flatShading: true,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: '#1f1c1c',
    roughness: 0.78,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#f2cfb0',
    roughness: 0.65,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: HAIR_COLORS[colorIdx % HAIR_COLORS.length],
    roughness: 0.82,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#d6ad55',
    metalness: 0.6,
    roughness: 0.32,
  });
  const jadeMat = new THREE.MeshStandardMaterial({
    color: '#6fc29a',
    roughness: 0.25,
    metalness: 0.1,
  });

  // 1. Legs: short dark legs and cloth shoes that peek out under the robe hem mid-stride
  const buildLeg = (side: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.0024, 0.0075, 0);

    const legShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0014, 0.0013, 0.0058, 8),
      legMat,
    );
    legShaft.position.y = -0.0029;
    legShaft.castShadow = true;
    legPivot.add(legShaft);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.0027, 0.0018, 0.0042),
      shoeMat,
    );
    shoe.position.set(0, -0.0064, 0.0008);
    shoe.castShadow = true;
    legPivot.add(shoe);

    return legPivot;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  inner.add(leftLeg, rightLeg);

  // 2. Robe: long flared skirt, upper body, crossed collar, cloth sash with a jade pendant
  const torsoGroup = new THREE.Group();

  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0046, 0.0072, 0.0118, 10),
    robeMat,
  );
  skirt.position.y = 0.0087;
  skirt.castShadow = true;
  torsoGroup.add(skirt);

  const hem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0072, 0.0073, 0.0009, 10),
    trimMat,
  );
  hem.position.y = 0.0032;
  torsoGroup.add(hem);

  const upperBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0043, 0.0046, 0.0072, 10),
    robeMat,
  );
  upperBody.position.y = 0.0167;
  upperBody.castShadow = true;
  torsoGroup.add(upperBody);

  // Overlapping V collar, the robe's signature line
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(
      new THREE.BoxGeometry(0.0012, 0.0074, 0.0008),
      trimMat,
    );
    lapel.position.set(side * 0.0013, 0.0172, 0.0043);
    lapel.rotation.z = -side * 0.42;
    lapel.rotation.x = -0.08;
    torsoGroup.add(lapel);
  }

  const neckband = new THREE.Mesh(
    new THREE.TorusGeometry(0.0031, 0.0008, 6, 12),
    trimMat,
  );
  neckband.rotation.x = Math.PI / 2;
  neckband.position.y = 0.0202;
  torsoGroup.add(neckband);

  const sash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0048, 0.005, 0.0026, 10),
    trimMat,
  );
  sash.position.y = 0.0135;
  torsoGroup.add(sash);

  const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.0011, 0), jadeMat);
  pendant.position.set(0.0014, 0.0113, 0.0052);
  torsoGroup.add(pendant);

  const tassel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0003, 0.0005, 0.0026, 5),
    new THREE.MeshStandardMaterial({ color: '#a8322e', roughness: 0.7 }),
  );
  tassel.position.set(0.0014, 0.0094, 0.0053);
  torsoGroup.add(tassel);

  inner.add(torsoGroup);

  // 3. Arms: wide sleeves flaring at a trimmed cuff, hands just showing
  const propStyle = colorIdx % 3;
  const buildArm = (side: number, holdsScroll: boolean) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.0056, 0.0185, 0);
    armPivot.rotation.z = -side * 0.18;

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0016, 0.0022, 0.0055, 8),
      robeMat,
    );
    sleeve.position.y = -0.0026;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0033, 0.0026, 8),
      trimMat,
    );
    cuff.position.y = -0.0064;
    cuff.castShadow = true;
    armPivot.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 8, 8), skinMat);
    hand.position.y = -0.0081;
    armPivot.add(hand);

    if (holdsScroll) {
      const scroll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0011, 0.0011, 0.0058, 8),
        new THREE.MeshStandardMaterial({ color: '#efe3c4', roughness: 0.8 }),
      );
      scroll.rotation.x = Math.PI / 2;
      scroll.position.set(0, -0.0084, 0.0014);
      armPivot.add(scroll);

      for (const end of [-1, 1]) {
        const knob = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0007, 0.0007, 0.0007, 6),
          new THREE.MeshStandardMaterial({ color: '#5e3a22', roughness: 0.7 }),
        );
        knob.rotation.x = Math.PI / 2;
        knob.position.set(0, -0.0084, 0.0014 + end * 0.0032);
        armPivot.add(knob);
      }
    }

    return armPivot;
  };

  const leftArm = buildArm(-1, false);
  const rightArm = buildArm(1, propStyle === 1);
  inner.add(leftArm, rightArm);

  // Sword slung across the back
  if (propStyle === 0) {
    const swordGroup = new THREE.Group();
    const scabbard = new THREE.Mesh(
      new THREE.BoxGeometry(0.0012, 0.0168, 0.0011),
      new THREE.MeshStandardMaterial({ color: '#2a1f1c', roughness: 0.6 }),
    );
    swordGroup.add(scabbard);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.0007, 0.0014), goldMat);
    guard.position.y = 0.0086;
    swordGroup.add(guard);
    const hilt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0005, 0.0005, 0.0034, 6),
      new THREE.MeshStandardMaterial({ color: '#7a2a2a', roughness: 0.6 }),
    );
    hilt.position.y = 0.0106;
    swordGroup.add(hilt);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.0007, 6, 6), goldMat);
    pommel.position.y = 0.0125;
    swordGroup.add(pommel);

    swordGroup.position.set(0, 0.0158, -0.0052);
    swordGroup.rotation.z = 0.62;
    swordGroup.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    inner.add(swordGroup);
  }

  // 4. Head: calm face and one of four cultivator hairstyles
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.0245, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 12), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.001, 6, 6), skinMat);
  nose.position.set(0, -0.0002, 0.0051);
  headGroup.add(nose);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: '#1f1916',
    roughness: 0.3,
  });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.00075, 6, 6), eyeMat);
    eye.position.set(side * 0.0019, 0.0008, 0.0046);
    headGroup.add(eye);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 6, 6), skinMat);
    ear.position.set(side * 0.005, 0.0, 0.0);
    headGroup.add(ear);
  }

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.0054, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
  );
  hairCap.rotation.x = -0.35;
  headGroup.add(hairCap);

  const hairStyle = colorIdx % 4;
  if (hairStyle === 0) {
    // Topknot held by a small gold crown
    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 8), hairMat);
    topknot.position.set(0, 0.0058, -0.0008);
    headGroup.add(topknot);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.0018, 0.0032), goldMat);
    crown.position.set(0, 0.0068, -0.0008);
    headGroup.add(crown);

    const crownPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0003, 0.0003, 0.0052, 5),
      goldMat,
    );
    crownPin.rotation.z = Math.PI / 2;
    crownPin.position.set(0, 0.0068, -0.0008);
    headGroup.add(crownPin);
  } else if (hairStyle === 1) {
    // Back bun pierced by a long jade-tipped hairpin
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 8, 8), hairMat);
    bun.position.set(0, 0.004, -0.0044);
    headGroup.add(bun);

    const hairpin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0003, 0.0003, 0.0088, 5),
      goldMat,
    );
    // Tilted so its upper end points to the disciple's left; the jade bead caps that end
    hairpin.rotation.z = -1.25;
    hairpin.position.set(0, 0.0044, -0.0046);
    headGroup.add(hairpin);

    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0007, 6, 6), jadeMat);
    bead.position.set(0.0042, 0.0058, -0.0046);
    headGroup.add(bead);
  } else if (hairStyle === 2) {
    // Long hair tied back with a ribbon, hanging down the back
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.0112, 0.0016), hairMat);
    tail.position.set(0, -0.0026, -0.0047);
    tail.rotation.x = 0.08;
    tail.castShadow = true;
    headGroup.add(tail);

    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.0046, 0.0012, 0.002), trimMat);
    ribbon.position.set(0, 0.0018, -0.005);
    headGroup.add(ribbon);
  } else {
    // Wandering cultivator's conical bamboo hat
    const bambooMat = new THREE.MeshStandardMaterial({
      color: '#c9a86a',
      roughness: 0.85,
      flatShading: true,
    });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.0094, 0.004, 14), bambooMat);
    hat.position.y = 0.0062;
    hat.castShadow = true;
    headGroup.add(hat);

    const hatKnob = new THREE.Mesh(new THREE.SphereGeometry(0.0007, 6, 6), bambooMat);
    hatKnob.position.y = 0.0085;
    headGroup.add(hatKnob);
  }

  inner.add(headGroup);
  group.add(inner);

  return {
    group,
    bodyMesh: inner,
    headGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
  };
}

export function createSheepMesh(): {
  group: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Group[];
  tailMesh: THREE.Object3D;
} {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(1.18);

  const woolMat = new THREE.MeshStandardMaterial({
    color: '#fcfaf2',
    roughness: 0.9,
    flatShading: true,
  });
  const woolWarmMat = new THREE.MeshStandardMaterial({
    color: '#f5efe1',
    roughness: 0.92,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#38302a',
    roughness: 0.82,
    flatShading: true,
  });
  const hoofMat = new THREE.MeshStandardMaterial({
    color: '#1f1a17',
    roughness: 0.7,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: '#e89b96',
    roughness: 0.65,
  });

  // 1. Multi-Puff Cloud-Like Sculpted Wool Fleece Body
  const woolPuffs = [
    { x: 0, y: 0.0125, z: 0, r: 0.0072, sx: 1.05, sy: 0.95, sz: 1.25 },
    { x: 0, y: 0.013, z: 0.0058, r: 0.0062, sx: 1.0, sy: 0.95, sz: 1.0 },
    { x: 0, y: 0.0125, z: -0.0062, r: 0.0064, sx: 1.02, sy: 0.95, sz: 1.0 },
    { x: -0.0046, y: 0.0118, z: 0.001, r: 0.0054, sx: 0.9, sy: 0.9, sz: 1.15 },
    { x: 0.0046, y: 0.0118, z: 0.001, r: 0.0054, sx: 0.9, sy: 0.9, sz: 1.15 },
    { x: -0.0038, y: 0.0122, z: -0.0045, r: 0.0048, sx: 1, sy: 1, sz: 1 },
    { x: 0.0038, y: 0.0122, z: -0.0045, r: 0.0048, sx: 1, sy: 1, sz: 1 },
    { x: 0, y: 0.0162, z: 0.001, r: 0.0052, sx: 1.05, sy: 0.8, sz: 1.2 },
  ];

  woolPuffs.forEach((p, idx) => {
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.r, 1),
      idx % 2 === 0 ? woolMat : woolWarmMat,
    );
    puff.position.set(p.x, p.y, p.z);
    puff.scale.set(p.sx, p.sy, p.sz);
    puff.castShadow = true;
    inner.add(puff);
  });

  // Cute round woolly tail at the back
  const tailMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.0032, 1),
    woolMat,
  );
  tailMesh.position.set(0, 0.0115, -0.0122);
  inner.add(tailMesh);

  // 2. Four Articulated Legs with Upper Wool Cuffs & Hooves
  const legs: THREE.Group[] = [];
  const legOffsets = [
    [-0.0042, 0.0052],
    [0.0042, 0.0052],
    [-0.0042, -0.0055],
    [0.0042, -0.0055],
  ];
  legOffsets.forEach(([lx, lz]) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.0082, lz);

    const woolCuff = new THREE.Mesh(
      new THREE.SphereGeometry(0.0022, 6, 6),
      woolMat,
    );
    woolCuff.position.y = -0.001;
    legPivot.add(woolCuff);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0013, 0.0011, 0.0068, 6),
      darkMat,
    );
    shin.position.y = -0.0042;
    shin.castShadow = true;
    legPivot.add(shin);

    const hoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0013, 0.0015, 0.0018, 6),
      hoofMat,
    );
    hoof.position.y = -0.0074;
    legPivot.add(hoof);

    legs.push(legPivot);
    inner.add(legPivot);
  });

  // 3. Detailed Sheep Head with Snout, Horizontal Ears, Glossy Eyes & Forehead Wool Tuft
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.0145, 0.0105);

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.0042, 8, 8),
    darkMat,
  );
  cranium.scale.set(0.95, 0.92, 1.15);
  cranium.position.set(0, 0, 0.002);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const snout = new THREE.Mesh(
    new THREE.SphereGeometry(0.0031, 8, 8),
    darkMat,
  );
  snout.scale.set(0.88, 0.78, 1.15);
  snout.position.set(0, -0.0008, 0.0056);
  headGroup.add(snout);

  const noseTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.001, 6, 6),
    noseMat,
  );
  noseTip.position.set(0, -0.0004, 0.0088);
  headGroup.add(noseTip);

  // Two glossy eyes + splayed floppy sheep ears
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#14110f' });
  for (const side of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.0009, 6, 6),
      eyeWhiteMat,
    );
    eyeWhite.position.set(side * 0.0035, 0.0008, 0.0038);
    headGroup.add(eyeWhite);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.00055, 6, 6),
      pupilMat,
    );
    pupil.position.set(side * 0.0039, 0.0008, 0.0041);
    headGroup.add(pupil);

    // Floppy horizontal ear
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.0018, 6, 6),
      darkMat,
    );
    ear.scale.set(1.65, 0.48, 0.75);
    ear.position.set(side * 0.0052, 0.0006, 0.0012);
    ear.rotation.z = -side * 0.28;
    headGroup.add(ear);
  }

  // Fluffy wool crown tuft on top of head
  const tuft = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.0038, 1),
    woolMat,
  );
  tuft.scale.set(1.1, 0.85, 1.05);
  tuft.position.set(0, 0.0036, 0.0018);
  headGroup.add(tuft);

  inner.add(headGroup);
  group.add(inner);

  return { group, headGroup, legs, tailMesh };
}

// ---------------------------------------------------------------------------
// NEW TOOL MESHES: A. WATER & COASTAL LIFE
// ---------------------------------------------------------------------------

const SAIL_PALETTES = ['#f7b2a1', '#fce5a2', '#b3e5cd', '#bdd3f7'];

export function createSailboatMesh(variantIdx: number): {
  group: THREE.Group;
  hullGroup: THREE.Group;
  lanternMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const hullGroup = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: '#754829',
    roughness: 0.78,
    flatShading: true,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: '#54321b',
    roughness: 0.82,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: '#f7f0e1',
    roughness: 0.72,
    flatShading: true,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: '#cfb482',
    roughness: 0.88,
  });

  // Sculpted carvel-planked boat hull + keel + raised bow stempost & stern transom
  const hullGeo = new THREE.CylinderGeometry(0.0145, 0.0095, 0.048, 8);
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.scale(0.88, 0.52, 1.0);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.005;
  hull.castShadow = true;
  hullGroup.add(hull);

  // Cream gunwale coaming & interior cockpit floor grating
  const gunwale = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.0022, 0.04),
    trimMat,
  );
  gunwale.position.y = 0.0092;
  hullGroup.add(gunwale);

  const cockpitFloor = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.0018, 0.028),
    darkWoodMat,
  );
  cockpitFloor.position.y = 0.0098;
  hullGroup.add(cockpitFloor);

  // Two cross-hull wooden bench thwarts + stowed wooden oars along gunwales
  for (const bz of [-0.007, 0.007]) {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.0018, 0.0042),
      hullMat,
    );
    bench.position.set(0, 0.0112, bz);
    hullGroup.add(bench);
  }

  for (const side of [-1, 1]) {
    const oarShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0007, 0.0007, 0.028, 5),
      trimMat,
    );
    oarShaft.rotation.x = Math.PI / 2;
    oarShaft.position.set(side * 0.0095, 0.0115, -0.002);
    hullGroup.add(oarShaft);

    const oarBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.0022, 0.0008, 0.007),
      hullMat,
    );
    oarBlade.position.set(side * 0.0095, 0.0115, -0.014);
    hullGroup.add(oarBlade);
  }

  // Raised prow stempost + bowsprit spar + stern rudder & tiller handle
  const stempost = new THREE.Mesh(
    new THREE.BoxGeometry(0.0025, 0.009, 0.003),
    darkWoodMat,
  );
  stempost.position.set(0, 0.011, 0.0235);
  stempost.rotation.x = 0.35;
  hullGroup.add(stempost);

  const bowsprit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0009, 0.0014, 0.014, 6),
    darkWoodMat,
  );
  bowsprit.rotation.x = Math.PI / 2 - 0.22;
  bowsprit.position.set(0, 0.0125, 0.027);
  hullGroup.add(bowsprit);

  const rudder = new THREE.Mesh(
    new THREE.BoxGeometry(0.0018, 0.0085, 0.0055),
    darkWoodMat,
  );
  rudder.position.set(0, 0.0055, -0.025);
  hullGroup.add(rudder);

  const tiller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0007, 0.0009, 0.011, 5),
    darkWoodMat,
  );
  tiller.rotation.x = Math.PI / 2 + 0.25;
  tiller.position.set(0, 0.0115, -0.02);
  hullGroup.add(tiller);

  // Coiled mooring rope on the foredeck + lifebuoy ring on the stern quarter
  const ropeCoil = new THREE.Mesh(
    new THREE.TorusGeometry(0.0026, 0.0009, 5, 10),
    ropeMat,
  );
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(0, 0.011, 0.015);
  hullGroup.add(ropeCoil);

  const lifebuoy = new THREE.Mesh(
    new THREE.TorusGeometry(0.0028, 0.0009, 6, 10),
    new THREE.MeshStandardMaterial({ color: '#d94b3d', roughness: 0.6 }),
  );
  lifebuoy.rotation.y = Math.PI / 2;
  lifebuoy.position.set(0.0105, 0.0095, -0.012);
  hullGroup.add(lifebuoy);

  // Timber mast + horizontal main boom + upper gaff spar
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0014, 0.002, 0.056, 7),
    hullMat,
  );
  mast.position.set(0, 0.036, 0.003);
  mast.castShadow = true;
  hullGroup.add(mast);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.001, 0.0012, 0.027, 6),
    darkWoodMat,
  );
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0.0015, 0.016, -0.01);
  boom.rotation.y = -0.15;
  hullGroup.add(boom);

  // Pastel canvas mainsail + foresail jib + masthead pennant
  const sailColor = SAIL_PALETTES[variantIdx % SAIL_PALETTES.length];
  const sailMat = new THREE.MeshStandardMaterial({
    color: sailColor,
    roughness: 0.72,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Billowed multi-panel mainsail
  const mainSailGeo = new THREE.BufferGeometry();
  const mainVerts = new Float32Array([
    // Lower belly triangle
    0, 0.058, 0.003,
    0, 0.016, 0.003,
    0.0055, 0.032, -0.01,
    // Aft leach triangle
    0, 0.058, 0.003,
    0.0055, 0.032, -0.01,
    0.0038, 0.017, -0.023,
    // Foot triangle
    0, 0.016, 0.003,
    0.0038, 0.017, -0.023,
    0.0055, 0.032, -0.01,
  ]);
  mainSailGeo.setAttribute('position', new THREE.BufferAttribute(mainVerts, 3));
  mainSailGeo.computeVertexNormals();
  const mainSail = new THREE.Mesh(mainSailGeo, sailMat);
  mainSail.castShadow = true;
  hullGroup.add(mainSail);

  // Billowed jib foresail reaching out to the bowsprit
  const jibGeo = new THREE.BufferGeometry();
  const jibVerts = new Float32Array([
    0, 0.052, 0.004,
    0, 0.014, 0.031,
    -0.0038, 0.025, 0.012,
  ]);
  jibGeo.setAttribute('position', new THREE.BufferAttribute(jibVerts, 3));
  jibGeo.computeVertexNormals();
  const jibSail = new THREE.Mesh(jibGeo, trimMat);
  hullGroup.add(jibSail);

  // Tiny fluttering pennant flag at top of mast
  const pennant = new THREE.Mesh(
    new THREE.ConeGeometry(0.0025, 0.009, 4),
    sailMat,
  );
  pennant.rotation.x = -Math.PI / 2;
  pennant.position.set(0, 0.063, -0.0015);
  hullGroup.add(pennant);

  // Tiny brass bow lantern that glows warm amber at night
  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#fff4c2',
    emissive: new THREE.Color('#ffba42'),
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });
  const bowLantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0028, 0.0024, 0.0055, 6),
    lanternMat,
  );
  bowLantern.position.set(0, 0.015, 0.022);
  hullGroup.add(bowLantern);

  const lanternCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.0035, 0.0025, 6),
    darkWoodMat,
  );
  lanternCap.position.set(0, 0.0185, 0.022);
  hullGroup.add(lanternCap);

  group.add(hullGroup);
  return { group, hullGroup, lanternMat };
}

export function createSwanDuckFlockMesh(): {
  group: THREE.Group;
  rippleRings: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const rippleRings: THREE.Mesh[] = [];

  const whitePlumageMat = new THREE.MeshStandardMaterial({
    color: '#fdfbf7',
    roughness: 0.65,
    flatShading: true,
  });
  const wingFeatherMat = new THREE.MeshStandardMaterial({
    color: '#f4efe6',
    roughness: 0.68,
    flatShading: true,
  });
  const cygnetMat = new THREE.MeshStandardMaterial({
    color: '#f7eed7',
    roughness: 0.72,
    flatShading: true,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: '#f08324',
    roughness: 0.5,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#24201d',
    roughness: 0.4,
  });

  const buildWaterbird = (
    scale: number,
    offsetX: number,
    offsetZ: number,
    isSwan: boolean,
  ) => {
    const bird = new THREE.Group();
    bird.position.set(offsetX, 0, offsetZ);
    bird.scale.setScalar(scale);

    const bodyMat = isSwan ? whitePlumageMat : cygnetMat;

    // Sculpted buoyant torso
    const torso = new THREE.Mesh(
      new THREE.SphereGeometry(0.0078, 10, 8),
      bodyMat,
    );
    torso.scale.set(0.88, 0.68, 1.42);
    torso.position.set(0, 0.0045, -0.001);
    torso.castShadow = true;
    bird.add(torso);

    // Rounded breast puff at the front
    const breast = new THREE.Mesh(
      new THREE.SphereGeometry(0.0062, 8, 8),
      bodyMat,
    );
    breast.scale.set(0.92, 0.78, 1.05);
    breast.position.set(0, 0.0055, 0.0055);
    bird.add(breast);

    // Upturned tail feather fan at the rear
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.0045, 0.009, 6),
      bodyMat,
    );
    tail.position.set(0, 0.007, -0.0115);
    tail.rotation.x = -0.85;
    tail.scale.set(1.1, 1.0, 0.65);
    bird.add(tail);

    // Folded sculpted left & right wings along the flanks
    for (const side of [-1, 1]) {
      const wingGroup = new THREE.Group();
      wingGroup.position.set(side * 0.0058, 0.0068, -0.0015);
      wingGroup.rotation.y = side * 0.12;
      wingGroup.rotation.z = -side * 0.18;

      const mainWing = new THREE.Mesh(
        new THREE.SphereGeometry(0.0056, 8, 6),
        isSwan ? wingFeatherMat : bodyMat,
      );
      mainWing.scale.set(0.38, 0.65, 1.55);
      mainWing.castShadow = true;
      wingGroup.add(mainWing);

      // Secondary layered wing tip feather
      const wingTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.0032, 0.008, 5),
        bodyMat,
      );
      wingTip.rotation.x = -Math.PI / 2 + 0.25;
      wingTip.position.set(0, 0.0008, -0.0065);
      wingGroup.add(wingTip);

      bird.add(wingGroup);
    }

    // Graceful S-curved neck (3 articulated segments for swan, compact for duck)
    if (isSwan) {
      const neck1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0021, 0.0028, 0.0065, 8),
        bodyMat,
      );
      neck1.position.set(0, 0.0095, 0.0075);
      neck1.rotation.x = 0.35;
      bird.add(neck1);

      const neck2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0018, 0.0021, 0.0075, 8),
        bodyMat,
      );
      neck2.position.set(0, 0.0148, 0.0085);
      neck2.rotation.x = -0.12;
      bird.add(neck2);

      const neck3 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0017, 0.0018, 0.0045, 8),
        bodyMat,
      );
      neck3.position.set(0, 0.0192, 0.0082);
      neck3.rotation.x = 0.22;
      bird.add(neck3);
    } else {
      const duckNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0024, 0.0032, 0.0065, 8),
        bodyMat,
      );
      duckNeck.position.set(0, 0.0095, 0.0065);
      duckNeck.rotation.x = 0.18;
      bird.add(duckNeck);
    }

    const headY = isSwan ? 0.0215 : 0.0138;
    const headZ = isSwan ? 0.0092 : 0.0078;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.0034, 10, 10),
      bodyMat,
    );
    head.scale.set(0.92, 0.95, 1.15);
    head.position.set(0, headY, headZ);
    bird.add(head);

    // Glossy bead eyes on both sides of head
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.00075, 6, 6),
        darkMat,
      );
      eye.position.set(side * 0.0026, headY + 0.0006, headZ + 0.0015);
      bird.add(eye);
    }

    // Swan dark basal bill knob
    if (isSwan) {
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.0012, 6, 6),
        darkMat,
      );
      knob.position.set(0, headY + 0.0006, headZ + 0.0034);
      bird.add(knob);
    }

    // Sculpted waterfowl bill
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.0018, 0.0052, 6),
      beakMat,
    );
    beak.rotation.x = Math.PI / 2 + 0.08;
    beak.scale.set(1.15, 1.0, 0.68);
    beak.position.set(0, headY - 0.0005, headZ + 0.0052);
    bird.add(beak);

    // Underwater orange webbed feet paddles
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.0028, 0.0008, 0.0042),
        beakMat,
      );
      foot.position.set(side * 0.0032, 0.0008, -0.002);
      bird.add(foot);
    }

    // Expanding ripple ring on water surface
    const ringGeo = new THREE.RingGeometry(0.009, 0.0125, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.0015;
    bird.add(ring);
    rippleRings.push(ring);

    group.add(bird);
  };

  // Graceful mother swan leading two smaller cygnets/ducks in V-formation
  buildWaterbird(1.08, 0, 0.004, true);
  buildWaterbird(0.76, -0.012, -0.013, false);
  buildWaterbird(0.68, 0.011, -0.018, false);

  return { group, rippleRings };
}
