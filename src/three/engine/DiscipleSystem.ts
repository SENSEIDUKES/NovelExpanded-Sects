import * as THREE from 'three';
import {
  createVillagerMesh,
  PlacedObjectEntity,
  VillagerEntity,
} from '../MiniatureObjects';
import { UP_VEC, WorldContext } from './context';
import type { DayNightSystem } from './DayNightSystem';
import {
  closestPointOnSphereSegment,
  getBuildingEntranceDir,
  getFenceSegmentOnSphere,
  getObjectCollisionRadius,
  getRainbowFootDirs,
  isPositionClearOfObstacles,
  orientObjectOnSurface,
} from './spatial';

const VILLAGER_RADIUS = 0.012;

/**
 * Disciples: spawning, choosing where to walk (the pagoda grounds, buildings, campfires
 * at night), steering around obstacles, and never walking through buildings or water.
 */
export class DiscipleSystem {
  private villagerCounter = 0;

  constructor(
    private ctx: WorldContext,
    private dayNight: DayNightSystem,
  ) {}

  private get villagers() {
    return this.ctx.entities.villagers;
  }

  spawn(dir: THREE.Vector3, withSparkles = true): VillagerEntity {
    const { terrain } = this.ctx;
    const normDir = dir.clone().normalize();
    const vIdx = this.villagerCounter++;
    const { group, bodyMesh, headGroup, leftLeg, rightLeg, leftArm, rightArm } =
      createVillagerMesh(vIdx);
    const yaw = Math.random() * Math.PI * 2;
    orientObjectOnSurface(terrain, group, normDir, yaw);
    this.ctx.groups.inhabitants.add(group);

    const headingToWell = vIdx % 4 === 0;
    const targetDir = this.pickNextTarget(headingToWell, normDir);
    const entity: VillagerEntity = {
      id: `villager_${Date.now()}_${Math.random()}`,
      mesh: group,
      bodyMesh,
      headGroup,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      dir: normDir,
      targetDir,
      speed: 0.082 + Math.random() * 0.032,
      walkPhase: Math.random() * Math.PI * 2,
      pauseTimer: Math.random() * 1.2,
      headingToWell,
      bounceTime: withSparkles ? 0.0 : 10.0,
      yaw,
      stuckTimer: 0,
      steerSign: vIdx % 2 === 0 ? 1 : -1,
    };

    // Immediately resolve any spawn overlap with buildings or fences
    this.resolveCollisions(entity, []);
    orientObjectOnSurface(terrain, entity.mesh, entity.dir, entity.yaw);

    if (withSparkles) {
      this.ctx.emitSparkles(entity.dir, '#ffd180');
    }

    this.villagers.push(entity);
    return entity;
  }

  private sampleClearRingAroundHub(
    hubDir: THREE.Vector3,
    minRingRadius: number,
    maxRingRadius: number,
  ): THREE.Vector3 | null {
    const refUp = Math.abs(hubDir.y) < 0.9 ? UP_VEC : new THREE.Vector3(1, 0, 0);
    const ringRight = new THREE.Vector3().crossVectors(refUp, hubDir).normalize();
    const ringUp = new THREE.Vector3().crossVectors(hubDir, ringRight).normalize();

    for (let attempt = 0; attempt < 14; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r =
        minRingRadius + Math.random() * Math.max(0.005, maxRingRadius - minRingRadius);
      const candidate = hubDir
        .clone()
        .addScaledVector(ringRight, Math.cos(angle) * r)
        .addScaledVector(ringUp, Math.sin(angle) * r)
        .normalize();
      if (isPositionClearOfObstacles(this.ctx, candidate, 0.018)) {
        return candidate;
      }
    }
    return null;
  }

  pickNextTarget(
    headingToSocialHub: boolean,
    fromDir?: THREE.Vector3,
  ): THREE.Vector3 {
    const { terrain, homeBaseDirection } = this.ctx;
    const placedObjects = this.ctx.entities.placedObjects;
    const isEveningOrNight = this.dayNight.isEveningOrNight;
    const campfires = placedObjects.filter((o) => o.type === 'campfire');

    // Count how many villagers are already near or heading toward the stone well
    const wellVisitorCount = this.villagers.filter(
      (v) =>
        v.dir.distanceTo(homeBaseDirection) < 0.14 ||
        v.targetDir.distanceTo(homeBaseDirection) < 0.14,
    ).length;

    if (headingToSocialHub) {
      // 1. At dusk and night, villagers gather around the outside ring of cozy campfires
      if (isEveningOrNight && campfires.length > 0 && Math.random() < 0.75) {
        const sortedFires = fromDir
          ? [...campfires].sort(
              (a, b) => a.dir.distanceTo(fromDir) - b.dir.distanceTo(fromDir),
            )
          : campfires;
        const cf = sortedFires[0];
        const baseR = getObjectCollisionRadius('campfire');
        const spot = this.sampleClearRingAroundHub(cf.dir, baseR + 0.026, baseR + 0.044);
        if (spot) return spot;
      }

      // 2. Only allow at most 2 villagers at a time to head to the Stone Well, and only if reasonably nearby
      const nearWellHemisphere = !fromDir || fromDir.distanceTo(homeBaseDirection) < 0.85;
      if (wellVisitorCount < 2 && nearWellHemisphere && Math.random() < 0.45) {
        const wellBaseR = getObjectCollisionRadius('pagoda');
        const wellSpot = this.sampleClearRingAroundHub(
          homeBaseDirection,
          wellBaseR + 0.028,
          wellBaseR + 0.048,
        );
        if (wellSpot) return wellSpot;
      }

      // 3. Otherwise visit one of the other scenic community landmarks across the globe
      const communityHubs = placedObjects.filter(
        (o) =>
          o.type === 'campfire' ||
          o.type === 'windmill' ||
          o.type === 'watchtower' ||
          o.type === 'beehive' ||
          o.type === 'dock',
      );
      if (communityHubs.length > 0) {
        const filteredHubs = fromDir
          ? communityHubs.filter((h) => h.dir.distanceTo(fromDir) > 0.08)
          : communityHubs;
        const pool = filteredHubs.length > 0 ? filteredHubs : communityHubs;
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        if (
          chosen.type === 'windmill' ||
          chosen.type === 'watchtower' ||
          chosen.type === 'dock'
        ) {
          return getBuildingEntranceDir(
            terrain,
            chosen,
            (Math.random() - 0.5) * 0.022,
          );
        }
        const hubR = getObjectCollisionRadius(chosen.type);
        const hubSpot = this.sampleClearRingAroundHub(
          chosen.dir,
          hubR + 0.026,
          hubR + 0.044,
        );
        if (hubSpot) return hubSpot;
      }
    }

    // Sect worlds start sparse, so residents often just stroll the grounds around the pagoda
    if (Math.random() < 0.5) {
      const wanderSpot = this.sampleWanderSpotNearHome();
      if (wanderSpot) return wanderSpot;
    }

    // Visit a cottage, watchtower, windmill, or dock around the globe
    const destinations = placedObjects.filter(
      (o) =>
        o.type === 'pagoda' ||
        o.type === 'house' ||
        o.type === 'watchtower' ||
        o.type === 'windmill' ||
        o.type === 'dock',
    );
    if (destinations.length > 0) {
      // Exclude the building the villager is currently standing right in front of
      const candidates = fromDir
        ? destinations.filter((d) => d.dir.distanceTo(fromDir) > 0.09)
        : destinations;
      const pool = candidates.length > 0 ? candidates : destinations;

      // 70% of the time pick one of the 4 closest destinations in the villager's region; 30% trek across the globe
      let chosen: PlacedObjectEntity;
      if (fromDir && Math.random() < 0.7 && pool.length > 4) {
        const sorted = [...pool].sort(
          (a, b) => a.dir.distanceTo(fromDir) - b.dir.distanceTo(fromDir),
        );
        const localSlice = sorted.slice(0, 4);
        chosen = localSlice[Math.floor(Math.random() * localSlice.length)];
      } else {
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }

      const lateral = (Math.random() - 0.5) * 0.022;
      // Target the front door threshold / porch outside the building, NEVER the building center!
      return getBuildingEntranceDir(terrain, chosen, lateral);
    }

    const wanderSpot = this.sampleWanderSpotNearHome();
    if (wanderSpot) return wanderSpot;
    return homeBaseDirection
      .clone()
      .add(new THREE.Vector3(0, 0.068, 0))
      .normalize();
  }

  private sampleWanderSpotNearHome(): THREE.Vector3 | null {
    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = this.ctx.homeBaseDirection
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.34,
            (Math.random() - 0.5) * 0.34,
            0,
          ),
        )
        .normalize();
      if (isPositionClearOfObstacles(this.ctx, candidate, 0.014)) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Walk every disciple a step: pause, pick a new destination, or steer toward the
   * current one. While a shooting star streaks by, everyone stops to look up and wave.
   */
  update(
    dt: number,
    elapsed: number,
    gazingAtShootingStar: boolean,
    bridgesAndDocks: PlacedObjectEntity[],
  ) {
    const { terrain, pasture } = this.ctx;
    const placedObjects = this.ctx.entities.placedObjects;
    const villagerRadius = VILLAGER_RADIUS;

    for (const v of this.villagers) {
      if (gazingAtShootingStar) {
        // Stop, look up at the sky, and wave excitedly while watching the shooting star!
        v.bodyMesh.position.y = Math.abs(Math.sin(elapsed * 10.0)) * 0.0025;
        v.headGroup.rotation.x = THREE.MathUtils.lerp(
          v.headGroup.rotation.x,
          -0.42,
          dt * 6.0,
        );
        v.leftLeg.rotation.x = 0;
        v.rightLeg.rotation.x = 0;
        v.leftArm.rotation.x = 0;
        v.rightArm.rotation.x = -2.4 + Math.sin(elapsed * 14.0) * 0.35;
        continue;
      }

      if (v.pauseTimer > 0) {
        v.pauseTimer -= dt;
        v.bodyMesh.position.y = 0;
        v.leftLeg.rotation.x = THREE.MathUtils.lerp(v.leftLeg.rotation.x, 0, dt * 8);
        v.rightLeg.rotation.x = THREE.MathUtils.lerp(v.rightLeg.rotation.x, 0, dt * 8);
        v.leftArm.rotation.x = THREE.MathUtils.lerp(v.leftArm.rotation.x, 0, dt * 8);
        v.rightArm.rotation.x = THREE.MathUtils.lerp(v.rightArm.rotation.x, 0, dt * 8);
        v.headGroup.rotation.x = THREE.MathUtils.lerp(v.headGroup.rotation.x, 0, dt * 6);
        v.headGroup.rotation.y = Math.sin(elapsed * 2.2 + v.walkPhase) * 0.25;
        continue;
      }

      const distToTarget = v.dir.distanceTo(v.targetDir);
      if (distToTarget < 0.026) {
        v.headingToWell = !v.headingToWell;
        v.targetDir = this.pickNextTarget(v.headingToWell, v.dir);
        v.pauseTimer = 0.9 + Math.random() * 1.4;
        v.stuckTimer = 0;
        continue;
      }

      const prevDir = v.dir.clone();
      const surfBefore = terrain.getSurfacePointAndNormal(v.dir);

      // Desired tangent direction toward target on local surface plane
      const desiredTangent = v.targetDir
        .clone()
        .sub(v.dir)
        .projectOnPlane(surfBefore.normal)
        .normalize();

      // Compute smooth look-ahead obstacle avoidance steering vector around buildings, trees & fences
      const steerVec = desiredTangent.clone();
      const signHint = v.steerSign || 1;

      for (const obj of placedObjects) {
        if (obj.type === 'fence') {
          const { segA, segB, railAxis } = getFenceSegmentOnSphere(terrain, obj);
          const closest = closestPointOnSphereSegment(v.dir, segA, segB);
          const dFence = v.dir.distanceTo(closest);
          const minClear = 0.015 + villagerRadius;
          const avoidDist = minClear + 0.036;
          if (dFence < avoidDist && dFence > 1e-6) {
            const awayNormal = v.dir
              .clone()
              .sub(closest)
              .projectOnPlane(surfBefore.normal)
              .normalize();
            const alongRail =
              railAxis.dot(desiredTangent) >= 0
                ? railAxis.clone()
                : railAxis.clone().negate();
            const weight = Math.pow(
              1.0 - Math.max(0, dFence - minClear) / (avoidDist - minClear),
              1.35,
            );
            steerVec.addScaledVector(alongRail, weight * 1.65);
            steerVec.addScaledVector(awayNormal, weight * 1.25);
          }
          continue;
        }

        if (obj.type === 'rainbow') {
          const [footA, footB] = getRainbowFootDirs(terrain, obj.dir, obj.yaw);
          for (const footDir of [footA, footB]) {
            const dFoot = v.dir.distanceTo(footDir);
            const minClear = 0.026 + villagerRadius;
            const avoidDist = minClear + 0.042;
            if (dFoot < avoidDist && dFoot > 1e-6) {
              const away = v.dir
                .clone()
                .sub(footDir)
                .projectOnPlane(surfBefore.normal)
                .normalize();
              const weight = Math.pow(
                1.0 - Math.max(0, dFoot - minClear) / (avoidDist - minClear),
                1.35,
              );
              steerVec.addScaledVector(away, weight * 1.5);
            }
          }
          continue;
        }

        const obsR = getObjectCollisionRadius(obj.type);
        if (obsR <= 0) continue;

        const dObs = v.dir.distanceTo(obj.dir);
        const minClear = obsR + villagerRadius;
        const avoidDist = minClear + 0.048;

        if (dObs < avoidDist && dObs > 1e-6) {
          const toObs = obj.dir
            .clone()
            .sub(v.dir)
            .projectOnPlane(surfBefore.normal);
          const toObsNorm = toObs.clone().normalize();
          const approaching = toObsNorm.dot(desiredTangent);

          // Steer around the building if it lies in our forward hemisphere or we are very close
          if (approaching > -0.15 || dObs < minClear + 0.014) {
            const tangentLeft = new THREE.Vector3()
              .crossVectors(surfBefore.normal, toObsNorm)
              .normalize();
            const dotLeft = tangentLeft.dot(desiredTangent);
            const chosenTangent =
              Math.abs(dotLeft) > 0.08
                ? dotLeft >= 0
                  ? tangentLeft
                  : tangentLeft.clone().negate()
                : tangentLeft.clone().multiplyScalar(signHint);
            const awayRadial = toObsNorm.clone().negate();

            const weight = Math.pow(
              1.0 - Math.max(0, dObs - minClear) / (avoidDist - minClear),
              1.35,
            );
            steerVec.addScaledVector(chosenTangent, weight * 1.85);
            steerVec.addScaledVector(awayRadial, weight * 1.15);
          }
        }
      }

      // Also steer around the fenced sheep pasture corral
      const dPasture = v.dir.distanceTo(pasture.center);
      const pastureClear = pasture.radius + villagerRadius + 0.008;
      const pastureAvoid = pastureClear + 0.044;
      if (pasture.enabled && dPasture < pastureAvoid && dPasture > 1e-6) {
        const toPasture = pasture.center
          .clone()
          .sub(v.dir)
          .projectOnPlane(surfBefore.normal)
          .normalize();
        if (toPasture.dot(desiredTangent) > -0.1 || dPasture < pastureClear + 0.01) {
          const tangentLeft = new THREE.Vector3()
            .crossVectors(surfBefore.normal, toPasture)
            .normalize();
          const chosenTangent =
            tangentLeft.dot(desiredTangent) >= 0
              ? tangentLeft
              : tangentLeft.clone().negate();
          const weight = Math.pow(
            1.0 - Math.max(0, dPasture - pastureClear) / (pastureAvoid - pastureClear),
            1.35,
          );
          steerVec.addScaledVector(chosenTangent, weight * 1.85);
          steerVec.addScaledVector(toPasture.clone().negate(), weight * 1.25);
        }
      }

      // Personal-space steering around other villagers
      for (const other of this.villagers) {
        if (other === v) continue;
        const dOther = v.dir.distanceTo(other.dir);
        if (dOther < 0.028 && dOther > 1e-6) {
          const away = v.dir
            .clone()
            .sub(other.dir)
            .projectOnPlane(surfBefore.normal)
            .normalize();
          steerVec.addScaledVector(away, ((0.028 - dOther) / 0.028) * 0.9);
        }
      }

      steerVec.projectOnPlane(surfBefore.normal).normalize();
      if (steerVec.lengthSq() < 1e-6) {
        steerVec.copy(desiredTangent);
      }

      // Advance along steered tangent vector
      v.dir.addScaledVector(steerVec, v.speed * dt).normalize();

      // Enforce hard non-penetration constraints against all buildings, fences, water & cliffs
      this.resolveCollisions(v, bridgesAndDocks, prevDir);

      // Watchdog: if blocked from making progress for too long, choose a new clear target
      const actualStep = v.dir.distanceTo(prevDir);
      if (actualStep < v.speed * dt * 0.18) {
        v.stuckTimer = (v.stuckTimer || 0) + dt;
        if (v.stuckTimer > 1.1) {
          v.steerSign = -(v.steerSign || 1);
          v.headingToWell = !v.headingToWell;
          v.targetDir = this.pickNextTarget(v.headingToWell, v.dir);
          v.stuckTimer = 0;
        }
      } else {
        v.stuckTimer = Math.max(0, (v.stuckTimer || 0) - dt * 0.5);
      }

      const surf = terrain.getSurfacePointAndNormal(v.dir);
      const bridgeObj = bridgesAndDocks.find(
        (b) => b.dir.distanceTo(v.dir) < 0.056,
      );

      v.walkPhase += dt * 13.5;
      const stride = Math.sin(v.walkPhase);
      const hop = Math.abs(stride) * 0.0032;

      // Swing articulated legs & arms in opposition
      v.leftLeg.rotation.x = stride * 0.58;
      v.rightLeg.rotation.x = -stride * 0.58;
      v.leftArm.rotation.x = -stride * 0.46;
      v.rightArm.rotation.x = stride * 0.46;
      v.headGroup.rotation.x = Math.abs(stride) * 0.08;
      v.headGroup.rotation.y = 0;

      let basePt = surf.point;
      if (bridgeObj) {
        const dRatio = THREE.MathUtils.clamp(
          v.dir.distanceTo(bridgeObj.dir) / 0.048,
          0,
          1,
        );
        const deckHeight =
          bridgeObj.type === 'bridge'
            ? 0.015 + (1.0 - dRatio * dRatio) * 0.017
            : 0.019;
        basePt = v.dir
          .clone()
          .multiplyScalar(Math.max(surf.radius, terrain.seaLevel + deckHeight));
      }
      v.mesh.position.copy(basePt).addScaledVector(surf.normal, hop);

      const actualMoveTangent = v.dir
        .clone()
        .sub(prevDir)
        .projectOnPlane(surf.normal);
      const faceTangent =
        actualMoveTangent.lengthSq() > 1e-7
          ? actualMoveTangent.normalize()
          : steerVec;

      if (faceTangent.lengthSq() > 1e-5) {
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(
          UP_VEC,
          surf.normal,
        );
        const invAlign = alignQuat.clone().invert();
        const localTangent = faceTangent.clone().applyQuaternion(invAlign);
        const targetYaw = Math.atan2(localTangent.x, localTangent.z);
        // Smooth angular turn so villagers don't snap-spin around corners
        let diff = targetYaw - v.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.yaw += diff * Math.min(1.0, dt * 10.0);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, v.yaw);
        v.mesh.quaternion.copy(alignQuat).multiply(yawQuat);
      }
    }
  }

  /** Push a disciple out of anything solid; off water, mountains and cliffs */
  resolveCollisions(
    v: VillagerEntity,
    bridgesAndDocks: PlacedObjectEntity[],
    fallbackDir?: THREE.Vector3,
  ) {
    const { terrain, pasture } = this.ctx;
    const villagerRadius = VILLAGER_RADIUS;

    // 3-pass position-based non-penetration constraint solver
    for (let pass = 0; pass < 3; pass++) {
      // 1. Solid Buildings, Trees, Wells, Campfires, Beehives, Lanterns & Fences
      for (const obj of this.ctx.entities.placedObjects) {
        if (obj.type === 'fence') {
          const { segA, segB } = getFenceSegmentOnSphere(terrain, obj);
          const closest = closestPointOnSphereSegment(v.dir, segA, segB);
          const minFenceDist = 0.015 + villagerRadius;
          const dist = v.dir.distanceTo(closest);
          if (dist < minFenceDist) {
            const pushDir =
              dist > 1e-6
                ? v.dir.clone().sub(closest).normalize()
                : v.dir.clone().sub(pasture.center).normalize();
            v.dir
              .copy(closest)
              .addScaledVector(pushDir, minFenceDist + 0.001)
              .normalize();
          }
          continue;
        }

        if (obj.type === 'rainbow') {
          const [footA, footB] = getRainbowFootDirs(terrain, obj.dir, obj.yaw);
          for (const footDir of [footA, footB]) {
            const minFootDist = 0.028 + villagerRadius;
            const dFoot = v.dir.distanceTo(footDir);
            if (dFoot < minFootDist) {
              const pushDir =
                dFoot > 1e-6
                  ? v.dir.clone().sub(footDir).normalize()
                  : new THREE.Vector3(1, 0, 0);
              v.dir
                .copy(footDir)
                .addScaledVector(pushDir, minFootDist + 0.001)
                .normalize();
            }
          }
          continue;
        }

        const obsR = getObjectCollisionRadius(obj.type);
        if (obsR <= 0) continue;

        const minDist = obsR + villagerRadius;
        const dist = v.dir.distanceTo(obj.dir);
        if (dist < minDist) {
          const pushDir =
            dist > 1e-6
              ? v.dir.clone().sub(obj.dir).normalize()
              : new THREE.Vector3(1, 0, 0);
          v.dir
            .copy(obj.dir)
            .addScaledVector(pushDir, minDist + 0.001)
            .normalize();
        }
      }

      // 2. Keep villagers outside the fenced sheep pasture corral
      const dPasture = v.dir.distanceTo(pasture.center);
      const minPastureDist = pasture.radius + villagerRadius + 0.006;
      if (pasture.enabled && dPasture < minPastureDist) {
        const pushOut =
          dPasture > 1e-6
            ? v.dir.clone().sub(pasture.center).normalize()
            : new THREE.Vector3(0, 1, 0);
        v.dir
          .copy(pasture.center)
          .addScaledVector(pushOut, minPastureDist + 0.001)
          .normalize();
      }

      // 3. Villager-to-Villager personal space separation
      for (const other of this.villagers) {
        if (other === v) continue;
        const minSep = 0.020;
        const d = v.dir.distanceTo(other.dir);
        if (d < minSep && d > 1e-6) {
          const push = v.dir.clone().sub(other.dir).normalize();
          const overlap = (minSep - d) * 0.5;
          v.dir.addScaledVector(push, overlap).normalize();
        }
      }

      // 4. Villager-to-Sheep separation
      for (const s of this.ctx.entities.sheep) {
        const minSep = 0.022;
        const d = v.dir.distanceTo(s.dir);
        if (d < minSep && d > 1e-6) {
          const push = v.dir.clone().sub(s.dir).normalize();
          v.dir.addScaledVector(push, minSep - d).normalize();
        }
      }
    }

    // 5. Enforce water & sheer cliff constraints
    const surf = terrain.getSurfacePointAndNormal(v.dir);
    const onBridge = bridgesAndDocks.some(
      (b) => b.dir.distanceTo(v.dir) < 0.058,
    );
    const isTooSteep = surf.normal.dot(v.dir) < 0.74;

    if ((surf.isWater && !onBridge) || surf.isMountain || isTooSteep) {
      if (fallbackDir) {
        v.dir.copy(fallbackDir);
      }
      v.targetDir = this.pickNextTarget(true);
    }
  }
}
