import * as THREE from 'three';
import {
  createSailboatMesh,
  createSheepMesh,
  createSwanDuckFlockMesh,
  DuckEntity,
  PlacedObjectEntity,
  SailboatEntity,
  SheepEntity,
} from '../MiniatureObjects';
import { UP_VEC, WorldContext } from './context';
import {
  orientObjectOnSurface,
  pickRandomWaterTarget,
  realignAllObjectsToTerrain,
} from './spatial';

import { DISCIPLE_RADIUS, SHEEP_RADIUS, SurfaceNavigation, WalkingRoutes, surfaceTangent, type WalkingNeighbor } from './SurfaceNavigation';

/**
 * Creatures and water traffic: grazing sheep, sailboats and swan/duck flocks. Each
 * wanders on its own (land or water), steering clear of buildings, docks and each other.
 */
export class CreatureSystem {
  private boatCounter = 0;
  private routes = new WalkingRoutes();

  constructor(private ctx: WorldContext) {}

  /** A water spot for `dir`; if there's no water nearby, a small lake is dug */
  private findWaterSpot(dir: THREE.Vector3): THREE.Vector3 {
    const { terrain } = this.ctx;
    let waterDir = dir.clone().normalize();
    const surf = terrain.getSurfacePointAndNormal(waterDir);
    if (!surf.isWater) {
      const nearestWater = terrain.findNearestWaterDirection(waterDir, 0.95);
      if (nearestWater) {
        waterDir = nearestWater;
      } else {
        terrain.sculptAtDirection(waterDir, 'lake');
        realignAllObjectsToTerrain(this.ctx);
      }
    }
    return waterDir;
  }

  spawnSailboat(dir: THREE.Vector3, withSparkles = true): SailboatEntity {
    const { terrain } = this.ctx;
    const waterDir = this.findWaterSpot(dir);

    const { group, hullGroup, lanternMat } = createSailboatMesh(this.boatCounter++);
    const yaw = Math.random() * Math.PI * 2;
    orientObjectOnSurface(terrain, group, waterDir, yaw, 0, true);
    this.ctx.groups.inhabitants.add(group);

    const targetDir = pickRandomWaterTarget(terrain, waterDir);
    const entity: SailboatEntity = {
      id: `sailboat_${Date.now()}_${Math.random()}`,
      mesh: group,
      hullGroup,
      lanternMat,
      dir: waterDir,
      targetDir,
      speed: 0.048 + Math.random() * 0.02,
      bobPhase: Math.random() * Math.PI * 2,
      yaw,
    };

    if (withSparkles) {
      this.ctx.emitSparkles(waterDir, '#7ef2e6', terrain.seaLevel);
    }

    this.ctx.entities.sailboats.push(entity);
    return entity;
  }

  spawnDuckFlock(dir: THREE.Vector3, withSparkles = true): DuckEntity {
    const { terrain } = this.ctx;
    const waterDir = this.findWaterSpot(dir);

    const { group, rippleRings } = createSwanDuckFlockMesh();
    const yaw = Math.random() * Math.PI * 2;
    orientObjectOnSurface(terrain, group, waterDir, yaw, 0, true);
    this.ctx.groups.inhabitants.add(group);

    const targetDir = pickRandomWaterTarget(terrain, waterDir);
    const entity: DuckEntity = {
      id: `duck_${Date.now()}_${Math.random()}`,
      mesh: group,
      rippleRings,
      dir: waterDir,
      targetDir,
      speed: 0.028 + Math.random() * 0.015,
      bobPhase: Math.random() * Math.PI * 2,
      yaw,
    };

    if (withSparkles) {
      this.ctx.emitSparkles(waterDir, '#ffffff', terrain.seaLevel);
    }

    this.ctx.entities.ducks.push(entity);
    return entity;
  }

  spawnSheep(
    dir: THREE.Vector3,
    withSparkles = true,
    forceInPasture?: boolean,
  ): SheepEntity {
    const { terrain, pasture } = this.ctx;
    const normDir = dir.clone().normalize();
    const { group, headGroup, legs, tailMesh } = createSheepMesh();
    const yaw = Math.random() * Math.PI * 2;
    orientObjectOnSurface(terrain, group, normDir, yaw);
    this.ctx.groups.inhabitants.add(group);

    const isInsideCorral =
      forceInPasture !== undefined
        ? forceInPasture
        : pasture.enabled &&
          normDir.distanceTo(pasture.center) < pasture.radius - 0.01;

    const entity: SheepEntity = {
      id: `sheep_${Date.now()}_${Math.random()}`,
      mesh: group,
      headGroup,
      legs,
      tailMesh,
      dir: normDir,
      targetDir: normDir.clone(),
      speed: 0.04 + Math.random() * 0.018,
      walkPhase: Math.random() * Math.PI * 2,
      grazeTimer: 0.8 + Math.random() * 2.4,
      isGrazing: true,
      bounceTime: withSparkles ? 0.0 : 10.0,
      yaw,
      inPasture: isInsideCorral,
    };

    this.resolveSheepCollisions(entity);
    orientObjectOnSurface(terrain, entity.mesh, entity.dir, entity.yaw);

    if (withSparkles) {
      this.ctx.emitSparkles(entity.dir, '#ffffff');
    }

    this.ctx.entities.sheep.push(entity);
    return entity;
  }

  /** Sheep graze, then trot to a new spot (inside the corral if they live there) */
  updateSheep(dt: number, elapsed: number) {
    const { terrain, pasture } = this.ctx;
    const navigation = new SurfaceNavigation(this.ctx);
    const pRight = surfaceTangent(pasture.center);
    const neighbors = [
      ...this.ctx.entities.sheep.map(s => ({ id: s.id, dir: s.dir, radius: SHEEP_RADIUS })),
      ...this.ctx.entities.villagers.map(v => ({ id: v.id, dir: v.dir, radius: DISCIPLE_RADIUS })),
    ];
    const pUp = new THREE.Vector3()
      .crossVectors(pasture.center, pRight)
      .normalize();

    for (const s of this.ctx.entities.sheep) {
      this.resolveSheepCollisions(s, undefined, navigation, neighbors);
      orientObjectOnSurface(terrain, s.mesh, s.dir, s.yaw);
      s.grazeTimer -= dt;
      if (s.grazeTimer <= 0) {
        s.isGrazing = !s.isGrazing;
        s.grazeTimer = s.isGrazing
          ? 2.0 + Math.random() * 2.5
          : 2.2 + Math.random() * 2.0;
        if (!s.isGrazing) {
          if (s.inPasture) {
            // Pick a random grazing spot strictly inside the fenced sheep pasture corral
            const maxR = pasture.radius - 0.025;
            for (let attempt = 0; attempt < 12; attempt++) {
              const angle = Math.random() * Math.PI * 2;
              const r = (0.15 + Math.random() * 0.85) * maxR;
              const candidate = pasture.center
                .clone()
                .addScaledVector(pRight, Math.cos(angle) * r)
                .addScaledVector(pUp, Math.sin(angle) * r)
                .normalize();
              if (navigation.isClear(candidate, SHEEP_RADIUS + 0.002, true, false)) {
                s.targetDir.copy(candidate);
                break;
              }
            }
          } else {
            // Free-range sheep placed outside the pasture corral
            for (let attempt = 0; attempt < 12; attempt++) {
              const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.14,
                (Math.random() - 0.5) * 0.14,
                (Math.random() - 0.5) * 0.14,
              );
              const candidate = s.dir.clone().add(offset).normalize();
              if (navigation.isClear(candidate, SHEEP_RADIUS + 0.002, false, false)) {
                s.targetDir.copy(candidate);
                break;
              }
            }
          }
        }
      }

      // Cute wagging woolly tail
      s.tailMesh.rotation.y = Math.sin(elapsed * 8.5 + s.walkPhase) * 0.32;

      if (s.isGrazing) {
        s.headGroup.rotation.x =
          0.48 + Math.sin(elapsed * 7.0 + s.walkPhase) * 0.14;
        for (const leg of s.legs) {
          leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, dt * 8);
        }
      } else {
        s.headGroup.rotation.x = THREE.MathUtils.lerp(
          s.headGroup.rotation.x,
          0.0,
          dt * 6.0,
        );
        const dist = s.dir.distanceTo(s.targetDir);
        if (dist > 0.008) {
          const prevSheepDir = s.dir.clone();
          const heading = this.routes.direction(s, s.targetDir, navigation, SHEEP_RADIUS, dt, !!s.inPasture, false);
          if (heading) navigation.move(s, heading, Math.min(s.speed * dt, dist), SHEEP_RADIUS, neighbors, !!s.inPasture, false);
          if (s.dir.distanceTo(prevSheepDir) < s.speed * dt * 0.1) {
            // Rest briefly before finding a different grazing point; don't trot against a wall.
            s.isGrazing = true;
            s.grazeTimer = 0.8;
            this.routes.invalidate(s);
          }

          s.walkPhase += dt * 12.0;
          const stride = Math.sin(s.walkPhase);
          const hop = Math.abs(stride) * 0.0025;

          // Quadruped diagonal trot leg swing
          if (s.legs.length === 4) {
            s.legs[0].rotation.x = stride * 0.45;
            s.legs[1].rotation.x = -stride * 0.45;
            s.legs[2].rotation.x = -stride * 0.45;
            s.legs[3].rotation.x = stride * 0.45;
          }

          const surf = terrain.getSurfacePointAndNormal(s.dir);
          s.mesh.position.copy(surf.point).addScaledVector(surf.normal, hop);

          const actualMove = s.dir.clone().sub(prevSheepDir).projectOnPlane(surf.normal);
          const moveTangent = actualMove.lengthSq() > 1e-10
            ? actualMove.normalize()
            : heading ?? new THREE.Vector3();
          const alignQuat = new THREE.Quaternion().setFromUnitVectors(
            UP_VEC,
            surf.normal,
          );
          if (moveTangent.lengthSq() > 1e-5) {
            const invAlign = alignQuat.clone().invert();
            const localTangent = moveTangent.clone().applyQuaternion(invAlign);
            const targetYaw = Math.atan2(localTangent.x, localTangent.z);
            let diff = targetYaw - s.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            s.yaw += diff * Math.min(1.0, dt * 8.0);
          }
          const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, s.yaw);
          s.mesh.quaternion.copy(alignQuat).multiply(yawQuat);
        } else {
          s.isGrazing = true;
          s.grazeTimer = 1.8 + Math.random() * 2.2;
        }
      }
    }
  }

  /** Sailboats bob and sail across open water, avoiding docks, bridges and shorelines */
  updateSailboats(
    dt: number,
    elapsed: number,
    warmGlow: number,
    bridgesAndDocks: PlacedObjectEntity[],
  ) {
    const { terrain } = this.ctx;
    const sailboats = this.ctx.entities.sailboats;
    for (const b of sailboats) {
      b.lanternMat.emissiveIntensity = 0.2 + warmGlow * 2.3;

      const dist = b.dir.distanceTo(b.targetDir);
      if (dist < 0.03) {
        b.targetDir = pickRandomWaterTarget(terrain, b.dir);
      } else {
        const nextDir = b.dir
          .clone()
          .lerp(b.targetDir, (b.speed * dt) / Math.max(dist, 0.01))
          .normalize();
        const surf = terrain.getSurfacePointAndNormal(nextDir);
        const hitsPier = bridgesAndDocks.some(
          (pier) => pier.dir.distanceTo(nextDir) < 0.052,
        );
        const hitsOtherBoat = sailboats.some(
          (other) => other !== b && other.dir.distanceTo(nextDir) < 0.048,
        );

        if (surf.isWater && !hitsPier && !hitsOtherBoat) {
          const tangent = b.targetDir
            .clone()
            .sub(b.dir)
            .projectOnPlane(nextDir)
            .normalize();
          if (tangent.lengthSq() > 1e-5) {
            b.yaw = Math.atan2(tangent.x, tangent.z);
          }
          b.dir.copy(nextDir);
        } else {
          b.targetDir = pickRandomWaterTarget(terrain, b.dir);
        }
      }

      const bobOffset = Math.sin(elapsed * 2.6 + b.bobPhase) * 0.0022;
      orientObjectOnSurface(terrain, b.mesh, b.dir, b.yaw, bobOffset, true);
      b.hullGroup.rotation.z = Math.sin(elapsed * 2.1 + b.bobPhase) * 0.085;
      b.hullGroup.rotation.x = Math.cos(elapsed * 1.8 + b.bobPhase) * 0.05;
    }
  }

  /** Paddling swans and ducks with expanding ripple rings, avoiding docks and boats */
  updateDucks(dt: number, elapsed: number, bridgesAndDocks: PlacedObjectEntity[]) {
    const { terrain } = this.ctx;
    for (const d of this.ctx.entities.ducks) {
      const dist = d.dir.distanceTo(d.targetDir);
      if (dist < 0.025) {
        d.targetDir = pickRandomWaterTarget(terrain, d.dir);
      } else {
        const nextDir = d.dir
          .clone()
          .lerp(d.targetDir, (d.speed * dt) / Math.max(dist, 0.01))
          .normalize();
        const surf = terrain.getSurfacePointAndNormal(nextDir);
        const hitsPier = bridgesAndDocks.some(
          (pier) => pier.dir.distanceTo(nextDir) < 0.044,
        );
        const hitsBoat = this.ctx.entities.sailboats.some(
          (boat) => boat.dir.distanceTo(nextDir) < 0.045,
        );

        if (surf.isWater && !hitsPier && !hitsBoat) {
          const tangent = d.targetDir
            .clone()
            .sub(d.dir)
            .projectOnPlane(nextDir)
            .normalize();
          if (tangent.lengthSq() > 1e-5) {
            d.yaw = Math.atan2(tangent.x, tangent.z);
          }
          d.dir.copy(nextDir);
        } else {
          d.targetDir = pickRandomWaterTarget(terrain, d.dir);
        }
      }

      const bobOffset = Math.sin(elapsed * 3.4 + d.bobPhase) * 0.0012;
      orientObjectOnSurface(terrain, d.mesh, d.dir, d.yaw, bobOffset, true);

      d.rippleRings.forEach((ring, idx) => {
        const rippleCycle = (elapsed * 0.85 + idx * 0.5 + d.bobPhase) % 1.0;
        const scale = 0.8 + rippleCycle * 1.45;
        ring.scale.setScalar(scale);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          (1.0 - rippleCycle) * 0.45;
      });
    }
  }

  /** Push a sheep out of fences, buildings and the flock; true when it hit a boundary */
  resolveSheepCollisions(
    s: SheepEntity,
    fallbackDir?: THREE.Vector3,
    navigation?: SurfaceNavigation,
    neighbors?: WalkingNeighbor[],
  ): boolean {
    const nav = navigation ?? new SurfaceNavigation(this.ctx);
    const before = s.dir.clone();
    nav.separate(s, SHEEP_RADIUS, neighbors ?? [
      ...this.ctx.entities.sheep.map(other => ({ id: other.id, dir: other.dir, radius: SHEEP_RADIUS })),
      ...this.ctx.entities.villagers.map(other => ({ id: other.id, dir: other.dir, radius: DISCIPLE_RADIUS })),
    ], !!s.inPasture, false);
    const recovered = nav.recover(s.dir, SHEEP_RADIUS, !!s.inPasture, false, fallbackDir ?? before);
    return recovered || s.dir.distanceToSquared(before) > 1e-10;
  }
}
