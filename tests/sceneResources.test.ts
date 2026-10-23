import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorldEntities, type WorldContext } from '../src/three/engine/context';
import type { PlanetTerrainHandles } from '../src/three/PlanetTerrain';
import type { CameraSystem } from '../src/three/engine/CameraSystem';
import { DayNightSystem } from '../src/three/engine/DayNightSystem';
import { DiscipleSystem } from '../src/three/engine/DiscipleSystem';
import { CreatureSystem } from '../src/three/engine/CreatureSystem';
import { WeatherSystem } from '../src/three/engine/WeatherSystem';
import { SkyEventsSystem } from '../src/three/engine/SkyEventsSystem';
import { PlacementSystem } from '../src/three/engine/PlacementSystem';
import { SectHallSystem } from '../src/three/engine/SectHallSystem';
import { TourSystem } from '../src/three/engine/TourSystem';
import { PAGODA_STYLES, DEFAULT_PAGODA_STYLE } from '../src/three/pagodaStyles';
import { disposeSceneResources, releaseObjectResources } from '../src/three/engine/SceneResources';

/** Observe actual Three.js releases without requiring a GPU renderer. */
function releases(resource: { addEventListener: Function }): () => number {
  let count = 0;
  resource.addEventListener('dispose', () => count++);
  return () => count;
}

/** Collect the unique owned geometry/materials in a procedurally built entity. */
function observeTree(root: THREE.Object3D): (() => number)[] {
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) {
      resources.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) resources.add(material);
    }
  });
  return [...resources].map(releases);
}

/** Wire the real entity systems to uniform terrain so removal tests stay focused. */
function world() {
  const terrain = {
    seaLevel: 0.738,
    getSurfacePointAndNormal(dir: THREE.Vector3) {
      const normal = dir.clone().normalize();
      return { normal, point: normal.clone().multiplyScalar(0.76), radius: 0.76,
        isWater: false, isMountain: false, isBeach: false };
    },
  } as PlanetTerrainHandles;
  const ctx: WorldContext = {
    terrain, planetRoot: new THREE.Group(), entities: createWorldEntities(),
    groups: { objects: new THREE.Group(), inhabitants: new THREE.Group(), atmosphere: new THREE.Group(), effects: new THREE.Group() },
    homeBaseDirection: new THREE.Vector3(0, 1, 0),
    pasture: { center: new THREE.Vector3(0, 1, 0), radius: 0.098, enabled: false },
    emitSparkles() {}, report() {}, syncStats() {},
  };
  const dayNight = new DayNightSystem(ctx.report);
  const disciples = new DiscipleSystem(ctx, dayNight), creatures = new CreatureSystem(ctx);
  const weather = new WeatherSystem(ctx), skyEvents = new SkyEventsSystem(ctx);
  const placement = new PlacementSystem(ctx, disciples, creatures, weather, skyEvents);
  return { ctx, dayNight, disciples, creatures, weather, skyEvents, placement };
}

// Meshes, points and lines sharing resources inside an entity release each resource once.
{
  const geometry = new THREE.BufferGeometry(), material = new THREE.MeshBasicMaterial();
  const extraMaterial = new THREE.MeshBasicMaterial(), pointsMaterial = new THREE.PointsMaterial();
  const lineGeometry = new THREE.BufferGeometry(), lineMaterial = new THREE.LineBasicMaterial();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, [material, extraMaterial]), new THREE.Mesh(geometry, material));
  group.add(new THREE.Points(geometry, pointsMaterial), new THREE.LineSegments(lineGeometry, lineMaterial));
  const counts = observeTree(group);
  releaseObjectResources(group);
  assert.ok(counts.length >= 6, 'fixture must exercise multiple resource types');
  assert.ok(counts.every(count => count() === 1), 'shared subtree resources were skipped or released more than once');
}

// Removing one effect must preserve the sprite texture shared with other scene objects.
{
  const sprite = new THREE.Texture(), textureReleases = releases(sprite);
  const effect = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: sprite }));
  const survivor = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: sprite }));
  const counts = observeTree(effect);
  releaseObjectResources(effect);
  assert.ok(counts.every(count => count() === 1));
  assert.equal(textureReleases(), 0, 'removing an effect disposed another object’s texture');
  assert.equal(survivor.material.map, sprite);
}

// Complete teardown includes scene textures, shader uniforms and shadow render targets.
{
  const scene = new THREE.Scene();
  const texture = new THREE.Texture(), retainedTexture = new THREE.Texture();
  const uniqueReleases = releases(texture), retainedReleases = releases(retainedTexture);
  scene.environment = scene.background = texture;
  const shader = new THREE.ShaderMaterial({ uniforms: { sprites: { value: [texture, { map: retainedTexture }] } } });
  scene.add(new THREE.Mesh(new THREE.BufferGeometry(), shader));
  scene.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })));
  const light = new THREE.DirectionalLight();
  light.shadow.map = new THREE.WebGLRenderTarget(4, 4);
  const shadowReleases = releases(light.shadow.map);
  scene.add(light);
  const counts = observeTree(scene);
  disposeSceneResources(scene, { retainTextures: new Set([retainedTexture]) });
  disposeSceneResources(scene, { retainTextures: new Set([retainedTexture]) });
  assert.ok(counts.every(count => count() === 1), 'scene resources must release exactly once');
  assert.equal(uniqueReleases(), 1, 'shared environment/map texture must release once');
  assert.equal(retainedReleases(), 0, 'an externally retained texture must survive scene teardown');
  assert.equal(shadowReleases(), 1, 'shadow target was leaked');
  assert.equal(scene.children.length, 0);
  assert.equal(scene.environment, null);
  assert.equal(scene.background, null);
}

// External asset-manager ownership can retain all textures on scene teardown.
{
  const scene = new THREE.Scene(), texture = new THREE.Texture();
  const count = releases(texture);
  scene.background = texture;
  scene.add(new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: texture })));
  disposeSceneResources(scene, { disposeTextures: false });
  assert.equal(count(), 0);
}

// The actual erase tool releases a campfire's meshes and ember points, then unregisters it.
{
  const { ctx, placement } = world();
  const dir = new THREE.Vector3(0.4, 1, 0).normalize();
  const object = placement.placeStaticObject('campfire', dir, 0, true, false);
  const counts = observeTree(object.mesh);
  placement.setTool('remove');
  placement.handleSurfaceAction(dir);
  assert.equal(ctx.entities.placedObjects.length, 0);
  assert.equal(object.mesh.parent, null);
  assert.ok(counts.every(count => count() === 1), 'the erase tool leaked geometry or materials');
}

// Natural expiry of shooting stars follows the same release contract as the erase tool.
{
  const { ctx, skyEvents } = world();
  const star = skyEvents.spawnShootingStar(new THREE.Vector3(0, 1, 0));
  const counts = observeTree(star.mesh);
  skyEvents.updateShootingStars(star.maxAge + 1);
  assert.equal(ctx.entities.shootingStars.length, 0);
  assert.equal(star.mesh.parent, null);
  assert.ok(counts.every(count => count() === 1), 'expired shooting star resources leaked');
}

// Switching pagoda style releases the old style's shared materials exactly once.
{
  const { ctx, placement } = world();
  const pagoda = placement.placeStaticObject('pagoda', ctx.homeBaseDirection, 0, false, false);
  const oldMesh = pagoda.mesh, counts = observeTree(oldMesh);
  const hall = new SectHallSystem(ctx);
  hall.setPagodaStyle(PAGODA_STYLES.find(style => style.id !== DEFAULT_PAGODA_STYLE)!.id);
  assert.notEqual(pagoda.mesh, oldMesh);
  assert.equal(oldMesh.parent, null);
  assert.ok(counts.every(count => count() === 1), 'style replacement did not release each old resource once');
  assert.equal(pagoda.mesh.parent, ctx.groups.objects);
}

// Tour restarts free spawned clouds (including rain lines/snow points), arches and balloons.
// Its injected active clock can remain stationary while the host is paused.
{
  const { ctx, dayNight, disciples, creatures, weather, skyEvents, placement } = world();
  const camera = {
    introSpinActive: true, globe: { setImmediate() {}, syncFromQuaternion() {} },
    targetPos: new THREE.Vector3(), targetLook: new THREE.Vector3(), snapToTarget() {}, applyPreset() {},
  } as unknown as CameraSystem;
  let activeSeconds = 100;
  const tour = new TourSystem(ctx, camera, dayNight, placement, disciples, creatures, weather, skyEvents, () => activeSeconds);
  tour.start();
  activeSeconds += 21.5;
  tour.update();
  tour.update();
  assert.equal(tour.time, 21.5, 'tour jumped despite stationary active engine time');
  activeSeconds += 1.1;
  tour.update();
  const entities = [...ctx.entities.clouds, ...ctx.entities.balloons, ...ctx.entities.placedObjects];
  assert.ok(entities.length >= 3, 'fixture must spawn weather and placed objects');
  const counts = entities.flatMap(entity => observeTree(entity.mesh));
  // A tracked object may already have been erased before the next tour starts.
  const rainbow = ctx.entities.placedObjects.find(entity => entity.type === 'rainbow')!;
  placement.setTool('remove');
  placement.handleSurfaceAction(rainbow.dir);
  tour.start();
  assert.equal(ctx.entities.clouds.length + ctx.entities.balloons.length + ctx.entities.placedObjects.length, 0);
  assert.ok(counts.every(count => count() === 1), 'restarting a tour leaked temporary resources');
}

console.log('✓ All scene resource lifecycle tests passed.');
