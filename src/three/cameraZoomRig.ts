import * as THREE from 'three';
import { CameraViewId } from '../types/world';

/**
 * Phase 1 Sect World scale multiplier (~20% larger than the 0.75 prototype radius -> 0.90 base radius).
 */
export const PLANET_SCALE = 1.2;

/**
 * Closest inspection distance from planet center (world units).
 * Safely clears scaled terrain (0.90 base radius, ~1.06 max mountain peaks) while allowing
 * intimate close-up inspection of roofs, villagers, sheep, and blossoms.
 */
export const MIN_ZOOM_DIST = 1.18;

/**
 * Farthest cosmic overview distance from planet center (world units).
 */
export const MAX_ZOOM_DIST = 6.2;

/**
 * Distance threshold below which close-range surface horizon tilt progressively engages.
 */
export const TILT_START_DIST = 2.35;

export interface CameraPresetConfig {
  /** Normalized direction from origin toward the camera's orbital vantage point */
  anchorDir: THREE.Vector3;
  /** Default distance from origin for this preset */
  defaultDistance: number;
  /** Base look-at point when viewing from medium/far distances */
  baseLookAt: THREE.Vector3;
}

const PRESET_CONFIGS: Record<CameraViewId, CameraPresetConfig> = {
  orb: {
    anchorDir: new THREE.Vector3(-1.12, 0.78, 4.35).normalize(),
    defaultDistance: 4.65,
    baseLookAt: new THREE.Vector3(0.04, -0.08, 0.0),
  },
  orbit: {
    anchorDir: new THREE.Vector3(0.0, 0.32, 2.58).normalize(),
    defaultDistance: 2.95,
    baseLookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  },
  // 3/4 view of the home-base pagoda (~35° above its local horizon)
  village: {
    anchorDir: new THREE.Vector3(-0.164, -0.023, 0.986).normalize(),
    defaultDistance: 1.4,
    baseLookAt: new THREE.Vector3(-0.156, 0.214, 0.935),
  },
  surface: {
    anchorDir: new THREE.Vector3(0.54, 0.2, 1.46).normalize(),
    defaultDistance: 1.36,
    baseLookAt: new THREE.Vector3(-0.1, 0.24, 0.74),
  },
};

export function getCameraPresetConfig(view: CameraViewId): CameraPresetConfig {
  const cfg = PRESET_CONFIGS[view];
  return {
    anchorDir: cfg.anchorDir.clone(),
    defaultDistance: cfg.defaultDistance,
    baseLookAt: cfg.baseLookAt.clone(),
  };
}

function smoothstep01(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Computes the target camera position and look-at point for a given zoom distance.
 * As zoomDistance approaches MIN_ZOOM_DIST, the camera smoothly tilts toward the
 * local surface horizon so close-up inspection views buildings and inhabitants in
 * miniature 3/4 profile rather than top-down.
 */
export function computeCameraPoseForZoom(
  anchorDir: THREE.Vector3,
  baseLookAt: THREE.Vector3,
  zoomDistance: number,
  outPos = new THREE.Vector3(),
  outLook = new THREE.Vector3(),
): { position: THREE.Vector3; lookAt: THREE.Vector3; tiltFactor: number } {
  const clampedDist = THREE.MathUtils.clamp(
    zoomDistance,
    MIN_ZOOM_DIST,
    MAX_ZOOM_DIST,
  );
  const normAnchor = anchorDir.clone().normalize();

  // Compute close-range surface tilt factor (0 at >= TILT_START_DIST, 1 at MIN_ZOOM_DIST)
  const rawClose =
    (TILT_START_DIST - clampedDist) / (TILT_START_DIST - MIN_ZOOM_DIST);
  const tiltFactor = smoothstep01(rawClose);

  // Build local tangent basis on the sphere at normAnchor
  const worldUp =
    Math.abs(normAnchor.y) < 0.92
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
  const tangentRight = new THREE.Vector3()
    .crossVectors(worldUp, normAnchor)
    .normalize();
  const tangentNorth = new THREE.Vector3()
    .crossVectors(normAnchor, tangentRight)
    .normalize();

  // Camera position: radial distance + subtle downward pitch offset at close range
  // so the camera peers across the curved surface
  outPos
    .copy(normAnchor)
    .multiplyScalar(clampedDist)
    .addScaledVector(tangentNorth, -0.18 * tiltFactor);

  // Enforce strict minimum altitude above scaled planet surface (0.90 base, ~1.06 peaks)
  const minAllowedRadius = MIN_ZOOM_DIST;
  if (outPos.length() < minAllowedRadius) {
    outPos.normalize().multiplyScalar(minAllowedRadius);
  }

  // Close-range surface look-at target: point on the scaled surface slightly "north"
  // along the local horizon tangent so the camera tilts up gracefully
  const scaledSurfaceRadius = 0.75 * PLANET_SCALE; // 0.90
  const closeHorizonLook = normAnchor
    .clone()
    .multiplyScalar(scaledSurfaceRadius * 0.88)
    .addScaledVector(tangentNorth, 0.34);

  // Blend between preset's baseLookAt (at far/mid range) and closeHorizonLook (at close range)
  const farBlend = smoothstep01((clampedDist - 2.2) / 1.4);
  const midLook = baseLookAt.clone().multiplyScalar(1 - farBlend * 0.65);
  outLook.copy(midLook).lerp(closeHorizonLook, tiltFactor);

  return { position: outPos, lookAt: outLook, tiltFactor };
}

/**
 * Calculates the next zoom distance from a desktop mouse wheel or trackpad event.
 * Scales step size proportionally to current distance so close-up zoom is fine-grained.
 */
export function computeNextWheelZoomDistance(
  currentTargetDist: number,
  deltaY: number,
  deltaMode = 0,
): number {
  // Normalize deltaMode (0 = pixels, 1 = lines, 2 = pages)
  const normalizedDelta =
    deltaMode === 1 ? deltaY * 18 : deltaMode === 2 ? deltaY * 120 : deltaY;
  const clampedDelta = THREE.MathUtils.clamp(normalizedDelta, -160, 160);
  const sensitivity = 0.0011 * Math.max(0.75, currentTargetDist * 0.45);
  return THREE.MathUtils.clamp(
    currentTargetDist + clampedDelta * sensitivity,
    MIN_ZOOM_DIST,
    MAX_ZOOM_DIST,
  );
}

/**
 * Calculates the next zoom distance from a mobile two-finger pinch gesture.
 */
export function computeNextPinchZoomDistance(
  currentTargetDist: number,
  previousFingerDistPx: number,
  currentFingerDistPx: number,
): number {
  if (previousFingerDistPx <= 4 || currentFingerDistPx <= 4) {
    return THREE.MathUtils.clamp(
      currentTargetDist,
      MIN_ZOOM_DIST,
      MAX_ZOOM_DIST,
    );
  }
  const ratio = previousFingerDistPx / currentFingerDistPx;
  const dampedRatio = THREE.MathUtils.lerp(1.0, ratio, 0.85);
  return THREE.MathUtils.clamp(
    currentTargetDist * dampedRatio,
    MIN_ZOOM_DIST,
    MAX_ZOOM_DIST,
  );
}
