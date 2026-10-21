import * as THREE from 'three';
import { UP_VEC, WorldContext } from './context';
import type { DiscipleSystem } from './DiscipleSystem';
import type { PlacementSystem } from './PlacementSystem';
import { getBuildingEntranceDir } from './spatial';
import type { WeatherSystem } from './WeatherSystem';

/** What every new Sect world starts with: the pagoda, its lanterns, trees, disciples and clouds */
export function populateInitialWorld(
  ctx: WorldContext,
  placement: PlacementSystem,
  disciples: DiscipleSystem,
  weather: WeatherSystem,
) {
  const { terrain, homeBaseDirection } = ctx;

  // Every Sect world starts with its home-base pagoda, facing the default camera
  const pagoda = placement.placeStaticObject('pagoda', homeBaseDirection, 0, false, false);

  // The terrace is the paving, so the approach needs no stepping stones
  const frontDir = getBuildingEntranceDir(terrain, pagoda, 0);

  // A pair of stone lanterns flanking the approach
  const right = new THREE.Vector3()
    .crossVectors(UP_VEC, homeBaseDirection)
    .normalize();
  for (const side of [-1, 1]) {
    const lanternDir = frontDir
      .clone()
      .addScaledVector(right, side * 0.034)
      .normalize();
    placement.placeStaticObject('lantern', lanternDir, 0, true, false);
  }

  // Pines framing the pagoda, a few more on the ridges
  const pineDirs = [
    new THREE.Vector3(-0.30, 0.32, 0.90).normalize(),
    new THREE.Vector3(0.0, 0.36, 0.93).normalize(),
    new THREE.Vector3(-0.36, 0.14, 0.92).normalize(),
    new THREE.Vector3(0.05, 0.78, 0.62).normalize(),
    new THREE.Vector3(-0.18, 0.82, 0.54).normalize(),
    new THREE.Vector3(0.28, 0.79, 0.54).normalize(),
    new THREE.Vector3(0.35, 0.84, -0.41).normalize(),
    new THREE.Vector3(-0.42, 0.74, 0.52).normalize(),
  ];
  pineDirs.forEach((d, i) => {
    placement.placeStaticObject('pine', d, i * 2.1, true, false);
  });

  // Rounded trees scattered across the rest of the world
  const oakDirs = [
    new THREE.Vector3(-0.66, 0.18, 0.73).normalize(),
    new THREE.Vector3(-0.58, -0.28, 0.76).normalize(),
    new THREE.Vector3(0.45, 0.58, -0.68).normalize(),
    new THREE.Vector3(-0.86, -0.18, 0.48).normalize(),
    new THREE.Vector3(0.22, -0.62, -0.75).normalize(),
  ];
  oakDirs.forEach((d, i) => {
    placement.placeStaticObject('oak', d, i * 1.7, true, false);
  });

  const flowerDirs = [
    new THREE.Vector3(-0.30, 0.20, 0.93).normalize(),
    new THREE.Vector3(0.02, 0.18, 0.98).normalize(),
  ];
  flowerDirs.forEach((d, i) => {
    placement.placeStaticObject('flower', d, i * 0.9, true, false);
  });

  // A handful of disciples coming and going from the pagoda
  for (let i = 0; i < 4; i++) {
    const lateral = (i - 1.5) * 0.014;
    disciples.spawn(getBuildingEntranceDir(terrain, pagoda, lateral), false);
  }

  const cloudDirs = [
    new THREE.Vector3(-0.28, 0.38, 0.88).normalize(),
    new THREE.Vector3(0.68, 0.25, -0.68).normalize(),
  ];
  cloudDirs.forEach((d, idx) => {
    weather.spawnCloud(d, false, idx === 0 ? 3.5 : 8.0 + idx * 4.0, false);
  });
}
