import * as THREE from 'three';
import type { WorldContext } from './context';

export interface ObjectAnimationFrame {
  dt: number;
  elapsed: number;
  warmGlow: number;
  camera: THREE.Camera;
  /** The tour points lighthouse beams across the view for its finale */
  holdBeamsAcrossView: boolean;
}

/**
 * Animation for placed objects: the pop-in bounce and growth, windmill sails, glowing
 * windows, lighthouse beams, campfire flames and embers, the watchtower pennant and
 * beehive butterflies.
 */
export class ObjectAnimationSystem {
  constructor(private ctx: WorldContext) {}

  update({ dt, elapsed, warmGlow: warmGlowFactor, camera, holdBeamsAcrossView }: ObjectAnimationFrame) {
    for (const obj of this.ctx.entities.placedObjects) {
      if (Math.abs(obj.growth - obj.targetGrowth) > 0.001) {
        obj.growth = THREE.MathUtils.lerp(obj.growth, obj.targetGrowth, dt * 3.5);
      }

      let bounceScale = 1.0;
      if (obj.bounceActive) {
        obj.bounceTime += dt;
        if (obj.bounceTime < 0.65) {
          const p = obj.bounceTime / 0.65;
          bounceScale =
            1.0 - Math.exp(-p * 6.0) * Math.cos(p * Math.PI * 3.5) * 0.65;
        } else {
          obj.bounceActive = false;
        }
      }
      obj.mesh.scale.setScalar(obj.growth * bounceScale);

      if (obj.windmillRotor) {
        obj.windmillRotor.rotation.z -= dt * 1.15;
      }

      if (obj.windowMaterials) {
        const emIntensity = 0.15 + warmGlowFactor * 2.1;
        for (const wm of obj.windowMaterials) {
          wm.emissiveIntensity = emIntensity;
        }
      }

      if (obj.lighthouseBeamPivot && obj.lighthouseConeMats && obj.lighthousePointLight) {
        if (holdBeamsAcrossView) {
          // Smoothly align the lighthouse beam perpendicular to the camera's view ray and tower axis
          // so the searchlight is strictly 90° perpendicular to the lighthouse in both 3D and 2D screen space at 0:29
          obj.mesh.updateMatrixWorld(true);
          const worldQuat = new THREE.Quaternion();
          obj.mesh.getWorldQuaternion(worldQuat);
          const lanternWorldPos = new THREE.Vector3(0, 0.14, 0).applyMatrix4(
            obj.mesh.matrixWorld,
          );
          const viewDir = lanternWorldPos
            .clone()
            .sub(camera.position)
            .normalize();
          const towerUpWorld = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(worldQuat)
            .normalize();
          const perpWorld = new THREE.Vector3()
            .crossVectors(towerUpWorld, viewDir)
            .normalize();
          const perpLocal = perpWorld
            .clone()
            .applyQuaternion(worldQuat.clone().invert());
          const targetRotY = Math.atan2(perpLocal.x, perpLocal.z);

          const angleDiff =
            (((targetRotY - obj.lighthouseBeamPivot.rotation.y) % Math.PI) +
              Math.PI * 1.5) %
              Math.PI -
            Math.PI * 0.5;
          obj.lighthouseBeamPivot.rotation.y +=
            angleDiff * Math.min(1.0, dt * 6.5);
        } else {
          obj.lighthouseBeamPivot.rotation.y += dt * 1.25;
        }
        const beamOpacity = warmGlowFactor * 0.42;
        for (const cm of obj.lighthouseConeMats) {
          cm.opacity = beamOpacity;
        }
        obj.lighthousePointLight.intensity = warmGlowFactor * 0.85;
      }

      // Campfire crackling flames, rising ember particles & warm orange glow
      if (obj.campfireFlameGroup && obj.campfireEmbers && obj.campfireLight) {
        const flicker = 1.0 + Math.sin(elapsed * 18.0 + obj.yaw) * 0.16;
        obj.campfireFlameGroup.scale.set(
          1.0 + Math.cos(elapsed * 14.0) * 0.1,
          flicker,
          1.0 + Math.sin(elapsed * 16.0) * 0.1,
        );
        obj.campfireLight.intensity = (0.38 + warmGlowFactor * 0.95) * flicker;

        const emberPos = obj.campfireEmbers.geometry.attributes.position;
        for (let i = 0; i < emberPos.count; i++) {
          let y = emberPos.getY(i) + dt * 0.032;
          if (y > 0.058) y = 0.01;
          const x = Math.sin(elapsed * 5.0 + i * 2.1) * 0.006;
          const z = Math.cos(elapsed * 4.5 + i * 1.7) * 0.006;
          emberPos.setXYZ(i, x, y, z);
        }
        emberPos.needsUpdate = true;
      }

      // Stone Watchtower waving pennant flag
      if (obj.watchtowerFlag) {
        obj.watchtowerFlag.rotation.y =
          Math.sin(elapsed * 5.2 + obj.yaw) * 0.24;
      }

      // Beehive fluttering butterflies & golden bees
      if (obj.butterflySwarm) {
        obj.butterflySwarm.rotation.y = elapsed * 1.4;
        obj.butterflySwarm.children.forEach((bPivot, idx) => {
          bPivot.position.y =
            0.008 + Math.sin(elapsed * 4.2 + idx * 1.6) * 0.008;
          const flap = Math.sin(elapsed * 22.0 + idx) * 0.55;
          if (bPivot.children[0]) bPivot.children[0].rotation.y = 0.4 + flap;
          if (bPivot.children[1]) bPivot.children[1].rotation.y = -0.4 - flap;
        });
      }
    }
  }
}
