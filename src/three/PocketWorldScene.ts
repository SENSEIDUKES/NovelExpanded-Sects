import * as THREE from 'three';
import { EngineRuntime, type EngineFixedFrame, type EngineFrame } from '../engine';
import { SECT_WORLD_DEFINITION } from '../game/sects/worldDefinition';
import { populateSectWorld } from '../game/sects/initialWorld';
import { disposeSceneResources } from './engine/SceneResources';
import { CameraViewId, TimeMode, ToolId, WorldState } from '../types/world';
import { createSectTerraceMesh, PlacedObjectEntity, PlacedObjectType } from './MiniatureObjects';
import { createPlanetTerrain } from './PlanetTerrain';
import { PLANET_SCALE } from './cameraZoomRig';
import { PagodaStyleId } from './pagodaStyles';
import { WorldTypeId } from './worldTypes';
import { CameraSystem } from './engine/CameraSystem';
import {
  createWorldEntities,
  StateReporter,
  UP_VEC,
  WorldContext,
} from './engine/context';
import { CreatureSystem } from './engine/CreatureSystem';
import { DayNightSystem } from './engine/DayNightSystem';
import { DiscipleSystem } from './engine/DiscipleSystem';
import { EffectsSystem } from './engine/EffectsSystem';
import { InputSystem } from './engine/InputSystem';
import { ObjectAnimationSystem } from './engine/ObjectAnimationSystem';
import { PlacementSystem } from './engine/PlacementSystem';
import { RenderSystem } from './engine/RenderSystem';
import { SectHallSystem } from './engine/SectHallSystem';
import { SkyEventsSystem } from './engine/SkyEventsSystem';
import { SkySystem } from './engine/SkySystem';
import { getBridgesAndDocks } from './engine/spatial';
import { TourSystem } from './engine/TourSystem';
import { WeatherSystem } from './engine/WeatherSystem';
import { WorldStyleSystem } from './engine/WorldStyleSystem';
import { computeWorldStats } from './engine/worldStats';

/**
 * The Sect world engine. Builds the scene, wires the systems together and runs the
 * frame loop; each system under ./engine owns one area of behavior.
 */
export class PocketWorldController {
  private report: StateReporter;
  private animFrameId: number | null = null;
  private runtime: EngineRuntime;
  private previousFrameMs: number | null = null;
  private disposed = false;
  private manuallyPaused = false;
  private scene: THREE.Scene;
  private ctx: WorldContext;

  private renderSystem: RenderSystem;
  private cameraSystem: CameraSystem;
  private sky: SkySystem;
  private effects: EffectsSystem;
  private dayNight: DayNightSystem;
  private worldStyle: WorldStyleSystem;
  private disciples: DiscipleSystem;
  private creatures: CreatureSystem;
  private weather: WeatherSystem;
  private skyEvents: SkyEventsSystem;
  private placement: PlacementSystem;
  private objectAnimation: ObjectAnimationSystem;
  private sectHall: SectHallSystem;
  private tour: TourSystem;
  private input: InputSystem;

  constructor(
    container: HTMLElement,
    onStateChange: (updater: (prev: WorldState) => WorldState) => void,
  ) {
    this.report = onStateChange;

    // Rendering, camera, and the space around the planet
    this.renderSystem = new RenderSystem(container);
    this.scene = new THREE.Scene();
    this.cameraSystem = new CameraSystem(
      this.renderSystem.domElement,
      this.renderSystem.aspect,
      this.report,
    );
    this.sky = new SkySystem(this.scene);

    // Suspended Faceted Sect World Root (Scaled by 20% -> PLANET_SCALE = 1.2)
    const planetRoot = new THREE.Group();
    planetRoot.scale.setScalar(PLANET_SCALE);
    this.scene.add(planetRoot);

    const terrain = createPlanetTerrain();
    planetRoot.add(terrain.group);

    // Level and lock the Sect grounds, then pave them with the stone terrace
    const definition = SECT_WORLD_DEFINITION;
    const homeBaseDirection = new THREE.Vector3(...definition.homeDirection).normalize();
    const levelRadius = terrain.lockFlatZone(
      homeBaseDirection,
      definition.protectedGrounds.angularRadius,
      definition.protectedGrounds.blendAngularRadius,
    );
    const terrace = createSectTerraceMesh(levelRadius, definition.protectedGrounds.angularRadius);
    terrace.quaternion.setFromUnitVectors(UP_VEC, homeBaseDirection);
    planetRoot.add(terrace);

    const groups = {
      objects: new THREE.Group(),
      inhabitants: new THREE.Group(),
      atmosphere: new THREE.Group(),
      effects: new THREE.Group(),
    };
    planetRoot.add(groups.objects, groups.inhabitants, groups.atmosphere, groups.effects);

    // Sun, moon and fireflies
    this.sky.addCelestialBodies(planetRoot);
    this.sky.addFireflies(planetRoot);
    this.effects = new EffectsSystem(terrain, groups.effects, this.sky.glowSprite);

    this.ctx = {
      planetRoot,
      terrain,
      groups,
      entities: createWorldEntities(),
      homeBaseDirection,
      homeZone: definition.protectedGrounds,
      pasture: {
        center: new THREE.Vector3(...definition.pasture.direction).normalize(),
        radius: definition.pasture.radius,
        enabled: definition.pasture.enabled,
      },
      emitSparkles: (dir, hexColor, customRadius) =>
        this.effects.emitSparklesAtDir(dir, hexColor, customRadius),
      report: this.report,
      syncStats: () => this.syncWorldStats(),
    };

    // Simulation systems
    this.dayNight = new DayNightSystem(this.report);
    this.worldStyle = new WorldStyleSystem(this.ctx, this.sky.roomEnv);
    this.disciples = new DiscipleSystem(this.ctx, this.dayNight);
    this.creatures = new CreatureSystem(this.ctx);
    this.weather = new WeatherSystem(this.ctx);
    this.skyEvents = new SkyEventsSystem(this.ctx);
    this.placement = new PlacementSystem(
      this.ctx,
      this.disciples,
      this.creatures,
      this.weather,
      this.skyEvents,
    );
    this.objectAnimation = new ObjectAnimationSystem(this.ctx);
    this.sectHall = new SectHallSystem(this.ctx);
    this.runtime = new EngineRuntime({
      systems: [
        { id: 'world-resources', dispose: () => {
          try { disposeSceneResources(this.scene); }
          finally { this.renderSystem.dispose(); }
        } },
        { id: 'world-simulation', fixedUpdate: (frame) => this.updateSimulation(frame) },
        { id: 'world-presentation', update: (frame) => this.updatePresentation(frame) },
        { id: 'renderer', update: () => this.renderSystem.render(this.scene, this.cameraSystem.camera) },
        { id: 'input', dispose: () => this.input.dispose() },
      ],
    });
    this.tour = new TourSystem(
      this.ctx,
      this.cameraSystem,
      this.dayNight,
      this.placement,
      this.disciples,
      this.creatures,
      this.weather,
      this.skyEvents,
      () => this.runtime.diagnostics().elapsedSeconds,
    );
    this.input = new InputSystem(
      this.ctx,
      this.renderSystem.domElement,
      this.cameraSystem,
      this.placement,
      {
        isTourActive: () => this.tour.active,
        stopTour: () => this.stopTour(),
        zoomByFactor: (factor) => this.zoomByFactor(factor),
      },
    );

    populateSectWorld(this.ctx, this.placement, this.disciples, this.weather);
    this.input.bind();
    this.renderSystem.watchResize(this.cameraSystem.camera);
    this.syncWorldStats();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange();
    this.animate();
  }

  public placeStaticObject(
    type: PlacedObjectType,
    dir: THREE.Vector3,
    yaw?: number,
    removable = true,
    withSparkles = true,
  ): PlacedObjectEntity {
    this.assertAlive();
    return this.placement.placeStaticObject(type, dir, yaw, removable, withSparkles);
  }

  public emitSparklesAtDir(dir: THREE.Vector3, hexColor?: string, customRadius?: number) {
    this.assertAlive();
    this.effects.emitSparklesAtDir(dir, hexColor, customRadius);
  }

  public handleSurfaceAction(localDir: THREE.Vector3) {
    this.assertAlive();
    this.placement.handleSurfaceAction(localDir);
  }

  public setTool(tool: ToolId | null) {
    this.assertAlive();
    this.placement.setTool(tool);
  }

  /** Rebuild the home pagoda in a new look; its spot and footprint stay the same */
  public setPagodaStyle(id: PagodaStyleId) {
    this.assertAlive();
    this.sectHall.setPagodaStyle(id);
  }

  /** Restyle the whole planet; the terrain shape and placed objects are untouched */
  public setWorldType(id: WorldTypeId) {
    this.assertAlive();
    this.worldStyle.setWorldType(id);
  }

  public setTimeMode(mode: TimeMode) {
    this.assertAlive();
    this.dayNight.setTimeMode(mode);
  }

  public setTimeOfDayManual(val: number) {
    this.assertAlive();
    this.dayNight.setTimeOfDayManual(val);
  }

  public zoomByFactor(factor: number) {
    this.assertAlive();
    if (this.tour.active) return;
    this.cameraSystem.zoomByFactor(factor);
  }

  public applyCameraPreset(view: CameraViewId, immediate = false) {
    this.assertAlive();
    this.cameraSystem.applyPreset(view, immediate);
  }

  public startTour() {
    this.assertAlive();
    this.tour.start();
  }

  public stopTour() {
    this.assertAlive();
    this.tour.stop();
  }

  private syncWorldStats() {
    const stats = computeWorldStats(this.ctx.entities);
    this.report((prev) => ({
      ...prev,
      ...stats,
      dayCount: this.dayNight.dayCount,
    }));
  }

  /** Advance simulation at a fixed rate, independently of camera/render frequency. */
  private updateSimulation({ deltaSeconds: dt, elapsedSeconds: elapsed }: EngineFixedFrame) {
    const { terrain } = this.ctx;
    this.skyEvents.tickGaze(dt);
    if (!this.tour.active && this.dayNight.advance(dt)) this.syncWorldStats();
    const light = this.dayNight.daylight();
    terrain.update(elapsed, dt, light.night);
    const bridgesAndDocks = getBridgesAndDocks(this.ctx);
    this.disciples.update(dt, elapsed, this.skyEvents.isGazing, bridgesAndDocks);
    this.creatures.updateSheep(dt, elapsed);
    this.creatures.updateSailboats(dt, elapsed, light.warmGlow, bridgesAndDocks);
    this.creatures.updateDucks(dt, elapsed, bridgesAndDocks);
    this.skyEvents.updateBalloons(dt, elapsed, light.warmGlow);
    this.weather.update(dt, elapsed);
    this.skyEvents.updateShootingStars(dt);
    this.effects.update(dt);
  }

  /** Present once per host frame; active time freezes while paused or hidden. */
  private updatePresentation({ deltaSeconds, elapsedSeconds: elapsed }: EngineFrame) {
    if (this.tour.active) this.tour.update();
    const dt = Math.min(deltaSeconds, 0.05);
    const { planetRoot } = this.ctx;
    this.cameraSystem.updateIntroSpin(dt, this.input.isDragging || this.tour.active);
    if (!this.tour.active) this.cameraSystem.updateGlobe(dt, planetRoot);
    this.worldStyle.update(deltaSeconds);
    this.cameraSystem.updateFollow(dt, this.tour.active);
    const light = this.dayNight.daylight();
    this.sky.update(this.dayNight.timeOfDay, light, elapsed, planetRoot.quaternion, this.weather.intensity);
    this.objectAnimation.update({
      dt: deltaSeconds, elapsed, warmGlow: light.warmGlow, camera: this.cameraSystem.camera,
      holdBeamsAcrossView: this.tour.active && this.tour.time >= 27,
    });
    this.sky.updateFireflies(light, elapsed);
  }

  private animate = (timestampMs = performance.now()) => {
    if (this.disposed) return;
    const delta = this.previousFrameMs === null ? 0 : Math.max(0, (timestampMs - this.previousFrameMs) / 1000);
    this.previousFrameMs = timestampMs;
    this.runtime.advance(delta);
    this.animFrameId = requestAnimationFrame(this.animate);
  };

  private onVisibilityChange = () => {
    if (this.disposed) return;
    this.previousFrameMs = null;
    if (document.hidden || this.manuallyPaused) this.runtime.pause();
    else this.runtime.resume();
  };

  /** Freeze world and presentation clocks while retaining the current scene. */
  public pause() {
    this.assertAlive();
    this.manuallyPaused = true;
    this.onVisibilityChange();
  }

  /** Resume subsequent frames without simulating the time spent paused. */
  public resume() {
    this.assertAlive();
    this.manuallyPaused = false;
    this.onVisibilityChange();
  }

  /** Detached runtime counters plus the renderer's current resource usage. */
  public getEngineDiagnostics() {
    return {
      name: 'SEIHouse World Engine', version: '0.1.0', stage: 'foundation' as const,
      worldId: SECT_WORLD_DEFINITION.id, disposed: this.disposed,
      runtime: this.runtime.diagnostics(),
      renderer: { ...this.renderSystem.renderer.info.memory },
      population: this.ctx.entities.villagers.length,
    };
  }

  private assertAlive() {
    if (this.disposed) throw new Error('The world has been disposed');
  }

  /** Stop scheduling and release input, renderer and every owned scene resource once. */
  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.runtime.dispose();
  }
}
