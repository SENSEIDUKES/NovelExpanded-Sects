import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlanetTerrain } from '../src/three/PlanetTerrain';

function runSectZoneTests() {
  const terrain = createPlanetTerrain();
  const home = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
  const zoneAngle = 0.17;

  const level = terrain.lockFlatZone(home, zoneAngle, 0.3);
  assert.ok(level > terrain.seaLevel, 'The Sect grounds must sit above the water');

  // Sample spots across the grounds: all report the paving level and point straight up
  const tangentA = new THREE.Vector3().crossVectors(home, new THREE.Vector3(0, 1, 0)).normalize();
  const tangentB = new THREE.Vector3().crossVectors(home, tangentA).normalize();
  const samples: THREE.Vector3[] = [];
  for (let ring = 0; ring <= 3; ring++) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const off = Math.tan((ring / 3) * zoneAngle * 0.97);
      samples.push(
        home
          .clone()
          .addScaledVector(tangentA, Math.cos(a) * off)
          .addScaledVector(tangentB, Math.sin(a) * off)
          .normalize(),
      );
    }
  }
  const checkFlat = (why: string) => {
    for (const d of samples) {
      const surf = terrain.getSurfacePointAndNormal(d);
      assert.ok(Math.abs(surf.radius - level) < 1e-9, `${why}: height is the paving level`);
      assert.ok(surf.normal.dot(d) > 0.9999, `${why}: ground is flat`);
      assert.equal(surf.isWater, false, `${why}: no water on the grounds`);
    }
  };
  checkFlat('After leveling');

  // The real terrain under the grounds stays tucked just below the paving
  const covered = terrain.uniqueVertices.filter((v) => v.jitteredDir.angleTo(home) <= zoneAngle);
  assert.ok(covered.length >= 1, 'The grounds cover terrain vertices');
  const tuckedBefore = covered.map((v) => v.radius);
  for (const r of tuckedBefore) {
    assert.ok(r < level && r > level - 0.01, 'Terrain under the paving sits just below it');
  }

  // Sculpting right on top of the grounds, or beside them, must not move them
  terrain.sculptAtDirection(home, 'mountain');
  terrain.sculptAtDirection(home, 'lake');
  const beside = home
    .clone()
    .add(new THREE.Vector3(0.2, 0, 0))
    .normalize();
  terrain.sculptAtDirection(beside, 'raise');
  covered.forEach((v, i) => {
    assert.equal(v.radius, tuckedBefore[i], 'Sculpting must never reshape the locked Sect grounds');
  });
  checkFlat('After sculpting nearby');

  console.log('✓ All Sect zone tests passed.');
}

runSectZoneTests();
