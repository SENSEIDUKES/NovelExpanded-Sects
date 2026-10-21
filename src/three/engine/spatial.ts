import * as THREE from 'three';
import type { PlacedObjectEntity, PlacedObjectType } from '../MiniatureObjects';
import type { PlanetTerrainHandles } from '../PlanetTerrain';
import { UP_VEC, WorldContext } from './context';

/**
 * Surface geometry shared by placement, inhabitants and the tour: standing things on the
 * planet, object footprints, doorways, and whether a spot is free to walk or build on.
 */

export function getObjectCollisionRadius(type: PlacedObjectType): number {
  switch (type) {
    case 'pagoda':
      return 0.078;
    case 'house':
      return 0.054;
    case 'windmill':
      return 0.056;
    case 'lighthouse':
      return 0.056;
    case 'watchtower':
      return 0.054;
    case 'well':
      return 0.035;
    case 'campfire':
      return 0.032;
    case 'beehive':
      return 0.025;
    case 'oak':
      return 0.022;
    case 'pine':
      return 0.019;
    case 'palm':
      return 0.019;
    case 'lantern':
      return 0.011;
    default:
      return 0;
  }
}

export function orientObjectOnSurface(
  terrain: PlanetTerrainHandles,
  obj: THREE.Object3D,
  dir: THREE.Vector3,
  yaw: number,
  normalOffset = 0,
  stickToSeaLevel = false,
  useRadialUp = false,
) {
  const surface = terrain.getSurfacePointAndNormal(dir);
  const normDir = dir.clone().normalize();
  const basePoint = stickToSeaLevel
    ? normDir.clone().multiplyScalar(terrain.seaLevel)
    : surface.point;
  const upNormal = stickToSeaLevel || useRadialUp ? normDir : surface.normal;

  const pos = basePoint.clone().addScaledVector(upNormal, normalOffset);
  obj.position.copy(pos);

  const alignQuat = new THREE.Quaternion().setFromUnitVectors(UP_VEC, upNormal);
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, yaw);
  obj.quaternion.copy(alignQuat).multiply(yawQuat);
}

/** How a placed object of this type stands: docks float at sea level, tall builds stand radially */
export function orientPlacedObject(
  terrain: PlanetTerrainHandles,
  type: PlacedObjectType,
  mesh: THREE.Object3D,
  dir: THREE.Vector3,
  yaw: number,
) {
  const stickToSea = type === 'dock' || type === 'bridge';
  const useRadialUp = stickToSea || type === 'lighthouse' || type === 'pagoda';
  orientObjectOnSurface(terrain, mesh, dir, yaw, 0, stickToSea, useRadialUp);
}

/** Re-seat every placed object after the terrain under it changed */
export function realignAllObjectsToTerrain(ctx: WorldContext) {
  for (const obj of ctx.entities.placedObjects) {
    orientPlacedObject(ctx.terrain, obj.type, obj.mesh, obj.dir, obj.yaw);
  }
}

export function computeYawFacingTarget(
  terrain: PlanetTerrainHandles,
  dir: THREE.Vector3,
  targetDir: THREE.Vector3,
): number {
  const surface = terrain.getSurfacePointAndNormal(dir);
  const tangent = targetDir
    .clone()
    .sub(dir)
    .projectOnPlane(surface.normal)
    .normalize();
  if (tangent.lengthSq() < 1e-6) return 0;
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(
    UP_VEC,
    surface.normal,
  );
  const localTangent = tangent
    .clone()
    .applyQuaternion(alignQuat.clone().invert());
  return Math.atan2(localTangent.x, localTangent.z);
}

export function getBuildingEntranceDir(
  terrain: PlanetTerrainHandles,
  obj: PlacedObjectEntity,
  lateralOffset = 0,
): THREE.Vector3 {
  const surface = terrain.getSurfacePointAndNormal(obj.dir);
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(
    UP_VEC,
    surface.normal,
  );
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, obj.yaw);
  const fullQuat = alignQuat.multiply(yawQuat);

  if (obj.type === 'dock' || obj.type === 'bridge') {
    // Approach the landward end of the dock or bridge
    const reach = obj.type === 'dock' ? 0.068 : 0.038;
    const axisZ = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(fullQuat)
      .normalize();
    const endA = obj.dir.clone().addScaledVector(axisZ, -reach).normalize();
    const endB = obj.dir.clone().addScaledVector(axisZ, reach).normalize();
    const surfA = terrain.getSurfacePointAndNormal(endA);
    return !surfA.isWater ? endA : endB;
  }

  const frontTangent = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(fullQuat)
    .normalize();
  const rightTangent = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(fullQuat)
    .normalize();
  const clearance = getObjectCollisionRadius(obj.type) + 0.022;

  const candidate = obj.dir
    .clone()
    .addScaledVector(frontTangent, clearance)
    .addScaledVector(rightTangent, lateralOffset)
    .normalize();

  // Ensure the entrance point itself isn't underwater
  const candSurf = terrain.getSurfacePointAndNormal(candidate);
  if (!candSurf.isWater) {
    return candidate;
  }
  return obj.dir
    .clone()
    .addScaledVector(frontTangent, -clearance)
    .normalize();
}

export function getFenceSegmentOnSphere(
  terrain: PlanetTerrainHandles,
  fenceObj: PlacedObjectEntity,
): {
  segA: THREE.Vector3;
  segB: THREE.Vector3;
  railAxis: THREE.Vector3;
} {
  const surface = terrain.getSurfacePointAndNormal(fenceObj.dir);
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(
    UP_VEC,
    surface.normal,
  );
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(
    UP_VEC,
    fenceObj.yaw,
  );
  const fullQuat = alignQuat.multiply(yawQuat);
  const railAxis = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(fullQuat)
    .normalize();
  const halfSpan = 0.035;
  const segA = fenceObj.dir
    .clone()
    .addScaledVector(railAxis, -halfSpan)
    .normalize();
  const segB = fenceObj.dir
    .clone()
    .addScaledVector(railAxis, halfSpan)
    .normalize();
  return { segA, segB, railAxis };
}

export function closestPointOnSphereSegment(
  pt: THREE.Vector3,
  segA: THREE.Vector3,
  segB: THREE.Vector3,
): THREE.Vector3 {
  const ab = segB.clone().sub(segA);
  const lenSq = ab.lengthSq();
  if (lenSq < 1e-8) return segA.clone();
  const ap = pt.clone().sub(segA);
  const t = THREE.MathUtils.clamp(ap.dot(ab) / lenSq, 0, 1);
  return segA.clone().addScaledVector(ab, t).normalize();
}

export function getRainbowFootDirs(
  terrain: PlanetTerrainHandles,
  dir: THREE.Vector3,
  yaw: number,
): [THREE.Vector3, THREE.Vector3] {
  const surface = terrain.getSurfacePointAndNormal(dir);
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(
    UP_VEC,
    surface.normal,
  );
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, yaw);
  const fullQuat = alignQuat.multiply(yawQuat);
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(fullQuat);
  const footA = surface.point.clone().addScaledVector(xAxis, -0.058).normalize();
  const footB = surface.point.clone().addScaledVector(xAxis, 0.058).normalize();
  return [footA, footB];
}

export function findCollisionFreeRainbowYaw(ctx: WorldContext, dir: THREE.Vector3): number {
  let bestYaw = -0.25;
  let bestScore = -999;
  const surf = ctx.terrain.getSurfacePointAndNormal(dir);
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(
    UP_VEC,
    surf.normal,
  );

  for (let step = 0; step < 24; step++) {
    const candidateYaw = (step / 24) * Math.PI;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, candidateYaw);
    const q = alignQuat.clone().multiply(yawQuat);
    let minClear = 999;

    for (let aStep = 0; aStep <= 8; aStep++) {
      const a = (aStep / 8) * Math.PI;
      const lx = Math.cos(a) * 0.068;
      const ly = 0.016 + Math.sin(a) * 0.068;
      const pt = new THREE.Vector3(lx, ly, 0).applyQuaternion(q).add(surf.point);
      const ptDir = pt.clone().normalize();

      for (const obj of ctx.entities.placedObjects) {
        const r = getObjectCollisionRadius(obj.type);
        if (r <= 0) continue;
        const d = ptDir.distanceTo(obj.dir) * 0.75 - (r + 0.024);
        if (d < minClear) minClear = d;
      }
    }

    if (minClear > bestScore) {
      bestScore = minClear;
      bestYaw = candidateYaw;
    }
  }
  return bestYaw;
}

export function isPositionClearOfObstacles(
  ctx: WorldContext,
  dir: THREE.Vector3,
  extraMargin = 0.012,
  allowInsidePasture = false,
): boolean {
  const { terrain, pasture } = ctx;
  const surf = terrain.getSurfacePointAndNormal(dir);
  if (surf.isWater || surf.isMountain) return false;
  if (surf.normal.dot(dir) < 0.75) return false;

  if (
    !allowInsidePasture &&
    pasture.enabled &&
    dir.distanceTo(pasture.center) < pasture.radius + extraMargin
  ) {
    return false;
  }

  for (const obj of ctx.entities.placedObjects) {
    if (obj.type === 'fence') {
      const { segA, segB } = getFenceSegmentOnSphere(terrain, obj);
      const closest = closestPointOnSphereSegment(dir, segA, segB);
      if (dir.distanceTo(closest) < 0.015 + extraMargin) {
        return false;
      }
      continue;
    }
    if (obj.type === 'rainbow') {
      const [footA, footB] = getRainbowFootDirs(terrain, obj.dir, obj.yaw);
      if (
        dir.distanceTo(footA) < 0.026 + extraMargin ||
        dir.distanceTo(footB) < 0.026 + extraMargin
      ) {
        return false;
      }
      continue;
    }
    const r = getObjectCollisionRadius(obj.type);
    if (r > 0 && dir.distanceTo(obj.dir) < r + extraMargin) {
      return false;
    }
  }
  return true;
}

/** Docks and bridges, which walkers can cross water on and boats steer around */
export function getBridgesAndDocks(ctx: WorldContext): PlacedObjectEntity[] {
  return ctx.entities.placedObjects.filter(
    (o) => o.type === 'bridge' || o.type === 'dock',
  );
}

/** A water spot near `fromDir` for boats and ducks to head toward */
export function pickRandomWaterTarget(
  terrain: PlanetTerrainHandles,
  fromDir: THREE.Vector3,
): THREE.Vector3 {
  for (let attempt = 0; attempt < 24; attempt++) {
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.36,
      (Math.random() - 0.5) * 0.36,
      (Math.random() - 0.5) * 0.36,
    );
    const candidate = fromDir.clone().add(offset).normalize();
    const surf = terrain.getSurfacePointAndNormal(candidate);
    if (surf.isWater) {
      return candidate;
    }
  }
  return terrain.findNearestWaterDirection(fromDir, 0.8) || fromDir.clone();
}
