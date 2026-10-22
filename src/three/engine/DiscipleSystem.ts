import * as THREE from 'three';
import {
  createVillagerMesh,
  PlacedObjectEntity,
  VillagerEntity,
} from '../MiniatureObjects';
import { UP_VEC, WorldContext } from './context';
import type { DayNightSystem } from './DayNightSystem';
import {
  getBuildingEntranceDir,
  getObjectCollisionRadius,
  isPositionClearOfObstacles,
  orientObjectOnSurface,
} from './spatial';

import { DISCIPLE_RADIUS, SHEEP_RADIUS, SurfaceNavigation, WalkingRoutes, type WalkingNeighbor } from './SurfaceNavigation';

const VILLAGER_RADIUS = DISCIPLE_RADIUS;

/**
 * Disciples: spawning, choosing where to walk (the pagoda grounds, buildings, campfires
 * at night), steering around obstacles, and never walking through buildings or water.
 */
export class DiscipleSystem {
  private villagerCounter = 0;
  private routes = new WalkingRoutes();

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
    };

    // Immediately resolve any spawn overlap with buildings or fences
    this.resolveCollisions(entity, []);
    orientObjectOnSurface(terrain, entity.mesh, entity.dir, entity.yaw);
    entity.mesh.position.copy(new SurfaceNavigation(this.ctx).standingPoint(entity.dir));

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
          const entrance = getBuildingEntranceDir(terrain, chosen, (Math.random() - 0.5) * 0.022);
          if (isPositionClearOfObstacles(this.ctx, entrance, VILLAGER_RADIUS + 0.002)) return entrance;
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
      const entrance = getBuildingEntranceDir(terrain, chosen, lateral);
      if (isPositionClearOfObstacles(this.ctx, entrance, VILLAGER_RADIUS + 0.002)) return entrance;
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
    const { terrain } = this.ctx;
    const navigation = new SurfaceNavigation(this.ctx);
    const neighbors = [
      ...this.villagers.map(v => ({ id: v.id, dir: v.dir, radius: DISCIPLE_RADIUS })),
      ...this.ctx.entities.sheep.map(s => ({ id: s.id, dir: s.dir, radius: SHEEP_RADIUS })),
    ];

    for (const v of this.villagers) {
      this.resolveCollisions(v, bridgesAndDocks, undefined, navigation, neighbors);
      orientObjectOnSurface(terrain, v.mesh, v.dir, v.yaw);
      v.mesh.position.copy(navigation.standingPoint(v.dir));

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
      const steerVec = this.routes.direction(v, v.targetDir, navigation, VILLAGER_RADIUS, dt);
      if (steerVec) {
        navigation.move(v, steerVec, Math.min(v.speed * dt, distToTarget), VILLAGER_RADIUS, neighbors);
      }

      // Watchdog: if blocked from making progress for too long, choose a new clear target
      const actualStep = v.dir.distanceTo(prevDir);
      if (actualStep < v.speed * dt * 0.18) {
        v.stuckTimer = (v.stuckTimer || 0) + dt;
        if (v.stuckTimer > 1.1) {
          this.routes.invalidate(v);
          v.headingToWell = !v.headingToWell;
          v.targetDir = this.pickNextTarget(v.headingToWell, v.dir);
          v.stuckTimer = 0;
        }
      } else {
        v.stuckTimer = Math.max(0, (v.stuckTimer || 0) - dt * 0.5);
      }

      const surf = terrain.getSurfacePointAndNormal(v.dir);

      v.walkPhase += dt * 13.5;
      const stride = actualStep > 1e-6 ? Math.sin(v.walkPhase) : 0;
      const hop = actualStep > 1e-6 ? Math.abs(stride) * 0.0032 : 0;

      // Swing articulated legs & arms in opposition
      v.leftLeg.rotation.x = stride * 0.58;
      v.rightLeg.rotation.x = -stride * 0.58;
      v.leftArm.rotation.x = -stride * 0.46;
      v.rightArm.rotation.x = stride * 0.46;
      v.headGroup.rotation.x = Math.abs(stride) * 0.08;
      v.headGroup.rotation.y = 0;

      v.mesh.position.copy(navigation.standingPoint(v.dir)).addScaledVector(surf.normal, hop);

      const actualMoveTangent = v.dir
        .clone()
        .sub(prevDir)
        .projectOnPlane(surf.normal);
      const faceTangent =
        actualMoveTangent.lengthSq() > 1e-7
          ? actualMoveTangent.normalize()
          : steerVec ?? new THREE.Vector3();

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
    navigation?: SurfaceNavigation,
    neighbors?: WalkingNeighbor[],
  ) {
    const nav = navigation ?? new SurfaceNavigation(this.ctx);
    const before = v.dir.clone();
    // Crowd spacing is soft; solids and safe terrain always have the final say.
    nav.separate(v, VILLAGER_RADIUS, neighbors ?? [
      ...this.villagers.map(other => ({ id: other.id, dir: other.dir, radius: DISCIPLE_RADIUS })),
      ...this.ctx.entities.sheep.map(other => ({ id: other.id, dir: other.dir, radius: SHEEP_RADIUS })),
    ]);
    nav.recover(v.dir, VILLAGER_RADIUS, false, true, fallbackDir ?? before);
  }
}
