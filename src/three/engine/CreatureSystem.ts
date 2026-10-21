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
  closestPointOnSphereSegment,
  getFenceSegmentOnSphere,
  getObjectCollisionRadius,
  getRainbowFootDirs,
  isPositionClearOfObstacles,
  orientObjectOnSurface,
  pickRandomWaterTarget,
  realignAllObjectsToTerrain,
} from './spatial';

/**
 * Creatures and water traffic: grazing sheep, sailboats and swan/duck flocks. Each
 * wanders on its own (land or water), steering clear of buildings, docks and each other.
 */
export class CreatureSystem {
  private boatCounter = 0;

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
    const pRight = new THREE.Vector3()
      .crossVectors(UP_VEC, pasture.center)
      .normalize();
    const pUp = new THREE.Vector3()
      .crossVectors(pasture.center, pRight)
      .normalize();

    for (const s of this.ctx.entities.sheep) {
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
              if (isPositionClearOfObstacles(this.ctx, candidate, 0.012, true)) {
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
              if (isPositionClearOfObstacles(this.ctx, candidate, 0.014, false)) {
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
          s.dir
            .lerp(s.targetDir, (s.speed * dt) / Math.max(dist, 0.01))
            .normalize();

          // Enforce fence rail collision, pasture containment, building collision & flock separation
          const hitBoundary = this.resolveSheepCollisions(s, prevSheepDir);
          if (hitBoundary) {
            // Pick a fresh grazing point away from the fence/obstacle
            s.targetDir.copy(
              s.inPasture ? pasture.center : prevSheepDir,
            );
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

          const moveTangent = s.targetDir
            .clone()
            .sub(s.dir)
            .projectOnPlane(surf.normal)
            .normalize();
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
  ): boolean {
    const { terrain, pasture } = this.ctx;
    const sheepRadius = 0.013;
    let hitBoundary = false;

    for (let pass = 0; pass < 3; pass++) {
      // 1. Continuous Pasture Corral Containment for pasture sheep
      if (s.inPasture) {
        const maxInsideDist = pasture.radius - sheepRadius - 0.008;
        const dCenter = s.dir.distanceTo(pasture.center);
        if (dCenter > maxInsideDist && dCenter > 1e-6) {
          const fromCenter = s.dir
            .clone()
            .sub(pasture.center)
            .normalize();
          s.dir
            .copy(pasture.center)
            .addScaledVector(fromCenter, maxInsideDist)
            .normalize();
          hitBoundary = true;
        }
      } else {
        // Free-range sheep outside the corral cannot walk through the fence into the corral
        const minOutsideDist = pasture.radius + sheepRadius + 0.008;
        const dCenter = s.dir.distanceTo(pasture.center);
        if (dCenter < minOutsideDist && dCenter > 1e-6) {
          const fromCenter = s.dir
            .clone()
            .sub(pasture.center)
            .normalize();
          s.dir
            .copy(pasture.center)
            .addScaledVector(fromCenter, minOutsideDist)
            .normalize();
          hitBoundary = true;
        }
      }

      // 2. Individual Fence Segment Capsule Colliders & Solid Buildings/Trees
      for (const obj of this.ctx.entities.placedObjects) {
        if (obj.type === 'fence') {
          const { segA, segB } = getFenceSegmentOnSphere(terrain, obj);
          const closest = closestPointOnSphereSegment(s.dir, segA, segB);
          const minFenceDist = 0.015 + sheepRadius;
          const dist = s.dir.distanceTo(closest);
          if (dist < minFenceDist) {
            const pushDir =
              dist > 1e-6
                ? s.dir.clone().sub(closest).normalize()
                : pasture.center.clone().sub(closest).normalize();
            s.dir
              .copy(closest)
              .addScaledVector(pushDir, minFenceDist + 0.001)
              .normalize();
            hitBoundary = true;
          }
          continue;
        }

        if (obj.type === 'rainbow') {
          const [footA, footB] = getRainbowFootDirs(terrain, obj.dir, obj.yaw);
          for (const footDir of [footA, footB]) {
            const minFootDist = 0.028 + sheepRadius;
            const dFoot = s.dir.distanceTo(footDir);
            if (dFoot < minFootDist) {
              const pushDir =
                dFoot > 1e-6
                  ? s.dir.clone().sub(footDir).normalize()
                  : new THREE.Vector3(1, 0, 0);
              s.dir
                .copy(footDir)
                .addScaledVector(pushDir, minFootDist + 0.001)
                .normalize();
              hitBoundary = true;
            }
          }
          continue;
        }

        const obsR = getObjectCollisionRadius(obj.type);
        if (obsR <= 0) continue;

        const minDist = obsR + sheepRadius;
        const dist = s.dir.distanceTo(obj.dir);
        if (dist < minDist) {
          const pushDir =
            dist > 1e-6
              ? s.dir.clone().sub(obj.dir).normalize()
              : new THREE.Vector3(1, 0, 0);
          s.dir
            .copy(obj.dir)
            .addScaledVector(pushDir, minDist + 0.001)
            .normalize();
          hitBoundary = true;
        }
      }

      // 3. Sheep-to-Sheep flock separation
      for (const other of this.ctx.entities.sheep) {
        if (other === s) continue;
        const minSep = 0.024;
        const d = s.dir.distanceTo(other.dir);
        if (d < minSep && d > 1e-6) {
          const push = s.dir.clone().sub(other.dir).normalize();
          s.dir.addScaledVector(push, (minSep - d) * 0.5).normalize();
        }
      }
    }

    // 4. Prevent sheep from entering water or steep mountain cliffs
    const surf = terrain.getSurfacePointAndNormal(s.dir);
    if (surf.isWater || surf.isMountain || surf.normal.dot(s.dir) < 0.75) {
      if (fallbackDir) {
        s.dir.copy(fallbackDir);
      }
      hitBoundary = true;
    }

    return hitBoundary;
  }
}
