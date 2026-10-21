import * as THREE from 'three';
import type { CameraViewId } from '../../types/world';
import {
  computeCameraPoseForZoom,
  getCameraPresetConfig,
  MAX_ZOOM_DIST,
  MIN_ZOOM_DIST,
  PLANET_SCALE,
} from '../cameraZoomRig';
import {
  GlobeOrbit,
  globeQuaternion,
  radiansPerPixel,
  solveFacingOrientation,
  sphereHitWorld,
} from '../globeOrbit';
import type { StateReporter } from './context';

/**
 * Camera and world rotation: the camera rig (presets, zoom, eased follow), the planet's
 * orientation (spin, tilt, fling), zoom toward the pointer, double-tap focus and the
 * opening spin. Input and the tour drive it; it never reads the pointer itself.
 */
export class CameraSystem {
  // Camera framed for the 1.2x scaled Sect World suspended in space,
  // with near clipping plane at 0.04 for intimate close-up inspection.
  readonly camera: THREE.PerspectiveCamera;
  // Planet orientation (spin, tilt, fling glide and eased camera transitions)
  readonly globe = new GlobeOrbit();
  readonly probeRaycaster = new THREE.Raycaster();
  private probeCamera = new THREE.PerspectiveCamera();

  private activeViewId: CameraViewId = 'orb';

  // Initial 3-second 360-degree intro spin state
  introSpinActive = true;
  private introSpinElapsed = 0;

  // Camera choreography & continuous zoom/tilt rig
  private camAnchorDir = new THREE.Vector3(-1.12, 0.78, 4.35).normalize();
  private camBaseLook = new THREE.Vector3(0.04, -0.08, 0.0);
  private targetZoomDist = 4.65;
  private camCurrentPos = new THREE.Vector3(-1.12, 0.78, 4.35);
  private camCurrentLook = new THREE.Vector3(0.04, -0.08, 0.0);
  /** Where the camera is headed; the tour writes these directly */
  readonly targetPos = new THREE.Vector3(-1.12, 0.78, 4.35);
  readonly targetLook = new THREE.Vector3(0.04, -0.08, 0.0);

  constructor(
    private dom: HTMLCanvasElement,
    aspect: number,
    private report: StateReporter,
  ) {
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.04, 80);
    this.applyPreset('orb', true);
  }

  get activeView() {
    return this.activeViewId;
  }

  get zoomDistance() {
    return this.targetZoomDist;
  }

  /** Planet surface radius in world units */
  get surfaceRadius() {
    return 0.75 * PLANET_SCALE;
  }

  private syncTargetsFromZoom(immediate = false) {
    computeCameraPoseForZoom(
      this.camAnchorDir,
      this.camBaseLook,
      this.targetZoomDist,
      this.targetPos,
      this.targetLook,
    );
    if (immediate) {
      this.snapToTarget();
    }
  }

  /** Jump the camera straight to its target (no easing) */
  snapToTarget() {
    this.camCurrentPos.copy(this.targetPos);
    this.camCurrentLook.copy(this.targetLook);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);
  }

  radiansPerScreenPixel(zoomDist = this.camera.position.length()) {
    return radiansPerPixel(
      zoomDist,
      this.dom.clientHeight || window.innerHeight,
      this.camera.fov,
      this.surfaceRadius,
    );
  }

  screenToNdc(screenX: number, screenY: number) {
    const rect = this.dom.getBoundingClientRect();
    return new THREE.Vector2(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1,
    );
  }

  /** A stand-in camera posed where the real one is headed, for planning moves ahead of time */
  private poseProbeCamera(position: THREE.Vector3, lookAt: THREE.Vector3) {
    this.probeCamera.fov = this.camera.fov;
    this.probeCamera.aspect = this.camera.aspect;
    this.probeCamera.near = this.camera.near;
    this.probeCamera.far = this.camera.far;
    this.probeCamera.updateProjectionMatrix();
    this.probeCamera.position.copy(position);
    this.probeCamera.lookAt(lookAt);
    this.probeCamera.updateMatrixWorld(true);
    return this.probeCamera;
  }

  /**
   * Changes zoom while keeping the surface spot under (screenX, screenY) under it,
   * like zooming a map toward the cursor or pinch midpoint.
   */
  zoomTowardScreenPoint(newZoomDist: number, screenX: number, screenY: number) {
    newZoomDist = THREE.MathUtils.clamp(newZoomDist, MIN_ZOOM_DIST, MAX_ZOOM_DIST);
    if (newZoomDist === this.targetZoomDist) return;
    const ndc = this.screenToNdc(screenX, screenY);

    // The spot under the pointer, judged from where the camera and globe are headed
    const before = sphereHitWorld(
      this.poseProbeCamera(this.targetPos, this.targetLook),
      ndc,
      this.surfaceRadius,
      this.probeRaycaster,
    );

    this.targetZoomDist = newZoomDist;
    this.syncTargetsFromZoom(false);
    if (!before) return;

    const after = sphereHitWorld(
      this.poseProbeCamera(this.targetPos, this.targetLook),
      ndc,
      this.surfaceRadius,
      this.probeRaycaster,
    );
    if (!after) return;

    const targetQuat = globeQuaternion(this.globe.targetYaw, this.globe.targetPitch);
    const localSpot = before.normalize().applyQuaternion(targetQuat.invert());
    const goal = solveFacingOrientation(
      localSpot,
      after,
      this.globe.targetYaw,
      this.globe.targetPitch,
    );
    this.globe.transitionTo(goal.yaw, goal.pitch);
  }

  /** Double-tap / double-click: glide the tapped spot to the middle of the view and move in */
  focusOnSurfaceDir(localDir: THREE.Vector3) {
    this.introSpinActive = false;
    this.targetZoomDist = THREE.MathUtils.clamp(
      this.targetZoomDist * 0.62,
      Math.min(1.45, this.targetZoomDist),
      this.targetZoomDist,
    );
    this.syncTargetsFromZoom(false);

    // Where the new view's center ray meets the planet is where the tapped spot should end up
    const viewDir = this.targetLook.clone().sub(this.targetPos).normalize();
    const ray = new THREE.Ray(this.targetPos.clone(), viewDir);
    const hit = ray.intersectSphere(
      new THREE.Sphere(new THREE.Vector3(), this.surfaceRadius),
      new THREE.Vector3(),
    );
    const screenCenterDir = hit ? hit.normalize() : this.camAnchorDir.clone();

    const goal = solveFacingOrientation(
      localDir,
      screenCenterDir,
      this.globe.targetYaw,
      this.globe.targetPitch,
    );
    this.globe.transitionTo(goal.yaw, goal.pitch);
  }

  zoomByFactor(factor: number) {
    this.introSpinActive = false;
    this.targetZoomDist = THREE.MathUtils.clamp(
      this.targetZoomDist * factor,
      MIN_ZOOM_DIST,
      MAX_ZOOM_DIST,
    );
    this.syncTargetsFromZoom(false);
  }

  applyPreset(view: CameraViewId, immediate = false) {
    this.activeViewId = view;
    const preset = getCameraPresetConfig(view);
    this.camAnchorDir.copy(preset.anchorDir);
    this.camBaseLook.copy(preset.baseLookAt);
    this.targetZoomDist = preset.defaultDistance;
    this.syncTargetsFromZoom(immediate);
    // Presets are framed for the planet's home orientation, so bring it back around
    if (immediate) {
      this.globe.setImmediate(0, 0);
    } else {
      this.globe.transitionTo(0, 0);
    }

    this.report((prev) => ({ ...prev, activeView: view }));
  }

  /** Initial 3-second 360° spin on load, then pause and zoom out a bit */
  updateIntroSpin(dt: number, interrupted: boolean) {
    if (!this.introSpinActive) return;
    if (interrupted) {
      this.introSpinActive = false;
      return;
    }
    this.introSpinElapsed += dt;
    if (this.introSpinElapsed < 3.0) {
      const progress = this.introSpinElapsed / 3.0;
      this.globe.setImmediate(progress * Math.PI * 2, 0);
    } else {
      // Complete 360° turn, pause rotation, and zoom out slightly for cosmic framing
      this.introSpinActive = false;
      this.globe.setImmediate(0, 0);

      this.targetZoomDist = Math.min(
        MAX_ZOOM_DIST,
        this.targetZoomDist * 1.08,
      );
      this.syncTargetsFromZoom(false);
    }
  }

  /** Advance the globe's spin/glide and pose the planet with it */
  updateGlobe(dt: number, planetRoot: THREE.Object3D) {
    this.globe.update(dt);
    this.globe.writeQuaternion(planetRoot.quaternion);
  }

  /**
   * Ease the camera toward its target (same rate as globe transitions, so
   * zoom-toward-cursor and preset moves stay in step)
   */
  updateFollow(dt: number, tourActive: boolean) {
    const camEase = 1.0 - Math.exp(-dt * (tourActive ? 4.5 : 5.5));
    this.camCurrentPos.lerp(this.targetPos, camEase);
    this.camCurrentLook.lerp(this.targetLook, camEase);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);
  }
}
