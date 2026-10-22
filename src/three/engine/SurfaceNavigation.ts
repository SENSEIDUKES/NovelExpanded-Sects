import * as THREE from 'three';
import type { PlacedObjectEntity } from '../MiniatureObjects';
import type { WorldContext } from './context';
import {
  closestPointOnSphereSegment,
  getFenceSegmentOnSphere,
  getObjectCollisionRadius,
  getRainbowFootDirs,
} from './spatial';

export const DISCIPLE_RADIUS = 0.012;
export const SHEEP_RADIUS = 0.013;
const SKIN = 0.001;
const STEP = 0.004;

export type WalkingNeighbor = WalkingAgent & { radius: number };

type Solid = { center: THREE.Vector3; radius: number; end?: THREE.Vector3 };
export type WalkingAgent = { id: string; dir: THREE.Vector3 };

/** A stable tangent even when two centers coincide, including at either pole. */
export function surfaceTangent(dir: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().crossVectors(
    Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0),
    dir,
  ).normalize();
}

/** Set an exact chord-distance clearance on the unit sphere, without radial drift. */
function outside(center: THREE.Vector3, point: THREE.Vector3, distance: number) {
  const tangent = point.clone().projectOnPlane(center);
  if (tangent.lengthSq() < 1e-12) tangent.copy(surfaceTangent(center));
  tangent.normalize();
  const angle = 2 * Math.asin(Math.min(1, distance / 2));
  return center.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle));
}

/** Footprints are rebuilt once per system update so placement/sculpting takes effect immediately. */
export class SurfaceNavigation {
  private solids: Solid[] = [];
  private decks: { object: PlacedObjectEntity; inverse: THREE.Quaternion; point: THREE.Vector3 }[] = [];

  constructor(private ctx: WorldContext) {
    for (const object of ctx.entities.placedObjects) {
      if (object.type === 'fence') {
        const { segA, segB } = getFenceSegmentOnSphere(ctx.terrain, object);
        this.solids.push({ center: segA, end: segB, radius: 0.015 });
      } else if (object.type === 'rainbow') {
        for (const center of getRainbowFootDirs(ctx.terrain, object.dir, object.yaw)) {
          this.solids.push({ center, radius: 0.028 });
        }
      } else {
        const radius = getObjectCollisionRadius(object.type);
        if (radius > 0) this.solids.push({ center: object.dir, radius });
      }
      if (object.type === 'bridge' || object.type === 'dock') {
        const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), object.dir);
        align.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), object.yaw));
        this.decks.push({ object, inverse: align.invert(), point: object.dir.clone().multiplyScalar(ctx.terrain.seaLevel) });
      }
    }
  }

  /** Deck support follows its yaw and rectangular boards, rather than a circle of water. */
  deckAt(dir: THREE.Vector3): PlacedObjectEntity | undefined {
    return this.decks.find(({ object, inverse, point }) => {
      if (dir.dot(object.dir) < 0.98) return false;
      const local = dir.clone().multiplyScalar(this.ctx.terrain.seaLevel).sub(point).applyQuaternion(inverse);
      const minZ = object.type === 'bridge' ? -0.041 : -0.076;
      return Math.abs(local.x) <= (object.type === 'bridge' ? 0.0125 : 0.014)
        && local.z >= minZ && local.z <= 0.041;
    })?.object;
  }

  standingPoint(dir: THREE.Vector3): THREE.Vector3 {
    const surface = this.ctx.terrain.getSurfacePointAndNormal(dir);
    const deck = this.deckAt(dir);
    if (!deck) return surface.point;
    const support = this.decks.find(d => d.object === deck)!;
    const localZ = dir.clone().multiplyScalar(this.ctx.terrain.seaLevel).sub(support.point).applyQuaternion(support.inverse).z;
    const height = deck.type === 'bridge'
      ? 0.014 + Math.max(0, 0.25 - (localZ / 0.074) ** 2) * 0.068
      : THREE.MathUtils.lerp(0.0098, 0.019, THREE.MathUtils.clamp((localZ + 0.073) / 0.036, 0, 1));
    return dir.clone().multiplyScalar(Math.max(surface.radius, this.ctx.terrain.seaLevel + height));
  }

  isClear(dir: THREE.Vector3, radius: number, inPasture = false, useDecks = true): boolean {
    if (!Number.isFinite(dir.lengthSq()) || Math.abs(dir.lengthSq() - 1) > 0.001) return false;
    for (const solid of this.solids) {
      const center = solid.end ? closestPointOnSphereSegment(dir, solid.center, solid.end) : solid.center;
      if (dir.distanceToSquared(center) < (solid.radius + radius) ** 2 - 1e-10) return false;
    }
    const pasture = this.ctx.pasture;
    if (pasture.enabled) {
      const distance = dir.distanceTo(pasture.center);
      if (inPasture ? distance > pasture.radius - radius - 0.008 : distance < pasture.radius + radius + 0.008) return false;
    }
    const surface = this.ctx.terrain.getSurfacePointAndNormal(dir);
    const onDeck = useDecks && !!this.deckAt(dir);
    return onDeck || (!surface.isWater && !surface.isMountain && surface.normal.dot(dir) >= 0.75);
  }

  clearSegment(from: THREE.Vector3, to: THREE.Vector3, radius: number, inPasture = false, useDecks = true): boolean {
    const steps = Math.max(1, Math.ceil(from.distanceTo(to) / STEP));
    for (let i = 1; i <= steps; i++) {
      if (!this.isClear(from.clone().lerp(to, i / steps).normalize(), radius, inPasture, useDecks)) return false;
    }
    return true;
  }

  /** Resolve static overlaps last, so crowd pressure cannot shove an agent into a wall. */
  recover(dir: THREE.Vector3, radius: number, inPasture = false, useDecks = true, fallback?: THREE.Vector3): boolean {
    if (this.isClear(dir, radius, inPasture, useDecks)) return false;
    const original = dir.clone();
    for (let pass = 0; pass < 8; pass++) {
      for (const solid of this.solids) {
        const center = solid.end ? closestPointOnSphereSegment(dir, solid.center, solid.end) : solid.center;
        if (dir.distanceTo(center) < solid.radius + radius) {
          dir.copy(outside(center, dir, solid.radius + radius + SKIN));
        }
      }
      const p = this.ctx.pasture;
      if (p.enabled) {
        const limit = inPasture ? p.radius - radius - 0.008 : p.radius + radius + 0.008;
        if (inPasture ? dir.distanceTo(p.center) > limit : dir.distanceTo(p.center) < limit) {
          dir.copy(outside(p.center, dir, Math.max(0, limit) + (inPasture ? -SKIN : SKIN)));
        }
      }
      if (this.isClear(dir, radius, inPasture, useDecks)) return true;
    }
    if (fallback && this.isClear(fallback, radius, inPasture, useDecks)) {
      dir.copy(fallback);
      return true;
    }
    // Placement can cover a paused agent, or terrain can change under it. Find nearby safe ground.
    const right = surfaceTangent(original);
    const forward = new THREE.Vector3().crossVectors(original, right).normalize();
    for (let ring = 1; ring <= 24; ring++) {
      for (let i = 0; i < 24; i++) {
        const angle = i * Math.PI * 2 / 24;
        const candidate = original.clone()
          .addScaledVector(right, Math.cos(angle) * ring * 0.01)
          .addScaledVector(forward, Math.sin(angle) * ring * 0.01).normalize();
        if (this.isClear(candidate, radius, inPasture, useDecks)) {
          dir.copy(candidate);
          return true;
        }
      }
    }
    dir.copy(original);
    return true;
  }

  separate(agent: WalkingAgent, radius: number, neighbors: WalkingNeighbor[], inPasture = false, useDecks = true) {
    for (const other of neighbors) {
      if (other.id === agent.id) continue;
      const minimum = radius + other.radius;
      const distance = agent.dir.distanceTo(other.dir);
      if (distance >= minimum) continue;
      const push = agent.dir.clone().sub(other.dir).projectOnPlane(agent.dir);
      if (push.lengthSq() < 1e-12) {
        push.copy(surfaceTangent(agent.dir)).multiplyScalar(agent.id < other.id ? 1 : -1);
      }
      const candidate = agent.dir.clone().addScaledVector(push.normalize(), minimum - distance + 0.0001).normalize();
      if (this.clearSegment(agent.dir, candidate, radius, inPasture, useDecks)) agent.dir.copy(candidate);
    }
  }

  /** Sweep short steps; blocked movement slides along the surface instead of tunnelling. */
  move(agent: WalkingAgent, tangent: THREE.Vector3, distance: number, radius: number,
    neighbors: WalkingNeighbor[], inPasture = false, useDecks = true) {
    const steps = Math.max(1, Math.ceil(distance / STEP));
    const step = distance / steps;
    const canMove = (candidate: THREE.Vector3) => this.isClear(candidate, radius, inPasture, useDecks)
      && neighbors.every(other => {
        if (other === agent || other.id === agent.id) return true;
        const separation = radius + other.radius;
        const before = agent.dir.distanceToSquared(other.dir);
        const after = candidate.distanceToSquared(other.dir);
        return after >= separation ** 2 || after > before + 1e-10;
      });
    // Stable handedness breaks head-on symmetry without choosing a new side every frame.
    const sign = [...agent.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ? 1 : -1;
    for (let i = 0; i < steps; i++) {
      let moved = false;
      for (const angle of [0, sign * 0.45, -sign * 0.45, sign * 0.9, -sign * 0.9, sign * 1.4, -sign * 1.4]) {
        const heading = tangent.clone().projectOnPlane(agent.dir).normalize().applyAxisAngle(agent.dir, angle);
        const candidate = agent.dir.clone().addScaledVector(heading, step).normalize();
        if (canMove(candidate)) {
          agent.dir.copy(candidate);
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }
  }

  /** Bounded local A*: deliberate detours around buildings/fences and bad terrain. */
  route(from: THREE.Vector3, target: THREE.Vector3, radius: number, inPasture = false, useDecks = true): THREE.Vector3[] {
    if (this.clearSegment(from, target, radius, inPasture, useDecks)) return [target.clone()];
    const right = surfaceTangent(from);
    const forward = new THREE.Vector3().crossVectors(from, right).normalize();
    const spacing = 0.018;
    type Node = { x: number; y: number; dir: THREE.Vector3; g: number; h: number; parent?: Node };
    const first: Node = { x: 0, y: 0, dir: from.clone(), g: 0, h: from.distanceTo(target) };
    const open = [first];
    const nodes = new Map<string, Node>([['0,0', first]]);
    const closed = new Set<string>();
    let best = first;
    for (let visited = 0; open.length && visited < 700; visited++) {
      let index = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].g + open[i].h < open[index].g + open[index].h) index = i;
      }
      const current = open.splice(index, 1)[0];
      closed.add(`${current.x},${current.y}`);
      if (current.h < best.h) best = current;
      if (current.h < spacing * 1.5 && this.clearSegment(current.dir, target, radius, inPasture, useDecks)) {
        best = { x: 0, y: 0, dir: target.clone(), g: 0, h: 0, parent: current };
        break;
      }
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const x = current.x + dx, y = current.y + dy;
        if (Math.abs(x) > 22 || Math.abs(y) > 22) continue;
        const key = `${x},${y}`;
        if (closed.has(key)) continue;
        const dir = nodes.get(key)?.dir ?? from.clone().addScaledVector(right, x * spacing).addScaledVector(forward, y * spacing).normalize();
        const g = current.g + current.dir.distanceTo(dir);
        const existing = nodes.get(key);
        if (existing && existing.g <= g) continue;
        if (!this.clearSegment(current.dir, dir, radius, inPasture, useDecks)) continue;
        if (existing) {
          existing.g = g;
          existing.parent = current;
        } else {
          const node = { x, y, dir, g, h: dir.distanceTo(target), parent: current };
          nodes.set(key, node);
          open.push(node);
        }
      }
    }
    // A partial route is useful for distant goals; an unreachable goal must not cause jitter.
    if (best.h > first.h - 0.01) return [];
    const path: THREE.Vector3[] = [];
    for (let node: Node | undefined = best; node?.parent; node = node.parent) path.unshift(node.dir);
    return path;
  }
}

/** Retained per agent, so planning happens on destination changes or a blocked path, not each frame. */
export class WalkingRoutes {
  private routes = new WeakMap<WalkingAgent, { target: THREE.Vector3; points: THREE.Vector3[]; retry: number }>();

  direction(agent: WalkingAgent, target: THREE.Vector3, navigation: SurfaceNavigation, radius: number,
    dt: number, inPasture = false, useDecks = true): THREE.Vector3 | null {
    let route = this.routes.get(agent);
    if (!route || route.target.distanceToSquared(target) > 1e-8) {
      route = { target: target.clone(), points: [], retry: 0 };
      this.routes.set(agent, route);
    }
    route.retry -= dt;
    while (route.points.length && agent.dir.distanceTo(route.points[0]) < 0.004) route.points.shift();
    if (route.points.length && !navigation.clearSegment(agent.dir, route.points[0], radius, inPasture, useDecks)) {
      route.points = [];
      route.retry = 0;
    }
    if (!route.points.length && route.retry <= 0) {
      route.points = navigation.route(agent.dir, target, radius + SKIN, inPasture, useDecks);
      route.retry = 0.8;
    }
    const point = route.points[0];
    return point ? point.clone().sub(agent.dir).projectOnPlane(agent.dir).normalize() : null;
  }

  invalidate(agent: WalkingAgent) { this.routes.delete(agent); }
}
