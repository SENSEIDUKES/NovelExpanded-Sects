import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlanetTerrain } from '../src/three/PlanetTerrain';
import {
  createWorldEntities,
  SECT_ZONE_ANGLE,
  SECT_ZONE_BLEND_ANGLE,
  WorldContext,
} from '../src/three/engine/context';
import { CreatureSystem } from '../src/three/engine/CreatureSystem';
import { computeDaylight, DayNightSystem } from '../src/three/engine/DayNightSystem';
import { DiscipleSystem } from '../src/three/engine/DiscipleSystem';
import { EffectsSystem } from '../src/three/engine/EffectsSystem';
import { populateInitialWorld } from '../src/three/engine/initialWorld';
import { PlacementSystem } from '../src/three/engine/PlacementSystem';
import { SkyEventsSystem } from '../src/three/engine/SkyEventsSystem';
import { getBridgesAndDocks, getObjectCollisionRadius } from '../src/three/engine/spatial';
import { WeatherSystem } from '../src/three/engine/WeatherSystem';
import { computeWorldStats } from '../src/three/engine/worldStats';
import type { WorldState } from '../src/types/world';

/**
 * The engine systems run without a browser: build a world from them directly, the way
 * the controller does minus rendering, and check what they promise.
 */
function buildHeadlessWorld() {
  const reports: ((prev: WorldState) => WorldState)[] = [];
  const planetRoot = new THREE.Group();
  const terrain = createPlanetTerrain();
  const homeBaseDirection = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
  terrain.lockFlatZone(homeBaseDirection, SECT_ZONE_ANGLE, SECT_ZONE_BLEND_ANGLE);
  const groups = {
    objects: new THREE.Group(),
    inhabitants: new THREE.Group(),
    atmosphere: new THREE.Group(),
    effects: new THREE.Group(),
  };
  const effects = new EffectsSystem(terrain, groups.effects, null);
  let statsSyncs = 0;
  const ctx: WorldContext = {
    planetRoot,
    terrain,
    groups,
    entities: createWorldEntities(),
    homeBaseDirection,
    pasture: { center: new THREE.Vector3(-0.2, -0.15, 0.97).normalize(), radius: 0.098, enabled: false },
    emitSparkles: (dir, color, radius) => effects.emitSparklesAtDir(dir, color, radius),
    report: (updater) => reports.push(updater),
    syncStats: () => {
      statsSyncs++;
    },
  };
  const dayNight = new DayNightSystem(ctx.report);
  const disciples = new DiscipleSystem(ctx, dayNight);
  const creatures = new CreatureSystem(ctx);
  const weather = new WeatherSystem(ctx);
  const skyEvents = new SkyEventsSystem(ctx);
  const placement = new PlacementSystem(ctx, disciples, creatures, weather, skyEvents);
  populateInitialWorld(ctx, placement, disciples, weather);
  return { ctx, dayNight, disciples, placement, effects, statsSyncs: () => statsSyncs };
}

// 1. The starting world: one pagoda at home base, disciples and clouds
{
  const { ctx } = buildHeadlessWorld();
  const pagodas = ctx.entities.placedObjects.filter((o) => o.type === 'pagoda');
  assert.equal(pagodas.length, 1, 'every Sect world starts with exactly one pagoda');
  assert.ok(pagodas[0].dir.distanceTo(ctx.homeBaseDirection) < 1e-6, 'the pagoda stands at home base');
  assert.equal(pagodas[0].removable, false, 'the pagoda cannot be removed');
  assert.equal(ctx.entities.villagers.length, 4);
  assert.equal(ctx.entities.clouds.length, 2);
  assert.equal(computeWorldStats(ctx.entities).population, 4);
}

// 2. Disciples walk for a simulated minute without entering the pagoda or the water
{
  const { ctx, disciples, effects } = buildHeadlessWorld();
  const pagoda = ctx.entities.placedObjects.find((o) => o.type === 'pagoda')!;
  // Disciples nudging apart from each other can press them a hair (~0.0025) into a
  // footprint; anything deeper means they're walking through the building
  const keepOut = getObjectCollisionRadius('pagoda') + 0.012 - 0.005;
  const dt = 1 / 30;
  let moved = 0;
  const start = ctx.entities.villagers.map((v) => v.dir.clone());
  for (let frame = 0; frame < 1800; frame++) {
    disciples.update(dt, frame * dt, false, getBridgesAndDocks(ctx));
    effects.update(dt);
    for (const v of ctx.entities.villagers) {
      assert.ok(v.dir.distanceTo(pagoda.dir) >= keepOut, `frame ${frame}: a disciple walked into the pagoda`);
      assert.ok(!ctx.terrain.getSurfacePointAndNormal(v.dir).isWater, `frame ${frame}: a disciple walked into water`);
    }
  }
  ctx.entities.villagers.forEach((v, i) => {
    moved = Math.max(moved, v.dir.distanceTo(start[i]));
  });
  assert.ok(moved > 0.02, 'disciples actually walk around');
}

// 3. Placement: the Sect grounds are locked, items place once and disarm, brushes stay armed
{
  const { ctx, placement } = buildHeadlessWorld();
  const before = ctx.entities.placedObjects.length;

  placement.setTool('flower');
  const insideGrounds = ctx.homeBaseDirection.clone().add(new THREE.Vector3(0.05, 0, 0)).normalize();
  assert.ok(insideGrounds.angleTo(ctx.homeBaseDirection) < SECT_ZONE_ANGLE);
  placement.handleSurfaceAction(insideGrounds);
  assert.equal(ctx.entities.placedObjects.length, before, 'nothing is built on the Sect grounds');
  assert.equal(placement.activeTool, 'flower', 'a blocked placement keeps the tool armed');

  const land = new THREE.Vector3(-0.66, 0.3, 0.68).normalize();
  assert.ok(!ctx.terrain.getSurfacePointAndNormal(land).isWater);
  placement.handleSurfaceAction(land);
  assert.equal(ctx.entities.placedObjects.length, before + 1, 'the flower is placed');
  assert.equal(placement.activeTool, null, 'item tools disarm after one placement');

  placement.setTool('remove');
  placement.handleSurfaceAction(land);
  assert.equal(ctx.entities.placedObjects.length, before, 'remove takes the flower back');
  assert.equal(placement.activeTool, 'remove', 'brushes stay armed');

  placement.handleSurfaceAction(ctx.homeBaseDirection);
  assert.ok(
    ctx.entities.placedObjects.some((o) => o.type === 'pagoda'),
    'the pagoda survives the remove brush',
  );
}

// 4. Day/night: the phases cover the day and the auto clock rolls over into a new day
{
  assert.deepEqual(computeDaylight(0.2), { day: 1, twilight: 0, night: 0, warmGlow: 0 });
  const night = computeDaylight(0.78);
  assert.equal(night.night, 1);
  assert.equal(night.warmGlow, 1);
  const { dayNight } = buildHeadlessWorld();
  let newDays = 0;
  for (let i = 0; i < 2000; i++) {
    if (dayNight.advance(0.05)) newDays++;
  }
  assert.equal(newDays, 1, 'about 71 seconds of auto time is one full day');
  assert.equal(dayNight.dayCount, 2);
  dayNight.setTimeMode('night');
  assert.equal(dayNight.advance(0.05), false, 'a fixed time mode holds the clock');
  assert.equal(dayNight.timeOfDay, 0.78);
}

console.log('✓ All engine system tests passed.');
