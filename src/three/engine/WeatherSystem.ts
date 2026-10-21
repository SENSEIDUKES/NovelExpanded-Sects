import * as THREE from 'three';
import { CloudEntity, createPuffyCloudMesh } from '../MiniatureObjects';
import { UP_VEC, WorldContext } from './context';

/**
 * Weather: rain and snow clouds orbiting the planet. Showers come and go on a timer,
 * darken and wet the ground or dust it with snow, and rain helps nearby trees grow.
 */
export class WeatherSystem {
  constructor(private ctx: WorldContext) {}

  spawnCloud(
    dir: THREE.Vector3,
    withSparkles = true,
    initialRainTimer = 4.0,
    isSnow = false,
  ): CloudEntity {
    const normDir = dir.clone().normalize();
    const { group, rainLines, rainMat, snowPoints, snowMat } =
      createPuffyCloudMesh(isSnow);

    // Pick an orbital axis perpendicular to initial direction
    const randVec = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() + 0.4,
      Math.random() - 0.5,
    ).normalize();
    const orbitAxis = new THREE.Vector3()
      .crossVectors(normDir, randVec)
      .normalize();

    const altitude = 0.98 + Math.random() * 0.05; // Suspended inside the purple/blue planetary atmosphere
    group.position.copy(normDir).multiplyScalar(altitude);
    group.quaternion.setFromUnitVectors(UP_VEC, normDir);
    this.ctx.groups.atmosphere.add(group);

    const entity: CloudEntity = {
      id: `cloud_${Date.now()}_${Math.random()}`,
      isSnow,
      mesh: group,
      rainLines,
      rainMat,
      snowPoints,
      snowMat,
      orbitAxis,
      currentDir: normDir,
      orbitSpeed: 0.11 + Math.random() * 0.05,
      altitude,
      rainTimer: initialRainTimer,
      isRaining: isSnow, // Snow clouds begin gently snowing right away
      bounceTime: withSparkles ? 0.0 : 10.0,
    };

    if (withSparkles) {
      this.ctx.emitSparkles(normDir, isSnow ? '#ffffff' : '#cce8ff', altitude);
    }

    this.ctx.entities.clouds.push(entity);
    return entity;
  }

  /** How stormy the sky looks (0..1), for the atmosphere's haze */
  get intensity() {
    const clouds = this.ctx.entities.clouds;
    const activeRainOrSnowCount = clouds.filter((c) => c.isRaining).length;
    return Math.min(
      1.0,
      0.25 + activeRainOrSnowCount * 0.25 + clouds.length * 0.06,
    );
  }

  update(dt: number, elapsed: number) {
    const { terrain } = this.ctx;
    for (const c of this.ctx.entities.clouds) {
      const qStep = new THREE.Quaternion().setFromAxisAngle(
        c.orbitAxis,
        c.orbitSpeed * dt,
      );
      c.currentDir.applyQuaternion(qStep).normalize();
      c.mesh.position.copy(c.currentDir).multiplyScalar(c.altitude);
      c.mesh.quaternion.setFromUnitVectors(UP_VEC, c.currentDir);

      c.rainTimer -= dt;
      if (c.rainTimer <= 0) {
        c.isRaining = !c.isRaining;
        c.rainTimer = c.isRaining
          ? 5.2 + Math.random() * 2.5
          : 6.5 + Math.random() * 4.5;
      }

      if (c.isSnow && c.snowPoints && c.snowMat) {
        const targetSnowOpacity = c.isRaining ? 0.88 : 0.0;
        c.snowMat.opacity = THREE.MathUtils.lerp(
          c.snowMat.opacity,
          targetSnowOpacity,
          dt * 4.0,
        );
        if (c.isRaining) {
          c.snowPoints.position.y = -((elapsed * 0.14) % 0.06);
          c.snowPoints.rotation.y = elapsed * 0.8;
          terrain.applySnowAtDirection(c.currentDir, dt);
        }
      } else {
        const targetRainOpacity = c.isRaining ? 0.65 : 0.0;
        c.rainMat.opacity = THREE.MathUtils.lerp(
          c.rainMat.opacity,
          targetRainOpacity,
          dt * 4.0,
        );

        if (c.isRaining) {
          c.rainLines.position.y = -((elapsed * 0.38) % 0.06);
          terrain.applyRainAtDirection(c.currentDir, dt);

          for (const obj of this.ctx.entities.placedObjects) {
            if (obj.type === 'oak' || obj.type === 'pine' || obj.type === 'palm') {
              if (obj.dir.distanceTo(c.currentDir) < 0.28 && obj.targetGrowth < 1.38) {
                obj.targetGrowth = Math.min(1.38, obj.targetGrowth + dt * 0.09);
              }
            }
          }
        }
      }
    }
  }
}
