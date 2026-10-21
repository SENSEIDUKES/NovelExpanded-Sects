import * as THREE from 'three';
import type { PlacedObjectEntity } from '../MiniatureObjects';
import { PLANET_SCALE } from '../cameraZoomRig';
import type { CameraSystem } from './CameraSystem';
import { UP_VEC, WorldContext } from './context';
import type { CreatureSystem } from './CreatureSystem';
import type { DayNightSystem } from './DayNightSystem';
import type { DiscipleSystem } from './DiscipleSystem';
import type { PlacementSystem } from './PlacementSystem';
import type { SkyEventsSystem } from './SkyEventsSystem';
import { computeYawFacingTarget, getBuildingEntranceDir } from './spatial';
import type { WeatherSystem } from './WeatherSystem';

/**
 * Tour choreography: the scripted 30-second showcase. It poses the planet and camera
 * itself, runs the clock from morning to night, and fakes a few clicks that build
 * things, all of which are cleaned up when the next tour starts.
 */
export class TourSystem {
  private isActive = false;
  private elapsed = 0;
  private startTimeMs = 0;
  private lastReportedRemaining = -1;
  private stepTriggered = new Set<number>();
  private cursorDir = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
  private spawnedCleanups: (() => void)[] = [];

  constructor(
    private ctx: WorldContext,
    private camera: CameraSystem,
    private dayNight: DayNightSystem,
    private placement: PlacementSystem,
    private disciples: DiscipleSystem,
    private creatures: CreatureSystem,
    private weather: WeatherSystem,
    private skyEvents: SkyEventsSystem,
  ) {}

  get active() {
    return this.isActive;
  }

  /** Seconds since the tour started */
  get time() {
    return this.elapsed;
  }

  private clearPreviousSpawns() {
    while (this.spawnedCleanups.length > 0) {
      const fn = this.spawnedCleanups.pop();
      if (fn) fn();
    }
  }

  private trackPlacedObject(entity: PlacedObjectEntity) {
    this.spawnedCleanups.push(() => {
      const idx = this.ctx.entities.placedObjects.indexOf(entity);
      if (idx !== -1) this.ctx.entities.placedObjects.splice(idx, 1);
      this.ctx.groups.objects.remove(entity.mesh);
    });
  }

  start() {
    this.clearPreviousSpawns();
    this.isActive = true;
    this.camera.introSpinActive = false;
    this.elapsed = 0;
    this.startTimeMs = performance.now();
    this.lastReportedRemaining = 30;
    this.stepTriggered.clear();
    this.placement.resetCursor();

    // Reset planet orientation & camera to crisp morning establishing frame
    this.camera.globe.setImmediate(0, 0);
    this.ctx.planetRoot.quaternion.identity();
    this.dayNight.timeMode = 'auto';
    this.dayNight.timeOfDay = 0.22;
    this.cursorDir.set(-0.16, 0.22, 0.96).normalize();

    this.camera.targetPos.set(-0.85, 0.65, 4.15).multiplyScalar(PLANET_SCALE);
    this.camera.targetLook.set(0.0, -0.10, 0.0).multiplyScalar(PLANET_SCALE);
    this.camera.snapToTarget();

    this.ctx.syncStats();
    this.ctx.report((prev) => ({
      ...prev,
      tourActive: true,
      tourElapsed: 0,
      tourPhase: 'Act I: Full Globe Orbit',
    }));
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    this.placement.resetCursor();
    // Pick up from wherever the tour left the planet, then ease back to the preset
    this.camera.globe.syncFromQuaternion(this.ctx.planetRoot.quaternion);
    this.camera.applyPreset(this.camera.activeView, false);
    this.ctx.report((prev) => ({
      ...prev,
      tourActive: false,
      tourElapsed: 0,
      tourPhase: '',
    }));
  }

  private updateSimulatedCursor(
    t: number,
    fromTime: number,
    clickTime: number,
    fromDir: THREE.Vector3,
    targetDir: THREE.Vector3,
    isWaterTarget = false,
  ) {
    const moveDuration = Math.max(0.15, clickTime - fromTime - 0.12);
    const moveProgress = THREE.MathUtils.clamp(
      (t - fromTime) / moveDuration,
      0,
      1,
    );
    const smoothMove = moveProgress * moveProgress * (3 - 2 * moveProgress);
    this.cursorDir.copy(fromDir).lerp(targetDir, smoothMove).normalize();

    this.placement.showCursorAt(this.cursorDir, 0.006, isWaterTarget);

    // Visual click pulse right around clickTime
    const timeToClick = Math.abs(t - clickTime);
    const ringMat = this.placement.cursorRing.material as THREE.MeshBasicMaterial;
    if (timeToClick < 0.18) {
      const pulse = 1.0 - timeToClick / 0.18;
      this.placement.cursorRing.scale.setScalar(1.35 - pulse * 0.55);
      ringMat.color.set('#ffe066');
      ringMat.opacity = 0.98;
    } else {
      this.placement.cursorRing.scale.setScalar(1.25 + Math.sin(t * 8.0) * 0.08);
      ringMat.color.set('#fff8d6');
      ringMat.opacity = 0.88;
    }
  }

  update() {
    // Use exact wall-clock elapsed time so the tour lasts an exact 30.0 seconds
    this.elapsed = (performance.now() - this.startTimeMs) / 1000;
    if (this.elapsed >= 30.0) {
      this.isActive = false;
      this.placement.resetCursor();
      this.camera.applyPreset('orb', false);
      this.ctx.report((prev) => ({
        ...prev,
        tourActive: false,
        tourElapsed: 30,
        tourPhase: '',
      }));
      return;
    }

    const t = this.elapsed;
    const remainingSec = Math.max(1, Math.ceil(30.0 - t));
    if (remainingSec !== this.lastReportedRemaining) {
      this.lastReportedRemaining = remainingSec;
      this.ctx.report((prev) => ({
        ...prev,
        tourElapsed: t,
      }));
    }

    const smoothstep = (val: number) => {
      const c = THREE.MathUtils.clamp(val, 0, 1);
      return c * c * (3 - 2 * c);
    };

    // Waypoint directions for Act III simulated clicks
    const startCursorSpot = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
    const windmillSpot = new THREE.Vector3(-0.22, 0.44, 0.87).normalize();
    const cottageSpot = new THREE.Vector3(-0.04, -0.02, 0.998).normalize();
    const lighthouseSpot = new THREE.Vector3(0.18, 0.52, 0.835).normalize();
    const sailboatSpot = new THREE.Vector3(0.42, 0.14, 0.896).normalize();
    const villagerSpot = new THREE.Vector3(-0.24, 0.16, 0.957).normalize();
    const sheepSpot = new THREE.Vector3(-0.18, -0.14, 0.974).normalize();
    const campfireSpot = new THREE.Vector3(-0.12, 0.08, 0.99).normalize();
    const snowCloudSpot = new THREE.Vector3(-0.26, 0.42, 0.87).normalize();
    const rainbowSpot = new THREE.Vector3(-0.37, 0.19, 0.95).normalize();
    const balloonSpot = new THREE.Vector3(-0.05, 0.18, 0.98).normalize();

    // =========================================================================
    // ACT I (0.0s – 8.0s): Grand Reveal & Full 360° Globe Orbit
    // =========================================================================
    if (t < 2.0) {
      // 0:00 – 0:02 | Morning Establishing Shot
      const p = smoothstep(t / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.22, 0.24, p);
      this.ctx.planetRoot.quaternion.identity();
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.85, -0.45, p),
        THREE.MathUtils.lerp(0.65, 0.52, p),
        THREE.MathUtils.lerp(4.15, 3.85, p),
      );
      this.camera.targetLook.set(0.0, -0.10, 0.0);
    } else if (t < 7.0) {
      // 0:02 – 0:07 | Full 360° Planetary Rotation showcasing all 4 neighborhoods & seas
      const p = smoothstep((t - 2.0) / 5.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.24, 0.27, p);
      const spinAngle = p * Math.PI * 2;
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, spinAngle);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.45, 0.0, p),
        THREE.MathUtils.lerp(0.52, 0.42, p),
        THREE.MathUtils.lerp(3.85, 3.45, p),
      );
      this.camera.targetLook.set(0.0, -0.06, 0.0);
    } else if (t < 8.0) {
      // 0:07 – 0:08 | Settle Rotation & Zoom-In Transition toward Village
      const p = smoothstep((t - 7.0) / 1.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.27, 0.28, p);
      this.ctx.planetRoot.quaternion.identity();
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(0.0, -0.28, p),
        THREE.MathUtils.lerp(0.42, 0.36, p),
        THREE.MathUtils.lerp(3.45, 1.52, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(0.0, -0.16, p),
        THREE.MathUtils.lerp(-0.06, 0.22, p),
        THREE.MathUtils.lerp(0.0, 0.72, p),
      );
    }
    // =========================================================================
    // ACT II (8.0s – 15.0s): Close-Up Living World Inspection
    // =========================================================================
    else if (t < 10.5) {
      // 0:08 – 0:10.5 | Focus 1 — Pastel Cottages, Multi-Layered Trees & Walking Villagers
      const p = smoothstep((t - 8.0) / 2.5);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.28, 0.30, p);
      const yaw = THREE.MathUtils.lerp(0.0, 0.12, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.28, -0.12, p),
        THREE.MathUtils.lerp(0.36, 0.30, p),
        THREE.MathUtils.lerp(1.52, 1.44, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.16, -0.14, p),
        THREE.MathUtils.lerp(0.22, 0.18, p),
        THREE.MathUtils.lerp(0.72, 0.74, p),
      );
    } else if (t < 13.0) {
      // 0:10.5 – 0:13.0 | Focus 2 — Fenced Sheep Pasture & Beehive Meadow
      const p = smoothstep((t - 10.5) / 2.5);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.30, 0.32, p);
      const yaw = THREE.MathUtils.lerp(0.12, 0.18, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.12, -0.22, p),
        THREE.MathUtils.lerp(0.30, -0.14, p),
        THREE.MathUtils.lerp(1.44, 1.46, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.14, -0.16, p),
        THREE.MathUtils.lerp(0.18, -0.12, p),
        THREE.MathUtils.lerp(0.74, 0.74, p),
      );
    } else if (t < 15.0) {
      // 0:13.0 – 0:15.0 | Focus 3 — Striped Coastal Lighthouse, Timber Pier, Sailboats & Ducks
      const p = smoothstep((t - 13.0) / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.32, 0.34, p);
      const yaw = THREE.MathUtils.lerp(0.18, -0.48, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.22, 0.22, p),
        THREE.MathUtils.lerp(-0.14, 0.26, p),
        THREE.MathUtils.lerp(1.46, 1.56, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.16, 0.12, p),
        THREE.MathUtils.lerp(-0.12, 0.16, p),
        THREE.MathUtils.lerp(0.74, 0.72, p),
      );
    }
    // =========================================================================
    // ACT III (15.0s – 23.0s): Simulated Live Building & Interactive Spawning
    // =========================================================================
    else if (t < 17.0) {
      // 0:15.0 – 0:17.0 | Simulated Click 1 — Adding New Windmill & Pastel Cottage
      const p = smoothstep((t - 15.0) / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.34, 0.36, p);
      const yaw = THREE.MathUtils.lerp(-0.48, 0.08, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(0.22, -0.18, p),
        THREE.MathUtils.lerp(0.26, 0.32, p),
        THREE.MathUtils.lerp(1.56, 1.68, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(0.12, -0.10, p),
        THREE.MathUtils.lerp(0.16, 0.16, p),
        THREE.MathUtils.lerp(0.72, 0.72, p),
      );

      if (t < 15.7) {
        this.updateSimulatedCursor(
          t,
          15.0,
          15.6,
          startCursorSpot,
          windmillSpot,
          false,
        );
      } else {
        this.updateSimulatedCursor(
          t,
          15.7,
          16.4,
          windmillSpot,
          cottageSpot,
          false,
        );
      }

      if (t >= 15.6 && !this.stepTriggered.has(1)) {
        this.stepTriggered.add(1);
        const wmYaw = computeYawFacingTarget(this.ctx.terrain, windmillSpot, this.ctx.homeBaseDirection);
        const wm = this.placement.placeStaticObject('windmill', windmillSpot, wmYaw, true, true);
        this.trackPlacedObject(wm);
        this.ctx.syncStats();
      }

      if (t >= 16.4 && !this.stepTriggered.has(2)) {
        this.stepTriggered.add(2);
        const hYaw = computeYawFacingTarget(this.ctx.terrain, cottageSpot, this.ctx.homeBaseDirection);
        const newHouse = this.placement.placeStaticObject('house', cottageSpot, hYaw, true, true);
        this.trackPlacedObject(newHouse);
        const doorDir = getBuildingEntranceDir(this.ctx.terrain, newHouse, 0);
        const pathDir = doorDir.clone().lerp(this.ctx.homeBaseDirection, 0.45).normalize();
        const pathYaw = computeYawFacingTarget(this.ctx.terrain, pathDir, this.ctx.homeBaseDirection);
        const newPath = this.placement.placeStaticObject('path', pathDir, pathYaw, true, true);
        this.trackPlacedObject(newPath);
        const v1 = this.disciples.spawn(getBuildingEntranceDir(this.ctx.terrain, newHouse, -0.014), true);
        const v2 = this.disciples.spawn(getBuildingEntranceDir(this.ctx.terrain, newHouse, 0.014), true);
        this.spawnedCleanups.push(() => {
          for (const v of [v1, v2]) {
            const idx = this.ctx.entities.villagers.indexOf(v);
            if (idx !== -1) this.ctx.entities.villagers.splice(idx, 1);
            this.ctx.groups.inhabitants.remove(v.mesh);
          }
        });
        this.ctx.syncStats();
      }
    } else if (t < 19.0) {
      // 0:17.0 – 0:19.0 | Simulated Click 2 — Adding Second Cliffside Lighthouse & Sailboat
      const p = smoothstep((t - 17.0) / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.36, 0.38, p);
      const yaw = THREE.MathUtils.lerp(0.08, -0.35, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.18, 0.24, p),
        THREE.MathUtils.lerp(0.32, 0.34, p),
        THREE.MathUtils.lerp(1.68, 1.72, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.10, 0.10, p),
        THREE.MathUtils.lerp(0.16, 0.22, p),
        THREE.MathUtils.lerp(0.72, 0.72, p),
      );

      if (t < 17.7) {
        this.updateSimulatedCursor(
          t,
          17.0,
          17.6,
          cottageSpot,
          lighthouseSpot,
          false,
        );
      } else {
        this.updateSimulatedCursor(
          t,
          17.7,
          18.4,
          lighthouseSpot,
          sailboatSpot,
          true,
        );
      }

      if (t >= 17.6 && !this.stepTriggered.has(3)) {
        this.stepTriggered.add(3);
        const lh = this.placement.placeStaticObject('lighthouse', lighthouseSpot, -0.3, true, true);
        this.trackPlacedObject(lh);
        this.ctx.syncStats();
      }

      if (t >= 18.4 && !this.stepTriggered.has(4)) {
        this.stepTriggered.add(4);
        const boat = this.creatures.spawnSailboat(sailboatSpot, true);
        this.spawnedCleanups.push(() => {
          const idx = this.ctx.entities.sailboats.indexOf(boat);
          if (idx !== -1) this.ctx.entities.sailboats.splice(idx, 1);
          this.ctx.groups.inhabitants.remove(boat.mesh);
        });
        this.ctx.syncStats();
      }
    } else if (t < 21.0) {
      // 0:19.0 – 0:21.0 | Simulated Click 3 — Spawning Villagers, Sheep, Campfire & Lantern
      const p = smoothstep((t - 19.0) / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.38, 0.41, p);
      const yaw = THREE.MathUtils.lerp(-0.35, 0.05, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(0.24, -0.20, p),
        THREE.MathUtils.lerp(0.34, 0.20, p),
        THREE.MathUtils.lerp(1.72, 1.66, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(0.10, -0.14, p),
        THREE.MathUtils.lerp(0.22, 0.10, p),
        THREE.MathUtils.lerp(0.72, 0.74, p),
      );

      if (t < 19.5) {
        this.updateSimulatedCursor(
          t,
          19.0,
          19.4,
          sailboatSpot,
          villagerSpot,
          false,
        );
      } else if (t < 20.2) {
        this.updateSimulatedCursor(
          t,
          19.5,
          20.1,
          villagerSpot,
          sheepSpot,
          false,
        );
      } else {
        this.updateSimulatedCursor(
          t,
          20.2,
          20.7,
          sheepSpot,
          campfireSpot,
          false,
        );
      }

      if (t >= 19.4 && !this.stepTriggered.has(5)) {
        this.stepTriggered.add(5);
        const vA = this.disciples.spawn(villagerSpot, true);
        const vB = this.disciples.spawn(
          new THREE.Vector3(-0.10, 0.14, 0.985).normalize(),
          true,
        );
        this.spawnedCleanups.push(() => {
          for (const v of [vA, vB]) {
            const idx = this.ctx.entities.villagers.indexOf(v);
            if (idx !== -1) this.ctx.entities.villagers.splice(idx, 1);
            this.ctx.groups.inhabitants.remove(v.mesh);
          }
        });
        this.ctx.syncStats();
      }

      if (t >= 20.1 && !this.stepTriggered.has(6)) {
        this.stepTriggered.add(6);
        const sA = this.creatures.spawnSheep(sheepSpot, true, true);
        const sB = this.creatures.spawnSheep(
          new THREE.Vector3(-0.28, 0.02, 0.96).normalize(),
          true,
          false,
        );
        this.spawnedCleanups.push(() => {
          for (const s of [sA, sB]) {
            const idx = this.ctx.entities.sheep.indexOf(s);
            if (idx !== -1) this.ctx.entities.sheep.splice(idx, 1);
            this.ctx.groups.inhabitants.remove(s.mesh);
          }
        });
        this.ctx.syncStats();
      }

      if (t >= 20.7 && !this.stepTriggered.has(7)) {
        this.stepTriggered.add(7);
        const cf = this.placement.placeStaticObject('campfire', campfireSpot, 0.4, true, true);
        this.trackPlacedObject(cf);
        const lp = this.placement.placeStaticObject(
          'lantern',
          new THREE.Vector3(-0.24, 0.28, 0.93).normalize(),
          0.0,
          true,
          true,
        );
        this.trackPlacedObject(lp);
        this.ctx.syncStats();
      }
    } else if (t < 23.0) {
      // 0:21.0 – 0:23.0 | Simulated Click 4 — Weather Magic: Snow/Rain Cloud, Rainbow Arch & Hot Air Balloon
      const p = smoothstep((t - 21.0) / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.41, 0.45, p);
      const yaw = THREE.MathUtils.lerp(0.05, 0.0, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.20, -0.16, p),
        THREE.MathUtils.lerp(0.20, 0.34, p),
        THREE.MathUtils.lerp(1.66, 2.15, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.14, -0.08, p),
        THREE.MathUtils.lerp(0.10, 0.18, p),
        THREE.MathUtils.lerp(0.74, 0.55, p),
      );

      if (t < 21.4) {
        this.updateSimulatedCursor(
          t,
          21.0,
          21.3,
          campfireSpot,
          snowCloudSpot,
          false,
        );
      } else if (t < 22.0) {
        this.updateSimulatedCursor(
          t,
          21.4,
          21.9,
          snowCloudSpot,
          rainbowSpot,
          false,
        );
      } else if (t < 22.75) {
        this.updateSimulatedCursor(
          t,
          22.0,
          22.5,
          rainbowSpot,
          balloonSpot,
          false,
        );
      } else {
        this.placement.hideCursor();
      }

      if (t >= 21.3 && !this.stepTriggered.has(8)) {
        this.stepTriggered.add(8);
        const snowCloud = this.weather.spawnCloud(snowCloudSpot, true, 5.5, true);
        this.spawnedCleanups.push(() => {
          const idx = this.ctx.entities.clouds.indexOf(snowCloud);
          if (idx !== -1) this.ctx.entities.clouds.splice(idx, 1);
          this.ctx.groups.atmosphere.remove(snowCloud.mesh);
        });
        if (this.ctx.entities.clouds.length > 0) {
          this.ctx.entities.clouds[0].currentDir.set(-0.12, 0.24, 0.96).normalize();
          this.ctx.entities.clouds[0].isRaining = true;
          this.ctx.entities.clouds[0].rainTimer = 4.5;
        }
        // Nourish existing trees with a joyful growth bounce
        for (const obj of this.ctx.entities.placedObjects) {
          if (obj.type === 'oak' || obj.type === 'pine' || obj.type === 'palm') {
            obj.targetGrowth = Math.min(1.38, obj.targetGrowth + 0.16);
            obj.bounceTime = 0;
            obj.bounceActive = true;
          }
        }
        this.ctx.syncStats();
      }

      if (t >= 21.9 && !this.stepTriggered.has(9)) {
        this.stepTriggered.add(9);
        const rb = this.placement.placeStaticObject('rainbow', rainbowSpot, -0.25, true, true);
        this.trackPlacedObject(rb);
        this.ctx.syncStats();
      }

      if (t >= 22.5 && !this.stepTriggered.has(10)) {
        this.stepTriggered.add(10);
        const bal = this.skyEvents.spawnBalloon(balloonSpot, true);
        this.spawnedCleanups.push(() => {
          const idx = this.ctx.entities.balloons.indexOf(bal);
          if (idx !== -1) this.ctx.entities.balloons.splice(idx, 1);
          this.ctx.groups.atmosphere.remove(bal.mesh);
        });
        this.ctx.syncStats();
      }
    }
    // =========================================================================
    // ACT IV (23.0s – 30.0s): Golden Twilight, Nighttime Glow & Finale Pull-Back
    // =========================================================================
    else if (t < 26.5) {
      // 0:23.0 – 0:26.5 | Sunset to Blue Twilight & Night Transition (Windows, Campfires, Lighthouses & Fireflies ignite)
      this.placement.hideCursor();
      const p = smoothstep((t - 23.0) / 3.5);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.45, 0.76, p);
      const yaw = THREE.MathUtils.lerp(0.0, -0.18, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.16, 0.18, p),
        THREE.MathUtils.lerp(0.34, 0.32, p),
        THREE.MathUtils.lerp(2.15, 2.35, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.08, -0.04, p),
        THREE.MathUtils.lerp(0.18, 0.12, p),
        THREE.MathUtils.lerp(0.55, 0.42, p),
      );
    } else if (t < 28.5) {
      // 0:26.5 – 0:28.5 | Shooting Star Wonder Moment across the Starry Night Orb
      this.placement.hideCursor();
      const p = smoothstep((t - 26.5) / 2.0);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.76, 0.80, p);
      const yaw = THREE.MathUtils.lerp(-0.18, -0.06, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(0.18, -0.35, p),
        THREE.MathUtils.lerp(0.32, 0.48, p),
        THREE.MathUtils.lerp(2.35, 2.95, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.04, -0.02, p),
        THREE.MathUtils.lerp(0.12, 0.05, p),
        THREE.MathUtils.lerp(0.42, 0.25, p),
      );

      if (t >= 26.6 && !this.stepTriggered.has(11)) {
        this.stepTriggered.add(11);
        this.skyEvents.spawnShootingStar(new THREE.Vector3(-0.22, 0.52, 0.82).normalize());
      }
      if (t >= 27.4 && !this.stepTriggered.has(12)) {
        this.stepTriggered.add(12);
        this.skyEvents.spawnShootingStar(new THREE.Vector3(0.25, 0.48, 0.84).normalize());
      }
    } else {
      // 0:28.5 – 0:30.0 | Grand Finale Pull-Back to Full Glass Orb Hero Framing
      this.placement.hideCursor();
      const p = smoothstep((t - 28.5) / 1.5);
      this.dayNight.timeOfDay = THREE.MathUtils.lerp(0.80, 0.82, p);
      const yaw = THREE.MathUtils.lerp(-0.06, 0.0, p);
      this.ctx.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camera.targetPos.set(
        THREE.MathUtils.lerp(-0.35, -1.12, p),
        THREE.MathUtils.lerp(0.48, 0.78, p),
        THREE.MathUtils.lerp(2.95, 4.35, p),
      );
      this.camera.targetLook.set(
        THREE.MathUtils.lerp(-0.02, 0.08, p),
        THREE.MathUtils.lerp(0.05, -0.22, p),
        THREE.MathUtils.lerp(0.25, 0.0, p),
      );
    }

    // Scale tour camera framing to match the 1.2x Sect World radius
    this.camera.targetPos.multiplyScalar(PLANET_SCALE);
    this.camera.targetLook.multiplyScalar(PLANET_SCALE);
  }
}
