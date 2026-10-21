import * as THREE from 'three';

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

/** Four-sided eave with flared, upturned corners, built around the origin. */
function createPagodaEave(
  width: number,
  depth: number,
  rise: number,
  tileMat: THREE.Material,
  trimMat: THREE.Material,
): THREE.Group {
  const eave = new THREE.Group();

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

  // Thin gold fascia board along the eave's lower edge
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
        new THREE.ConeGeometry(rise * 0.32, rise * 1.5, 4),
        tileMat,
      );
      tip.position.set(sx * width * 0.5, rise * 0.55, sz * depth * 0.5);
      // Lean each tip outward along its corner diagonal while keeping it pointed up
      tip.rotation.set(sz * 0.5, 0, -sx * 0.5);
      tip.castShadow = true;
      eave.add(tip);
    }
  }

  return eave;
}

export function createPagodaMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
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
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#efe3cc',
    roughness: 0.8,
    flatShading: true,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: '#a5342a',
    roughness: 0.6,
    flatShading: true,
  });
  const tileMat = new THREE.MeshStandardMaterial({
    color: '#2f4b4c',
    roughness: 0.62,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#d6ad55',
    metalness: 0.6,
    roughness: 0.32,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: '#5e1d17',
    roughness: 0.7,
  });

  // Two-step stone platform + front stairs
  const platformLow = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.014, 0.13),
    darkStoneMat,
  );
  platformLow.position.y = 0.0;
  platformLow.receiveShadow = true;
  platformLow.castShadow = true;
  group.add(platformLow);

  const platformHigh = new THREE.Mesh(
    new THREE.BoxGeometry(0.112, 0.012, 0.112),
    stoneMat,
  );
  platformHigh.position.y = 0.012;
  platformHigh.receiveShadow = true;
  platformHigh.castShadow = true;
  group.add(platformHigh);

  for (let step = 0; step < 3; step++) {
    const stair = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.006, 0.01),
      step % 2 === 0 ? stoneMat : darkStoneMat,
    );
    stair.position.set(0, 0.004 + step * 0.0055, 0.07 - step * 0.006);
    group.add(stair);
  }

  // Three tiers, each narrower than the one below
  const tiers = [
    { width: 0.074, height: 0.034, eaveWidth: 0.112, eaveRise: 0.014 },
    { width: 0.058, height: 0.026, eaveWidth: 0.09, eaveRise: 0.012 },
    { width: 0.044, height: 0.022, eaveWidth: 0.07, eaveRise: 0.011 },
  ];

  let y = 0.018;
  tiers.forEach((tier, tierIdx) => {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(tier.width, tier.height, tier.width),
      wallMat,
    );
    body.position.y = y + tier.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Vermilion corner pillars
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.0055, tier.height, 0.0055),
          pillarMat,
        );
        pillar.position.set(
          sx * tier.width * 0.5,
          y + tier.height / 2,
          sz * tier.width * 0.5,
        );
        pillar.castShadow = true;
        group.add(pillar);
      }
    }

    // Vermilion lintel band under the eave
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(tier.width + 0.004, 0.004, tier.width + 0.004),
      pillarMat,
    );
    lintel.position.y = y + tier.height - 0.002;
    group.add(lintel);

    // Glowing lattice windows on all four faces (doorway replaces the front one on the ground tier)
    const winMat = new THREE.MeshStandardMaterial({
      color: '#ffe9b8',
      emissive: new THREE.Color('#ffae38'),
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
      // Grand front doorway with a gold plaque above it
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
    );
    eave.position.y = y;
    group.add(eave);
    y += tier.eaveRise * 0.8;
  });

  // Gold spire finial: stacked rings topped by a jewel
  const spireBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.006, 0.006, 8),
    goldMat,
  );
  spireBase.position.y = y + 0.003;
  group.add(spireBase);

  for (let ring = 0; ring < 4; ring++) {
    const r = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0042 - ring * 0.0006, 0.0042 - ring * 0.0006, 0.0018, 8),
      goldMat,
    );
    r.position.y = y + 0.009 + ring * 0.0042;
    group.add(r);
  }

  const spirePole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0009, 0.0012, 0.024, 6),
    goldMat,
  );
  spirePole.position.y = y + 0.018;
  spirePole.castShadow = true;
  group.add(spirePole);

  const jewel = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.0034, 0),
    new THREE.MeshStandardMaterial({
      color: '#f4dd8a',
      emissive: new THREE.Color('#ffcf5c'),
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.25,
    }),
  );
  jewel.position.y = y + 0.033;
  group.add(jewel);

  return { group, windowMaterials };
}
