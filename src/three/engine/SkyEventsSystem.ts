import * as THREE from 'three';
import {
  BalloonEntity,
  createHotAirBalloonMesh,
  createShootingStarMesh,
  ShootingStarEntity,
} from '../MiniatureObjects';
import { UP_VEC, WorldContext } from './context';

/**
 * Things in the sky: hot air balloons drifting through the atmosphere and shooting
 * stars streaking past. A shooting star makes everyone below stop and look up.
 */
export class SkyEventsSystem {
  private balloonCounter = 0;
  private shootingStarGazeTimer = 0;

  constructor(private ctx: WorldContext) {}

  /** True while a recent shooting star has everyone looking up */
  get isGazing() {
    return this.shootingStarGazeTimer > 0;
  }

  tickGaze(dt: number) {
    if (this.shootingStarGazeTimer > 0) {
      this.shootingStarGazeTimer = Math.max(0, this.shootingStarGazeTimer - dt);
    }
  }

  spawnBalloon(dir: THREE.Vector3, withSparkles = true): BalloonEntity {
    const normDir = dir.clone().normalize();
    const { group, burnerMat } = createHotAirBalloonMesh(this.balloonCounter++);

    const randVec = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() + 0.5,
      Math.random() - 0.5,
    ).normalize();
    const orbitAxis = new THREE.Vector3()
      .crossVectors(normDir, randVec)
      .normalize();

    const baseAltitude = 0.94 + Math.random() * 0.06; // Inside the purple/blue troposphere layer
    group.position.copy(normDir).multiplyScalar(baseAltitude);
    group.quaternion.setFromUnitVectors(UP_VEC, normDir);
    this.ctx.groups.atmosphere.add(group);

    const entity: BalloonEntity = {
      id: `balloon_${Date.now()}_${Math.random()}`,
      mesh: group,
      burnerMat,
      orbitAxis,
      currentDir: normDir,
      orbitSpeed: 0.065 + Math.random() * 0.03,
      baseAltitude,
      phase: Math.random() * Math.PI * 2,
    };

    if (withSparkles) {
      this.ctx.emitSparkles(normDir, '#ffb8d1', baseAltitude);
    }

    this.ctx.entities.balloons.push(entity);
    return entity;
  }

  spawnShootingStar(dir: THREE.Vector3): ShootingStarEntity {
    const normDir = dir.clone().normalize();
    const mesh = createShootingStarMesh();

    const randVec = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();
    const orbitAxis = new THREE.Vector3()
      .crossVectors(normDir, randVec)
      .normalize();

    const altitude = 1.1; // Streaking through the upper purple/blue stratosphere
    mesh.position.copy(normDir).multiplyScalar(altitude);
    this.ctx.groups.atmosphere.add(mesh);

    const entity: ShootingStarEntity = {
      id: `star_${Date.now()}_${Math.random()}`,
      mesh,
      orbitAxis,
      currentDir: normDir,
      speed: 1.35,
      altitude,
      age: 0,
      maxAge: 1.65,
      sparkleTimer: 0,
    };

    this.ctx.entities.shootingStars.push(entity);
    this.shootingStarGazeTimer = 2.4;
    this.ctx.emitSparkles(normDir, '#fff3a1', altitude);
    return entity;
  }

  /** Balloons drift in orbit, bob, and puff their burners */
  updateBalloons(dt: number, elapsed: number, warmGlow: number) {
    for (const bal of this.ctx.entities.balloons) {
      const qStep = new THREE.Quaternion().setFromAxisAngle(
        bal.orbitAxis,
        bal.orbitSpeed * dt,
      );
      bal.currentDir.applyQuaternion(qStep).normalize();
      const alt =
        bal.baseAltitude + Math.sin(elapsed * 1.2 + bal.phase) * 0.018;
      bal.mesh.position.copy(bal.currentDir).multiplyScalar(alt);
      bal.mesh.quaternion.setFromUnitVectors(UP_VEC, bal.currentDir);

      // Periodic golden burner flame puff
      const burnerPulse =
        Math.max(0, Math.sin(elapsed * 2.4 + bal.phase * 2.0)) * 1.8;
      bal.burnerMat.emissiveIntensity = 0.7 + burnerPulse + warmGlow * 1.1;
    }
  }

  /** Shooting stars streak across the upper sky, trailing sparkles, then fade out */
  updateShootingStars(dt: number) {
    const stars = this.ctx.entities.shootingStars;
    for (let i = stars.length - 1; i >= 0; i--) {
      const st = stars[i];
      st.age += dt;
      if (st.age >= st.maxAge) {
        this.ctx.groups.atmosphere.remove(st.mesh);
        stars.splice(i, 1);
        continue;
      }

      const prevPos = st.currentDir.clone().multiplyScalar(st.altitude);
      const qStep = new THREE.Quaternion().setFromAxisAngle(
        st.orbitAxis,
        st.speed * dt,
      );
      st.currentDir.applyQuaternion(qStep).normalize();
      const nextPos = st.currentDir.clone().multiplyScalar(st.altitude);

      st.mesh.position.copy(nextPos);
      const velDir = nextPos.clone().sub(prevPos).normalize();
      if (velDir.lengthSq() > 1e-5) {
        const targetLook = nextPos.clone().add(velDir);
        st.mesh.lookAt(targetLook);
      }

      const fade = 1.0 - Math.pow(st.age / st.maxAge, 2.0);
      st.mesh.scale.setScalar(Math.max(0.01, fade));

      st.sparkleTimer += dt;
      if (st.sparkleTimer > 0.09) {
        st.sparkleTimer = 0;
        this.ctx.emitSparkles(st.currentDir, '#fff4b8', st.altitude);
      }
    }
  }
}
