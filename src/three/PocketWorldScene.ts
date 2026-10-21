import * as THREE from 'three';
import { CameraViewId, TimeMode, ToolId, WorldState } from '../types/world';
import { createSectTerraceMesh, PlacedObjectEntity, PlacedObjectType } from './MiniatureObjects';
import { createPlanetTerrain } from './PlanetTerrain';
import { PLANET_SCALE } from './cameraZoomRig';
import { WorldTypeId } from './worldTypes';
import { CameraSystem } from './engine/CameraSystem';
import {
  createWorldEntities,
  SECT_ZONE_ANGLE,
  SECT_ZONE_BLEND_ANGLE,
  StateReporter,
  UP_VEC,
  WorldContext,
} from './engine/context';
import { CreatureSystem } from './engine/CreatureSystem';
import { DayNightSystem } from './engine/DayNightSystem';
import { DiscipleSystem } from './engine/DiscipleSystem';
import { EffectsSystem } from './engine/EffectsSystem';
import { populateInitialWorld } from './engine/initialWorld';
import { InputSystem } from './engine/InputSystem';
import { ObjectAnimationSystem } from './engine/ObjectAnimationSystem';
import { PlacementSystem } from './engine/PlacementSystem';
import { RenderSystem } from './engine/RenderSystem';
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
  private clock = new THREE.Clock();
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
    const homeBaseDirection = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
    const levelRadius = terrain.lockFlatZone(
      homeBaseDirection,
      SECT_ZONE_ANGLE,
      SECT_ZONE_BLEND_ANGLE,
    );
    const terrace = createSectTerraceMesh(levelRadius, SECT_ZONE_ANGLE);
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
      pasture: {
        center: new THREE.Vector3(-0.20, -0.15, 0.97).normalize(),
        radius: 0.098,
        enabled: false,
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
    this.tour = new TourSystem(
      this.ctx,
      this.cameraSystem,
      this.dayNight,
      this.placement,
      this.disciples,
      this.creatures,
      this.weather,
      this.skyEvents,
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

    populateInitialWorld(this.ctx, this.placement, this.disciples, this.weather);
    this.input.bind();
    this.renderSystem.watchResize(this.cameraSystem.camera);
    this.syncWorldStats();
    this.animate();
  }

  public placeStaticObject(
    type: PlacedObjectType,
    dir: THREE.Vector3,
    yaw?: number,
    removable = true,
    withSparkles = true,
  ): PlacedObjectEntity {
    return this.placement.placeStaticObject(type, dir, yaw, removable, withSparkles);
  }

  public emitSparklesAtDir(dir: THREE.Vector3, hexColor?: string, customRadius?: number) {
    this.effects.emitSparklesAtDir(dir, hexColor, customRadius);
  }

  public handleSurfaceAction(localDir: THREE.Vector3) {
    this.placement.handleSurfaceAction(localDir);
  }

  public setTool(tool: ToolId | null) {
    this.placement.setTool(tool);
  }

  /** Restyle the whole planet; the terrain shape and placed objects are untouched */
  public setWorldType(id: WorldTypeId) {
    this.worldStyle.setWorldType(id);
  }

  public setTimeMode(mode: TimeMode) {
    this.dayNight.setTimeMode(mode);
  }

  public setTimeOfDayManual(val: number) {
    this.dayNight.setTimeOfDayManual(val);
  }

  public zoomByFactor(factor: number) {
    if (this.tour.active) return;
    this.cameraSystem.zoomByFactor(factor);
  }

  public applyCameraPreset(view: CameraViewId, immediate = false) {
    this.cameraSystem.applyPreset(view, immediate);
  }

  public startTour() {
    this.tour.start();
  }

  public stopTour() {
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

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();
    const { planetRoot, terrain } = this.ctx;

    this.skyEvents.tickGaze(dt);

    // 1. Tour or Auto Time-of-Day advancement
    if (this.tour.active) {
      this.tour.update();
    } else if (this.dayNight.advance(dt)) {
      this.syncWorldStats();
    }

    // 2. Camera and planet orientation. The scripted tour poses the planet itself;
    // otherwise the globe controller owns it
    this.cameraSystem.updateIntroSpin(dt, this.input.isDragging || this.tour.active);
    if (!this.tour.active) {
      this.cameraSystem.updateGlobe(dt, planetRoot);
    }
    this.worldStyle.update(dt);
    this.cameraSystem.updateFollow(dt, this.tour.active);

    // 3. Daylight, sky and lights
    const light = this.dayNight.daylight();
    this.sky.update(
      this.dayNight.timeOfDay,
      light,
      elapsed,
      planetRoot.quaternion,
      this.weather.intensity,
    );
    terrain.update(elapsed, dt, light.night);

    // 4. Placed objects, inhabitants, weather and sky life
    this.objectAnimation.update({
      dt,
      elapsed,
      warmGlow: light.warmGlow,
      camera: this.cameraSystem.camera,
      holdBeamsAcrossView: this.tour.active && this.tour.time >= 27.0,
    });
    const bridgesAndDocks = getBridgesAndDocks(this.ctx);
    this.disciples.update(dt, elapsed, this.skyEvents.isGazing, bridgesAndDocks);
    this.creatures.updateSheep(dt, elapsed);
    this.creatures.updateSailboats(dt, elapsed, light.warmGlow, bridgesAndDocks);
    this.creatures.updateDucks(dt, elapsed, bridgesAndDocks);
    this.skyEvents.updateBalloons(dt, elapsed, light.warmGlow);
    this.weather.update(dt, elapsed);
    this.skyEvents.updateShootingStars(dt);
    this.sky.updateFireflies(light, elapsed);
    this.effects.update(dt);

    this.renderSystem.render(this.scene, this.cameraSystem.camera);
  };

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.input.dispose();
    this.renderSystem.dispose();
  }
}
