import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { PlanetTerrainHandles } from '../src/three/PlanetTerrain';
import type { PlacedObjectEntity, PlacedObjectType } from '../src/three/MiniatureObjects';
import { createWorldEntities, type WorldContext } from '../src/three/engine/context';
import { DiscipleSystem } from '../src/three/engine/DiscipleSystem';
import { CreatureSystem } from '../src/three/engine/CreatureSystem';
import { DayNightSystem } from '../src/three/engine/DayNightSystem';
import { DISCIPLE_RADIUS, SHEEP_RADIUS, SurfaceNavigation, WalkingRoutes } from '../src/three/engine/SurfaceNavigation';
import { getRainbowFootDirs, isPositionClearOfObstacles } from '../src/three/engine/spatial';

const dir = (x: number, z: number) => new THREE.Vector3(x, 1, z).normalize();
/** Uniform spherical terrain with optional water regions for collision scenarios. */
function world(water: (d: THREE.Vector3) => boolean = () => false): WorldContext {
  const terrain = {
    seaLevel: 0.738,
    getSurfacePointAndNormal(d: THREE.Vector3) {
      const normal = d.clone().normalize();
      return { normal, point: normal.clone().multiplyScalar(0.76), radius: 0.76,
        isWater: water(d), isMountain: false, isBeach: false };
    },
  } as PlanetTerrainHandles;
  return {
    terrain, planetRoot: new THREE.Group(), entities: createWorldEntities(),
    groups: { objects: new THREE.Group(), inhabitants: new THREE.Group(), atmosphere: new THREE.Group(), effects: new THREE.Group() },
    homeBaseDirection: dir(0, 0), pasture: { center: dir(0, 0), radius: 0.098, enabled: false },
    emitSparkles() {}, report() {}, syncStats() {},
  };
}
/** Register a placed footprint without needing a WebGL renderer. */
function object(ctx: WorldContext, type: PlacedObjectType, center = dir(0, 0), yaw = 0) {
  const entity: PlacedObjectEntity = { id: `${type}_${ctx.entities.placedObjects.length}`, type,
    dir: center, yaw, mesh: new THREE.Group(), baseScale: 1, growth: 1, targetGrowth: 1,
    bounceTime: 10, bounceActive: false, removable: true };
  ctx.entities.placedObjects.push(entity);
  return entity;
}
/** Wire a real disciple system to the lightweight test world. */
function disciples(ctx: WorldContext) { return new DiscipleSystem(ctx, new DayNightSystem(ctx.report)); }

// Reproducible movement, including real mesh/system integration without a renderer.
const originalRandom = Math.random;
const originalNow = Date.now;
let seed = 8471;
let clock = 1_700_000_000_000;
Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
Date.now = () => clock++;
try {
  // Deliberate detours reach the far side of obstacles instead of orbiting/reversing forever.
  for (const type of ['pagoda', 'fence', 'rainbow'] as const) {
    const ctx = world();
    object(ctx, type, dir(0, 0), 0.7);
    const navigation = new SurfaceNavigation(ctx);
    const routes = new WalkingRoutes();
    const agent = { id: 'walker', dir: dir(0, -0.17) };
    const goal = dir(0, 0.17);
    let reached = false;
    for (let frame = 0; frame < 600; frame++) {
      if (agent.dir.distanceTo(goal) < 0.006) { reached = true; break; }
      const heading = routes.direction(agent, goal, navigation, DISCIPLE_RADIUS, 1 / 30);
      const before = agent.dir.clone();
      if (heading) navigation.move(agent, heading, 0.09 / 30, DISCIPLE_RADIUS, []);
      assert.ok(navigation.isClear(agent.dir, DISCIPLE_RADIUS), `${type}: agent penetrated the footprint`);
      assert.ok(agent.dir.distanceTo(before) <= 0.09 / 30 + 1e-6, `${type}: agent teleported`);
    }
    assert.ok(reached, `${type}: failed to get around the obstacle`);
  }

  // Paused characters must recover from new placement and exact overlaps, even at a pole.
  {
    const ctx = world();
    const system = disciples(ctx);
    const a = system.spawn(dir(0, 0), false);
    const b = system.spawn(dir(0, 0), false);
    a.dir.copy(dir(0, 0)); b.dir.copy(a.dir);
    a.pauseTimer = b.pauseTimer = 10;
    object(ctx, 'pagoda');
    for (let frame = 0; frame < 8; frame++) system.update(1 / 30, frame / 30, false, []);
    const navigation = new SurfaceNavigation(ctx);
    for (const v of [a, b]) {
      assert.ok(navigation.isClear(v.dir, DISCIPLE_RADIUS), 'crowd correction pushed a paused character into a wall');
      assert.ok(Math.abs(v.dir.length() - 1) < 1e-10, 'pole overlap produced an invalid direction');
      assert.ok(v.mesh.position.distanceTo(ctx.terrain.getSurfacePointAndNormal(v.dir).point) < 1e-10, 'paused mesh did not follow collision correction');
    }
    assert.ok(a.dir.distanceTo(b.dir) >= 2 * DISCIPLE_RADIUS - 0.001, 'coincident characters did not separate');
  }

  // The narrow pagoda approach remains usable between its lanterns, including two-way traffic.
  {
    const ctx = world();
    object(ctx, 'pagoda', dir(0, -0.11));
    object(ctx, 'lantern', dir(-0.034, 0));
    object(ctx, 'lantern', dir(0.034, 0));
    const system = disciples(ctx);
    const a = system.spawn(dir(0, -0.012), false);
    const b = system.spawn(dir(0, 0.11), false);
    a.targetDir.copy(dir(0, 0.13)); b.targetDir.copy(dir(0, -0.01));
    a.pauseTimer = b.pauseTimer = 0;
    const startA = a.dir.clone(), startB = b.dir.clone();
    let crossed = false;
    const navigation = new SurfaceNavigation(ctx);
    for (let frame = 0; frame < 240; frame++) {
      system.update(1 / 30, frame / 30, false, []);
      for (const v of [a, b]) assert.ok(navigation.isClear(v.dir, DISCIPLE_RADIUS), 'lantern approach clipped scenery');
      if (a.dir.distanceTo(startB) < 0.03 && b.dir.distanceTo(startA) < 0.04) { crossed = true; break; }
    }
    assert.ok(crossed, 'two-way traffic stayed stuck at the lantern approach');
  }

  // Cached long journeys have a bounded per-frame validation cost, regardless of distance.
  {
    const ctx = world();
    const navigation = new SurfaceNavigation(ctx), routes = new WalkingRoutes();
    const agent = { id: 'long-walk', dir: dir(0, -0.8) }, goal = dir(0, 0.8);
    assert.ok(routes.direction(agent, goal, navigation, DISCIPLE_RADIUS, 1 / 30));
    let queries = 0;
    const surface = ctx.terrain.getSurfacePointAndNormal;
    ctx.terrain.getSurfacePointAndNormal = (...args) => { queries++; return surface(...args); };
    for (let frame = 0; frame < 60; frame++) {
      assert.ok(routes.direction(agent, goal, navigation, DISCIPLE_RADIUS, 1 / 30));
    }
    assert.ok(queries <= 60 * 16, `cached walking made ${queries} surface queries in 60 frames`);
  }

  // Sheep turn toward the detour they actually walk, even when the goal is behind a fence.
  {
    const ctx = world(); object(ctx, 'fence', dir(0, 0));
    const creatures = new CreatureSystem(ctx);
    const sheep = creatures.spawnSheep(dir(0, -0.07), false);
    sheep.targetDir.copy(dir(0, 0.12)); sheep.isGrazing = false; sheep.grazeTimer = 20;
    sheep.speed = 0.05;
    let detourFrames = 0;
    for (let frame = 0; frame < 60; frame++) {
      const before = sheep.dir.clone();
      // A slow frame completes the turn, letting us check the rendered facing directly.
      creatures.updateSheep(1 / 8, frame / 8);
      const normal = ctx.terrain.getSurfacePointAndNormal(sheep.dir).normal;
      const movement = sheep.dir.clone().sub(before).projectOnPlane(normal);
      if (movement.lengthSq() < 1e-10) continue;
      const towardGoal = sheep.targetDir.clone().sub(sheep.dir).projectOnPlane(normal).normalize();
      if (movement.clone().normalize().dot(towardGoal) > 0.9) continue;
      detourFrames++;
      const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(sheep.mesh.quaternion).projectOnPlane(normal).normalize();
      assert.ok(facing.dot(movement.normalize()) > 0.99, 'sheep faced through the obstacle instead of along its detour');
    }
    assert.ok(detourFrames > 5, 'sheep did not take a meaningful detour');
  }

  // Runtime changes invalidate the next route segment; unreachable goals have bounded retries.
  {
    const ctx = world();
    const routes = new WalkingRoutes();
    const agent = { id: 'dynamic', dir: dir(0, -0.14) }, goal = dir(0, 0.14);
    routes.direction(agent, goal, new SurfaceNavigation(ctx), DISCIPLE_RADIUS, 1 / 30);
    object(ctx, 'pagoda');
    const navigation = new SurfaceNavigation(ctx);
    const heading = routes.direction(agent, goal, navigation, DISCIPLE_RADIUS, 1);
    assert.ok(heading, 'placed scenery stopped the cached route');
    let reached = false;
    for (let frame = 0; frame < 450; frame++) {
      if (agent.dir.distanceTo(goal) < 0.006) { reached = true; break; }
      const direction = routes.direction(agent, goal, navigation, DISCIPLE_RADIUS, 1 / 30);
      if (direction) navigation.move(agent, direction, 0.09 / 30, DISCIPLE_RADIUS, []);
      assert.ok(navigation.isClear(agent.dir, DISCIPLE_RADIUS), 'a distant edit bypassed lookahead validation');
    }
    assert.ok(reached, 'cached route did not detour around newly placed scenery');
    const unreachable = dir(0, 0);
    let plans = 0;
    const route = navigation.route.bind(navigation);
    navigation.route = (...args) => { plans++; return route(...args); };
    for (let i = 0; i < 90; i++) routes.direction(agent, unreachable, navigation, DISCIPLE_RADIUS, 1 / 30);
    assert.ok(plans <= 4, `unreachable target replanned ${plans} times in 3 seconds`);
  }

  // Sweep validation blocks crossing water, and a bridge only supports its oriented deck.
  {
    const ctx = world(d => Math.abs(d.z) < 0.018);
    const agent = { id: 'water', dir: dir(0, -0.08) };
    let navigation = new SurfaceNavigation(ctx);
    navigation.move(agent, new THREE.Vector3(0, 0, 1), 0.25, DISCIPLE_RADIUS, []);
    assert.ok(agent.dir.z < -0.018, 'a long movement step tunnelled across water');
    const bridge = object(ctx, 'bridge', dir(0, 0), Math.PI / 2);
    navigation = new SurfaceNavigation(ctx);
    assert.equal(navigation.deckAt(dir(0.04, 0)), bridge, 'rotated deck is not walkable');
    assert.equal(navigation.deckAt(dir(0, 0.04)), undefined, 'water beside the bridge was treated as deck');
    assert.equal(navigation.deckAt(bridge.dir.clone().negate()), undefined, 'deck support leaked to the opposite side of the planet');
    assert.ok(!navigation.isClear(dir(0, 0.017), DISCIPLE_RADIUS), 'bridge granted a circular water exemption');
  }

  // Pausing on an arched bridge must not drop a resident through the boards.
  {
    const ctx = world(d => d.distanceTo(dir(0, 0)) < 0.06);
    object(ctx, 'bridge');
    const system = disciples(ctx);
    const v = system.spawn(dir(0, 0), false);
    v.pauseTimer = 5;
    const deckHeight = v.mesh.position.length();
    system.update(1 / 30, 0, false, ctx.entities.placedObjects);
    assert.ok(deckHeight >= ctx.terrain.seaLevel + 0.03, 'resident spawned under the arched bridge');
    assert.ok(Math.abs(v.mesh.position.length() - deckHeight) < 1e-10, 'paused resident fell through the deck');
  }

  // Spawn and terrain changes cannot strand an agent in shallow water indefinitely.
  {
    const ctx = world(d => d.distanceTo(dir(0, 0)) < 0.05);
    const system = disciples(ctx);
    const v = system.spawn(dir(0, 0), false);
    assert.ok(new SurfaceNavigation(ctx).isClear(v.dir, DISCIPLE_RADIUS), 'unsafe spawn was not relocated');
    v.dir.copy(dir(0, 0)); v.pauseTimer = 10;
    system.update(1 / 30, 0, true, []);
    assert.ok(new SurfaceNavigation(ctx).isClear(v.dir, DISCIPLE_RADIUS), 'gazing agent did not recover from terrain changes');
  }

  // Rainbow target selection and hard collision agree about the feet's clearance.
  {
    const ctx = world(); const arch = object(ctx, 'rainbow');
    const [foot] = getRainbowFootDirs(ctx.terrain, arch.dir, arch.yaw);
    const point = foot.clone().add(new THREE.Vector3(0, 0, 0.040)).normalize();
    assert.equal(isPositionClearOfObstacles(ctx, point, DISCIPLE_RADIUS), false);
    assert.equal(new SurfaceNavigation(ctx).isClear(point, DISCIPLE_RADIUS), false);
  }

  // Disabled pastures must not create an invisible wall for free-range sheep.
  {
    const ctx = world(); const creatures = new CreatureSystem(ctx);
    const sheep = creatures.spawnSheep(ctx.pasture.center, false);
    assert.ok(sheep.dir.distanceTo(ctx.pasture.center) < 1e-6, 'disabled pasture displaced a sheep');
    object(ctx, 'pine', sheep.dir.clone());
    sheep.isGrazing = true; sheep.grazeTimer = 10;
    creatures.updateSheep(1 / 30, 0);
    assert.ok(new SurfaceNavigation(ctx).isClear(sheep.dir, SHEEP_RADIUS, false, false), 'grazing sheep ignored new scenery');
  }

  // Enabled corral containment and symmetric sheep/character separation remain enforced.
  {
    const ctx = world(); ctx.pasture.enabled = true;
    const creatures = new CreatureSystem(ctx);
    const sheep = creatures.spawnSheep(dir(0.2, 0), false, true);
    assert.ok(sheep.dir.distanceTo(ctx.pasture.center) <= ctx.pasture.radius - SHEEP_RADIUS - 0.008);
    const outsider = creatures.spawnSheep(dir(0, 0), false, false);
    assert.ok(outsider.dir.distanceTo(ctx.pasture.center) >= ctx.pasture.radius + SHEEP_RADIUS + 0.008);
    ctx.pasture.enabled = false;
    const system = disciples(ctx);
    const v = system.spawn(dir(0.25, 0), false);
    outsider.dir.copy(v.dir); outsider.isGrazing = true; outsider.grazeTimer = 10;
    creatures.updateSheep(1 / 30, 0);
    assert.ok(outsider.dir.distanceTo(v.dir) >= DISCIPLE_RADIUS + SHEEP_RADIUS - 0.001);
  }
  console.log('✓ All collision and navigation regression tests passed.');
} finally {
  Math.random = originalRandom;
  Date.now = originalNow;
}
