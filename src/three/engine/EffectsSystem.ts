import * as THREE from 'three';
import type { PlanetTerrainHandles } from '../PlanetTerrain';

interface SparkleBurst {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  age: number;
  maxAge: number;
}

/**
 * Short-lived visual effects. Today that's sparkle bursts: placing, removing, blocked
 * placements, world-type shimmer and shooting-star trails all use them.
 */
export class EffectsSystem {
  private sparkles: SparkleBurst[] = [];

  constructor(
    private terrain: PlanetTerrainHandles,
    private group: THREE.Group,
    private sprite: THREE.Texture | null,
  ) {}

  emitSparklesAtDir(
    dir: THREE.Vector3,
    hexColor = '#ffe57f',
    customRadius?: number,
  ) {
    const surface = this.terrain.getSurfacePointAndNormal(dir);
    const origin = customRadius
      ? dir.clone().normalize().multiplyScalar(customRadius)
      : surface.point.clone().addScaledVector(surface.normal, 0.025);

    const count = 18;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const baseCol = new THREE.Color(hexColor);
    const altCol = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      const c = i % 2 === 0 ? baseCol : altCol;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
      );
      const vel = surface.normal
        .clone()
        .multiplyScalar(0.12 + Math.random() * 0.14)
        .addScaledVector(spread, 0.09);
      velocities.push(vel);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      map: this.sprite,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);
    this.sparkles.push({
      points,
      velocities,
      age: 0,
      maxAge: 0.75,
    });
  }

  update(dt: number) {
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const b = this.sparkles[i];
      b.age += dt;
      if (b.age >= b.maxAge) {
        this.group.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.sparkles.splice(i, 1);
        continue;
      }
      const posAttr = b.points.geometry.attributes.position;
      for (let k = 0; k < b.velocities.length; k++) {
        const vx = posAttr.getX(k) + b.velocities[k].x * dt;
        const vy = posAttr.getY(k) + b.velocities[k].y * dt;
        const vz = posAttr.getZ(k) + b.velocities[k].z * dt;
        posAttr.setXYZ(k, vx, vy, vz);
      }
      posAttr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity =
        1.0 - b.age / b.maxAge;
    }
  }
}
