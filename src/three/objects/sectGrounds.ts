import * as THREE from 'three';
import type { PagodaSpec } from '../pagodaStyles';

// ---------------------------------------------------------------------------
// SECT HOME BASE: every Sect world starts with this pagoda
// ---------------------------------------------------------------------------

/**
 * The Sect terrace: a raised, paved stone platform that covers the locked Sect grounds.
 * Built as a curved cap that sits flush on the leveled ground (radius levelRadius),
 * centered on +Y, with a darker rim and a stone wall dropping to the land around it.
 */
export function createSectTerraceMesh(levelRadius: number, angularRadius: number): THREE.Group {
  const group = new THREE.Group();
  const sides = 12;

  const pavingMat = new THREE.MeshStandardMaterial({
    color: '#a39d92',
    roughness: 0.9,
    flatShading: true,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#86807a',
    roughness: 0.92,
    flatShading: true,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#6f6a64',
    roughness: 0.94,
    flatShading: true,
  });

  // The paving surface is exactly the level everything inside the grounds stands on
  const topRadius = levelRadius;
  const paving = new THREE.Mesh(
    new THREE.SphereGeometry(topRadius, sides, 3, 0, Math.PI * 2, 0, angularRadius * 0.9),
    pavingMat,
  );
  paving.receiveShadow = true;
  group.add(paving);

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(
      topRadius + 0.0006,
      sides,
      1,
      0,
      Math.PI * 2,
      angularRadius * 0.9,
      angularRadius * 0.1,
    ),
    rimMat,
  );
  rim.receiveShadow = true;
  group.add(rim);

  // Retaining wall from the terrace edge down into the surrounding land
  const wallDrop = 0.03;
  const topR = (topRadius + 0.0006) * Math.sin(angularRadius);
  const topY = (topRadius + 0.0006) * Math.cos(angularRadius);
  const bottomAngle = angularRadius * 1.04;
  const bottomR = (levelRadius - wallDrop) * Math.sin(bottomAngle);
  const bottomY = (levelRadius - wallDrop) * Math.cos(bottomAngle);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(topR, bottomR, topY - bottomY, sides, 1, true),
    wallMat,
  );
  wall.position.y = (topY + bottomY) / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  return group;
}

/** Eave tip sizes relative to the eave's rise, and how far each tip leans outward */
interface EaveTipShape {
  radius: number;
  length: number;
  lean: number;
}

const OCTAGON_TURN = Math.PI / 8;
/** Corner radius of an octagon whose flat sides sit `apothem` from its center */
function octagonCornerRadius(apothem: number) {
  return apothem / Math.cos(OCTAGON_TURN);
}

/**
 * Eave with flared, upturned corners, built around the origin: four-sided, or
 * eight-sided with a tip at every corner for octagonal pagodas.
 */
function createPagodaEave(
  width: number,
  depth: number,
  rise: number,
  tileMat: THREE.Material,
  trimMat: THREE.Material,
  tipShape: EaveTipShape,
  plan: PagodaSpec['plan'],
): THREE.Group {
  const eave = new THREE.Group();

  if (plan === 'octagon') {
    const cornerR = octagonCornerRadius(width * 0.5);

    // Sloped eight-sided roof with flat sides facing the walls
    const roofGeo = new THREE.CylinderGeometry(cornerR * 0.5, cornerR, rise, 8, 1);
    roofGeo.rotateY(OCTAGON_TURN);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.y = rise / 2;
    roof.castShadow = true;
    roof.receiveShadow = true;
    eave.add(roof);

    const fasciaGeo = new THREE.CylinderGeometry(cornerR, cornerR, rise * 0.14, 8, 1);
    fasciaGeo.rotateY(OCTAGON_TURN);
    const fascia = new THREE.Mesh(fasciaGeo, trimMat);
    fascia.position.y = rise * 0.04;
    eave.add(fascia);

    for (let corner = 0; corner < 8; corner++) {
      const angle = OCTAGON_TURN + (corner * Math.PI) / 4;
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(rise * tipShape.radius, rise * tipShape.length, 4),
        tileMat,
      );
      tip.position.set(Math.sin(angle) * cornerR, rise * 0.55, Math.cos(angle) * cornerR);
      // Lean outward along the corner's radial direction, still pointing up
      tip.quaternion.setFromAxisAngle(
        new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)),
        tipShape.lean,
      );
      tip.castShadow = true;
      eave.add(tip);
    }
    return eave;
  }

  // Sloped hip roof: a square frustum rotated so its flat sides face the walls
  const roofGeo = new THREE.CylinderGeometry(
    width * 0.36,
    width * 0.72,
    rise,
    4,
    1,
  );
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.scale(1, 1, depth / width);
  const roof = new THREE.Mesh(roofGeo, tileMat);
  roof.position.y = rise / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  eave.add(roof);

  // Thin fascia board along the eave's lower edge
  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.0, rise * 0.14, depth * 1.0),
    trimMat,
  );
  fascia.position.y = rise * 0.04;
  eave.add(fascia);

  // Upturned corner tips, the shape that reads as "pagoda" at a glance
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(rise * tipShape.radius, rise * tipShape.length, 4),
        tileMat,
      );
      tip.position.set(sx * width * 0.5, rise * 0.55, sz * depth * 0.5);
      // Lean each tip outward along its corner diagonal while keeping it pointed up
      tip.rotation.set(sz * tipShape.lean, 0, -sx * tipShape.lean);
      tip.castShadow = true;
      eave.add(tip);
    }
  }

  return eave;
}

/** The ornament crowning the top roof, standing on `y` */
function addPagodaFinial(
  group: THREE.Group,
  spec: PagodaSpec,
  y: number,
  trimMat: THREE.Material,
  windowMaterials: THREE.MeshStandardMaterial[],
) {
  const { palette } = spec;
  const glowMat = () =>
    new THREE.MeshStandardMaterial({
      color: palette.jewel,
      emissive: new THREE.Color(palette.jewelGlow),
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.25,
    });

  if (spec.finial === 'spire' || spec.finial === 'pearl') {
    // Stacked rings on a short base; the classic spire carries a jewel on a tall pole,
    // the imperial one a glowing dragon pearl held in a gold ring
    const spireBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.006, 0.006, 8),
      trimMat,
    );
    spireBase.position.y = y + 0.003;
    group.add(spireBase);

    for (let ring = 0; ring < 4; ring++) {
      const r = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0042 - ring * 0.0006, 0.0042 - ring * 0.0006, 0.0018, 8),
        trimMat,
      );
      r.position.y = y + 0.009 + ring * 0.0042;
      group.add(r);
    }

    if (spec.finial === 'spire') {
      const spirePole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0009, 0.0012, 0.024, 6),
        trimMat,
      );
      spirePole.position.y = y + 0.018;
      spirePole.castShadow = true;
      group.add(spirePole);

      const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.0034, 0), glowMat());
      jewel.position.y = y + 0.033;
      group.add(jewel);
      return;
    }

    const pearl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0052, 1), glowMat());
    pearl.position.y = y + 0.032;
    group.add(pearl);
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.0062, 0.0011, 6, 16), trimMat);
    cradle.position.y = y + 0.032;
    group.add(cradle);
    return;
  }

  if (spec.finial === 'lotus') {
    // An open lotus flower: two rings of pink petals around a softly glowing pearl
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0048, 0.006, 8), trimMat);
    base.position.y = y + 0.003;
    group.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.001, 0.008, 6), trimMat);
    stem.position.y = y + 0.01;
    group.add(stem);

    const outerPetalMat = new THREE.MeshStandardMaterial({
      color: palette.tile,
      roughness: 0.55,
      flatShading: true,
    });
    const innerPetalMat = new THREE.MeshStandardMaterial({
      color: palette.wall,
      roughness: 0.55,
      flatShading: true,
    });
    const flowerY = y + 0.016;
    const rings = [
      { count: 6, reach: 0.0034, tilt: 0.95, size: 1.0, mat: outerPetalMat, turn: 0 },
      { count: 5, reach: 0.0018, tilt: 0.45, size: 0.8, mat: innerPetalMat, turn: 0.4 },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const angle = ring.turn + (i / ring.count) * Math.PI * 2;
        const pivot = new THREE.Group();
        pivot.position.y = flowerY;
        pivot.rotation.y = angle;
        const petal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0034 * ring.size, 0), ring.mat);
        petal.scale.set(0.62, 1.25, 0.32);
        // Lean each petal outward from the flower's center
        petal.rotation.x = ring.tilt;
        petal.position.set(0, 0.0022 * ring.size, ring.reach);
        petal.castShadow = true;
        pivot.add(petal);
        group.add(pivot);
      }
    }
    const pearlMat = glowMat();
    windowMaterials.push(pearlMat);
    const pearl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0024, 1), pearlMat);
    pearl.position.y = flowerY + 0.0028;
    group.add(pearl);
    return;
  }

  if (spec.finial === 'moon') {
    // A silver crescent moon cradling a small glowing orb
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0014, 0.016, 6), trimMat);
    pole.position.y = y + 0.008;
    group.add(pole);
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.0075, 0.0015, 6, 18, Math.PI * 1.35),
      trimMat,
    );
    // Open side up, facing the front door
    crescent.rotation.z = -Math.PI / 2 - (Math.PI * 1.35) / 2;
    crescent.position.y = y + 0.024;
    crescent.castShadow = true;
    group.add(crescent);
    const orbMat = glowMat();
    windowMaterials.push(orbMat);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0034, 1), orbMat);
    orb.position.y = y + 0.024;
    group.add(orb);
    return;
  }

  // Blade: a tall black spike with a red jewel at its foot
  const bladeMat = new THREE.MeshStandardMaterial({
    color: palette.wall,
    metalness: 0.5,
    roughness: 0.3,
    flatShading: true,
  });
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.0034, 0.04, 4), bladeMat);
  blade.position.y = y + 0.022;
  blade.castShadow = true;
  group.add(blade);
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.0036, 0), glowMat());
  jewel.position.y = y + 0.004;
  group.add(jewel);
}

/**
 * The Sect's home pagoda, built from a style spec (see pagodaStyles.ts): a stone
 * platform with front stairs, a stack of tiers with pillars, glowing windows and
 * upturned eaves, and a finial on top. The front door faces +Z.
 */
export function createPagodaMesh(spec: PagodaSpec): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];
  const { palette } = spec;
  const octagon = spec.plan === 'octagon';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: palette.stone,
    roughness: 0.9,
    flatShading: true,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: palette.darkStone,
    roughness: 0.92,
    flatShading: true,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: palette.wall,
    roughness: 0.8,
    flatShading: true,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: palette.pillar,
    roughness: 0.6,
    flatShading: true,
  });
  const tileMat = new THREE.MeshStandardMaterial({
    color: palette.tile,
    roughness: 0.62,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    metalness: spec.trimFinish.metalness,
    roughness: spec.trimFinish.roughness,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: palette.door,
    roughness: 0.7,
  });

  // Two-step stone platform + front stairs
  const { low, high } = spec.platform;
  const platformLow = new THREE.Mesh(
    new THREE.BoxGeometry(low.size, low.height, low.size),
    darkStoneMat,
  );
  platformLow.position.y = low.y;
  platformLow.receiveShadow = true;
  platformLow.castShadow = true;
  group.add(platformLow);

  const platformHigh = new THREE.Mesh(
    new THREE.BoxGeometry(high.size, high.height, high.size),
    stoneMat,
  );
  platformHigh.position.y = high.y;
  platformHigh.receiveShadow = true;
  platformHigh.castShadow = true;
  group.add(platformHigh);

  const { stairs } = spec;
  for (let step = 0; step < stairs.count; step++) {
    const stair = new THREE.Mesh(
      new THREE.BoxGeometry(stairs.width, 0.006, 0.01),
      step % 2 === 0 ? stoneMat : darkStoneMat,
    );
    stair.position.set(0, stairs.y0 + step * stairs.dy, stairs.z0 - step * stairs.dz);
    group.add(stair);
  }

  // Tiers, each narrower than the one below
  let y = spec.tierBaseY;
  const eaveLevels: { y: number; width: number }[] = [];
  spec.tiers.forEach((tier, tierIdx) => {
    const cornerR = octagonCornerRadius(tier.width / 2);
    let bodyGeo: THREE.BufferGeometry;
    if (octagon) {
      bodyGeo = new THREE.CylinderGeometry(cornerR, cornerR, tier.height, 8, 1);
      bodyGeo.rotateY(OCTAGON_TURN);
    } else {
      bodyGeo = new THREE.BoxGeometry(tier.width, tier.height, tier.width);
    }
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = y + tier.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Corner pillars
    const pillarSpots: [number, number][] = [];
    if (octagon) {
      for (let corner = 0; corner < 8; corner++) {
        const angle = OCTAGON_TURN + (corner * Math.PI) / 4;
        pillarSpots.push([Math.sin(angle) * cornerR, Math.cos(angle) * cornerR]);
      }
    } else {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          pillarSpots.push([sx * tier.width * 0.5, sz * tier.width * 0.5]);
        }
      }
    }
    for (const [px, pz] of pillarSpots) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.0055, tier.height, 0.0055),
        pillarMat,
      );
      pillar.position.set(px, y + tier.height / 2, pz);
      pillar.castShadow = true;
      group.add(pillar);
    }

    // Lintel band under the eave
    let lintelGeo: THREE.BufferGeometry;
    if (octagon) {
      const lintelR = octagonCornerRadius(tier.width / 2 + 0.002);
      lintelGeo = new THREE.CylinderGeometry(lintelR, lintelR, 0.004, 8, 1);
      lintelGeo.rotateY(OCTAGON_TURN);
    } else {
      lintelGeo = new THREE.BoxGeometry(tier.width + 0.004, 0.004, tier.width + 0.004);
    }
    const lintel = new THREE.Mesh(lintelGeo, pillarMat);
    lintel.position.y = y + tier.height - 0.002;
    group.add(lintel);

    // Glowing lattice windows on all four faces (doorway replaces the front one on the ground tier)
    const winMat = new THREE.MeshStandardMaterial({
      color: palette.window,
      emissive: new THREE.Color(palette.windowGlow),
      emissiveIntensity: 0.25,
      roughness: 0.4,
    });
    windowMaterials.push(winMat);
    const winW = tier.width * 0.34;
    const winH = tier.height * 0.42;
    for (let face = 0; face < 4; face++) {
      if (tierIdx === 0 && face === 0) continue;
      const angle = (face * Math.PI) / 2;
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(winW, winH, 0.002),
        winMat,
      );
      const r = tier.width / 2 + 0.0008;
      win.position.set(
        Math.sin(angle) * r,
        y + tier.height * 0.52,
        Math.cos(angle) * r,
      );
      win.rotation.y = angle;
      group.add(win);
    }

    if (tierIdx === 0) {
      // Grand front doorway with a plaque above it
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.026, 0.003),
        doorMat,
      );
      door.position.set(0, y + 0.013, tier.width / 2 + 0.001);
      group.add(door);

      const doorGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.0016, 0.022, 0.0034),
        winMat,
      );
      doorGlow.position.set(0, y + 0.013, tier.width / 2 + 0.0012);
      group.add(doorGlow);

      const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.006, 0.002),
        goldMat,
      );
      plaque.position.set(0, y + 0.03, tier.width / 2 + 0.002);
      group.add(plaque);
    }

    y += tier.height;
    const eave = createPagodaEave(
      tier.eaveWidth,
      tier.eaveWidth,
      tier.eaveRise,
      tileMat,
      goldMat,
      spec.eaveTip,
      spec.plan,
    );
    eave.position.y = y;
    group.add(eave);
    eaveLevels.push({ y, width: tier.eaveWidth });
    y += tier.eaveRise * 0.8;
  });

  addPagodaFinial(group, spec, y, goldMat, windowMaterials);

  // Paper lanterns hanging from the lowest eave's corners, lit at night like the windows
  const lowestEave = eaveLevels[0];
  if (spec.hangingLanterns && lowestEave) {
    const lanternMat = new THREE.MeshStandardMaterial({
      color: palette.window,
      emissive: new THREE.Color(palette.windowGlow),
      emissiveIntensity: 0.25,
      roughness: 0.5,
    });
    windowMaterials.push(lanternMat);
    const reach = lowestEave.width * 0.42;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cord = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.006, 0.0006), goldMat);
        cord.position.set(sx * reach, lowestEave.y - 0.003, sz * reach);
        group.add(cord);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0075, 8), lanternMat);
        lantern.position.set(sx * reach, lowestEave.y - 0.0095, sz * reach);
        group.add(lantern);
      }
    }
  }

  return { group, windowMaterials };
}
