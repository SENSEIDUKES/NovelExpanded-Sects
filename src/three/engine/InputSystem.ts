import * as THREE from 'three';
import {
  computeNextPinchZoomDistance,
  computeNextWheelZoomDistance,
} from '../cameraZoomRig';
import { globeQuaternion, solveFacingOrientation, sphereHitWorld } from '../globeOrbit';
import type { CameraSystem } from './CameraSystem';
import type { WorldContext } from './context';
import type { PlacementSystem } from './PlacementSystem';

/** What input needs from the rest of the engine beyond the camera and placement */
export interface InputHooks {
  isTourActive: () => boolean;
  stopTour: () => void;
  zoomByFactor: (factor: number) => void;
}

/**
 * Pointer, touch, wheel and keyboard input. Turns gestures into intent: grab-to-spin,
 * pinch and wheel zoom toward the pointer, taps that use the armed tool, double-tap
 * focus, and keyboard zoom and nudges.
 */
export class InputSystem {
  private isPointerDown = false;
  private isDraggingSpin = false;
  private pointerDownPos = new THREE.Vector2();
  private lastPointerPos = new THREE.Vector2();
  // A touch that lands while the globe is moving only stops it; it doesn't place anything
  private pointerDownStoppedMotion = false;
  private lastTapTime = 0;
  private lastTapPos = new THREE.Vector2();
  // Planet-space spot grabbed by the current drag; kept under the pointer while it moves
  private grabbedLocalDir: THREE.Vector3 | null = null;

  // Multi-touch pinch-to-zoom state
  private activePointers = new Map<number, THREE.Vector2>();
  private isPinching = false;
  private lastPinchDist = 0;
  private pinchCooldownUntil = 0;

  private cleanup: (() => void) | null = null;

  constructor(
    private ctx: WorldContext,
    private dom: HTMLCanvasElement,
    private camera: CameraSystem,
    private placement: PlacementSystem,
    private hooks: InputHooks,
  ) {}

  /** True while the pointer is spinning the globe */
  get isDragging() {
    return this.isDraggingSpin;
  }

  bind() {
    const dom = this.dom;
    const { globe } = this.camera;
    dom.style.touchAction = 'none';
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const updateNDC = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getTerrainHit = (e: PointerEvent) => {
      updateNDC(e);
      raycaster.setFromCamera(pointerNDC, this.camera.camera);
      const hits = raycaster.intersectObjects(
        [this.ctx.terrain.terrainMesh, this.ctx.terrain.waterMesh],
        false,
      );
      if (hits.length > 0) {
        const worldPt = hits[0].point.clone();
        const localPt = this.ctx.planetRoot.worldToLocal(worldPt);
        return localPt.normalize();
      }
      return null;
    };

    const getActivePinchDistance = (): number => {
      const pts = Array.from(this.activePointers.values());
      if (pts.length < 2) return 0;
      return pts[0].distanceTo(pts[1]);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      if (this.hooks.isTourActive()) return;

      this.activePointers.set(
        e.pointerId,
        new THREE.Vector2(e.clientX, e.clientY),
      );

      if (this.activePointers.size >= 2) {
        // Switch immediately to mobile two-finger pinch-to-zoom mode
        this.isPinching = true;
        this.isDraggingSpin = false;
        this.isPointerDown = false;
        if (globe.isDragging) globe.endDrag(performance.now());
        globe.stopGlide();
        this.placement.hideCursor();
        this.lastPinchDist = getActivePinchDistance();
        return;
      }

      if (performance.now() < this.pinchCooldownUntil) return;

      this.isPointerDown = true;
      this.isDraggingSpin = false;
      this.pointerDownPos.set(e.clientX, e.clientY);
      this.lastPointerPos.set(e.clientX, e.clientY);
      // Grabbing a gliding or transitioning globe catches it in place
      this.pointerDownStoppedMotion = !globe.isSettled;
      globe.beginDrag(performance.now());
      this.grabbedLocalDir = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.hooks.isTourActive()) {
        return;
      }

      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.get(e.pointerId)!.set(e.clientX, e.clientY);
      }

      // Handle mobile two-finger pinch-to-zoom
      if (this.activePointers.size >= 2) {
        this.isPinching = true;
        this.camera.introSpinActive = false;
        this.placement.hideCursor();
        const currentPinchDist = getActivePinchDistance();
        if (this.lastPinchDist > 4 && currentPinchDist > 4) {
          const pts = Array.from(this.activePointers.values());
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          this.camera.zoomTowardScreenPoint(
            computeNextPinchZoomDistance(
              this.camera.zoomDistance,
              this.lastPinchDist,
              currentPinchDist,
            ),
            midX,
            midY,
          );
        }
        this.lastPinchDist = currentPinchDist;
        return;
      }

      if (this.isPinching || performance.now() < this.pinchCooldownUntil) {
        this.placement.hideCursor();
        return;
      }

      const hitDir = getTerrainHit(e);
      if (
        hitDir &&
        this.placement.activeTool &&
        !this.isDraggingSpin &&
        e.pointerType !== 'touch'
      ) {
        const surf = this.ctx.terrain.getSurfacePointAndNormal(hitDir);
        this.placement.showCursorAt(hitDir, 0.004, surf.isWater);
      } else {
        this.placement.hideCursor();
      }

      if (!this.isPointerDown) return;

      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      const totalDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y,
      );

      if (totalDist > 5) {
        this.isDraggingSpin = true;
        this.placement.hideCursor();
      }

      if (this.isDraggingSpin) {
        // Keep the grabbed spot under the pointer, like holding a real globe
        const now = performance.now();
        const worldHit = sphereHitWorld(
          this.camera.camera,
          this.camera.screenToNdc(e.clientX, e.clientY),
          this.camera.surfaceRadius,
          this.camera.probeRaycaster,
        );
        if (worldHit && this.grabbedLocalDir) {
          const goal = solveFacingOrientation(
            this.grabbedLocalDir,
            worldHit,
            globe.targetYaw,
            globe.targetPitch,
          );
          globe.dragTo(goal.yaw, goal.pitch, now);
        } else {
          // Off the globe or at its rim: rotate by distance moved instead
          const step = this.camera.radiansPerScreenPixel();
          globe.dragBy(dx * step, dy * step, now);
        }
        // (Re)grab whatever is under the pointer now, in the orientation it is heading to
        this.grabbedLocalDir = worldHit
          ? worldHit
              .normalize()
              .applyQuaternion(
                globeQuaternion(globe.targetYaw, globe.targetPitch).invert(),
              )
          : null;
      }

      this.lastPointerPos.set(e.clientX, e.clientY);
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);

      if (this.isPinching) {
        if (this.activePointers.size < 2) {
          this.lastPinchDist = 0;
          this.pinchCooldownUntil = performance.now() + 180;
        }
        if (this.activePointers.size === 0) {
          this.isPinching = false;
        }
        this.isPointerDown = false;
        this.isDraggingSpin = false;
        return;
      }

      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      globe.endDrag(performance.now());

      if (
        !this.isDraggingSpin &&
        !this.pointerDownStoppedMotion &&
        performance.now() >= this.pinchCooldownUntil &&
        (e.pointerType !== 'mouse' || e.button === 0)
      ) {
        const hitDir = getTerrainHit(e);
        if (hitDir) {
          if (this.placement.activeTool) {
            this.placement.handleSurfaceAction(hitDir);
          } else {
            // With nothing armed, a double-tap focuses the camera on that spot
            const now = performance.now();
            const isDoubleTap =
              now - this.lastTapTime < 320 &&
              this.lastTapPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 24;
            if (isDoubleTap) {
              this.lastTapTime = 0;
              this.camera.focusOnSurfaceDir(hitDir);
            } else {
              this.lastTapTime = now;
              this.lastTapPos.set(e.clientX, e.clientY);
            }
          }
        }
      }
      this.isDraggingSpin = false;
      this.pointerDownStoppedMotion = false;
      this.grabbedLocalDir = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (this.hooks.isTourActive()) return;
      this.camera.introSpinActive = false;
      this.camera.zoomTowardScreenPoint(
        computeNextWheelZoomDistance(this.camera.zoomDistance, e.deltaY, e.deltaMode),
        e.clientX,
        e.clientY,
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't steer the camera while typing (e.g. renaming the world)
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      const tourActive = this.hooks.isTourActive();
      if (e.key === 'Escape' && tourActive) {
        this.hooks.stopTour();
      } else if (e.key === '=' || e.key === '+') {
        this.hooks.zoomByFactor(0.88);
      } else if (e.key === '-' || e.key === '_') {
        this.hooks.zoomByFactor(1.14);
      } else if (!tourActive && e.key.startsWith('Arrow')) {
        e.preventDefault();
        this.camera.introSpinActive = false;
        const push = 1.4;
        if (e.key === 'ArrowLeft') globe.nudge(-push, 0);
        if (e.key === 'ArrowRight') globe.nudge(push, 0);
        if (e.key === 'ArrowUp') globe.nudge(0, -push);
        if (e.key === 'ArrowDown') globe.nudge(0, push);
      }
    };

    // Right-drag spins the globe, so keep the browser menu out of the way
    const onContextMenu = (e: Event) => e.preventDefault();

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUpOrCancel);
    window.addEventListener('pointercancel', onPointerUpOrCancel);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);

    this.cleanup = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUpOrCancel);
      window.removeEventListener('pointercancel', onPointerUpOrCancel);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    };
  }

  dispose() {
    this.cleanup?.();
    this.cleanup = null;
  }
}
