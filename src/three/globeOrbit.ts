import * as THREE from 'three';

/**
 * Globe orientation controller.
 *
 * The planet's orientation is two angles: yaw (spin around the planet's own north axis)
 * and pitch (tilt toward or away from the camera). Composing them as Rx(pitch) * Ry(yaw)
 * means the world can never roll sideways or end up upside down, no matter how it is dragged.
 *
 * Every input writes to a *target* orientation; the visible orientation eases toward it.
 * Drags use a fast response so the surface tracks the finger, while camera transitions
 * (presets, double-tap focus, zoom-toward-cursor) use a slower, cinematic response.
 */

/** Max tilt toward either pole (~77°), so the poles stay reachable without flipping over */
export const MAX_GLOBE_PITCH = 1.35;

/** Visible orientation catch-up rate while dragging or gliding (higher = tighter) */
const DRAG_RESPONSE = 32;
/** Visible orientation catch-up rate for camera transitions */
const TRANSITION_RESPONSE = 5.5;
/** How quickly a fling glides to a stop (per second; ~0.7s of noticeable glide) */
const GLIDE_DECAY = 4.2;
/** Window used to measure release speed */
const VELOCITY_WINDOW_MS = 90;
/** Holding still this long before letting go cancels the fling */
const HOLD_STILL_MS = 70;
/** Fling speed cap (radians / second) */
const MAX_GLIDE_SPEED = 7;

interface DragSample {
  time: number;
  yaw: number;
  pitch: number;
}

export function wrapAngle(angle: number): number {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

/**
 * Radians of globe rotation per screen pixel so the surface under the pointer
 * moves 1:1 with it at any zoom level.
 */
export function radiansPerPixel(
  cameraDistance: number,
  viewportHeightPx: number,
  fovDeg: number,
  surfaceRadius: number,
): number {
  const halfFov = THREE.MathUtils.degToRad(fovDeg) / 2;
  // Distance from the camera to the near surface, with a floor for close-range inspection
  const surfaceDistance = Math.max(cameraDistance - surfaceRadius, surfaceRadius * 0.22);
  return (surfaceDistance * Math.tan(halfFov)) / (surfaceRadius * (viewportHeightPx / 2));
}

/**
 * World-space point where a screen position's ray meets the planet's surface sphere.
 * Grazing hits near the visible rim are rejected: there, tiny pointer moves would
 * swing the globe wildly, so callers fall back to pixel-based rotation instead.
 */
export function sphereHitWorld(
  camera: THREE.Camera,
  ndc: THREE.Vector2,
  radius: number,
  raycaster = new THREE.Raycaster(),
): THREE.Vector3 | null {
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.ray.intersectSphere(
    new THREE.Sphere(new THREE.Vector3(), radius),
    new THREE.Vector3(),
  );
  if (!hit) return null;
  const facing = -raycaster.ray.direction.dot(hit.clone().normalize());
  return facing < 0.22 ? null : hit;
}

/** Rotation for the given yaw/pitch, matching how the planet is posed */
export function globeQuaternion(yaw: number, pitch: number, out = new THREE.Quaternion()) {
  return out.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'XYZ'));
}

/**
 * Finds the yaw/pitch that rotates `localDir` (a direction in planet space) onto
 * `worldDir` (a direction in world space), choosing the pitch closest to `currentPitch`.
 */
export function solveFacingOrientation(
  localDir: THREE.Vector3,
  worldDir: THREE.Vector3,
  currentYaw: number,
  currentPitch: number,
): { yaw: number; pitch: number } {
  const h = localDir.clone().normalize();
  const c = worldDir.clone().normalize();

  // Rx(-pitch) * c must share h's height above the equator (yaw preserves it)
  const r = Math.hypot(c.y, c.z);
  const phi = Math.atan2(c.z, c.y);
  const spread = Math.acos(THREE.MathUtils.clamp(h.y / Math.max(r, 1e-6), -1, 1));
  const candidates = [phi + spread, phi - spread].map((p) => {
    const wrapped = wrapAngle(p);
    return THREE.MathUtils.clamp(wrapped, -MAX_GLOBE_PITCH, MAX_GLOBE_PITCH);
  });
  const pitch =
    Math.abs(candidates[0] - currentPitch) <= Math.abs(candidates[1] - currentPitch)
      ? candidates[0]
      : candidates[1];

  // Undo the pitch on the target, then measure the remaining spin around the axis
  const cos = Math.cos(pitch);
  const sin = Math.sin(pitch);
  const vx = c.x;
  const vz = -c.y * sin + c.z * cos;
  const yawOffset = Math.atan2(vx, vz) - Math.atan2(h.x, h.z);

  return { yaw: currentYaw + wrapAngle(yawOffset - currentYaw), pitch };
}

export class GlobeOrbit {
  yaw = 0;
  pitch = 0;
  targetYaw = 0;
  targetPitch = 0;

  private velocityYaw = 0;
  private velocityPitch = 0;
  private dragging = false;
  private response = DRAG_RESPONSE;
  private samples: DragSample[] = [];

  get isDragging() {
    return this.dragging;
  }

  get isSettled() {
    return (
      !this.dragging &&
      this.velocityYaw === 0 &&
      this.velocityPitch === 0 &&
      Math.abs(this.targetYaw - this.yaw) < 1e-4 &&
      Math.abs(this.targetPitch - this.pitch) < 1e-4
    );
  }

  /** Jump instantly to an orientation (no easing, no glide) */
  setImmediate(yaw: number, pitch: number) {
    this.yaw = this.targetYaw = yaw;
    this.pitch = this.targetPitch = THREE.MathUtils.clamp(
      pitch,
      -MAX_GLOBE_PITCH,
      MAX_GLOBE_PITCH,
    );
    this.stopGlide();
  }

  /** Re-sync from a quaternion written elsewhere (e.g. the scripted tour) */
  syncFromQuaternion(q: THREE.Quaternion) {
    const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    this.setImmediate(euler.y, euler.x);
  }

  stopGlide() {
    this.velocityYaw = 0;
    this.velocityPitch = 0;
  }

  beginDrag(now: number) {
    this.dragging = true;
    this.response = DRAG_RESPONSE;
    this.stopGlide();
    // Catch the globe where it visibly is, so grabbing mid-glide doesn't jump
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.samples = [{ time: now, yaw: this.targetYaw, pitch: this.targetPitch }];
  }

  dragBy(deltaYaw: number, deltaPitch: number, now: number) {
    this.dragTo(this.targetYaw + deltaYaw, this.targetPitch + deltaPitch, now);
  }

  /** Drag to an exact orientation (used to keep the grabbed spot under the pointer) */
  dragTo(yaw: number, pitch: number, now: number) {
    this.targetYaw = yaw;
    this.targetPitch = THREE.MathUtils.clamp(pitch, -MAX_GLOBE_PITCH, MAX_GLOBE_PITCH);
    this.samples.push({ time: now, yaw: this.targetYaw, pitch: this.targetPitch });
    while (this.samples.length > 2 && now - this.samples[0].time > VELOCITY_WINDOW_MS) {
      this.samples.shift();
    }
  }

  endDrag(now: number) {
    this.dragging = false;
    this.stopGlide();
    const last = this.samples[this.samples.length - 1];
    const first = this.samples[0];
    this.samples = [];
    if (!last || !first || last === first) return;
    // Held still before letting go: no fling
    if (now - last.time > HOLD_STILL_MS) return;
    const seconds = (last.time - first.time) / 1000;
    if (seconds <= 0.004) return;

    let vYaw = (last.yaw - first.yaw) / seconds;
    let vPitch = (last.pitch - first.pitch) / seconds;
    const speed = Math.hypot(vYaw, vPitch);
    if (speed > MAX_GLIDE_SPEED) {
      vYaw *= MAX_GLIDE_SPEED / speed;
      vPitch *= MAX_GLIDE_SPEED / speed;
    }
    this.velocityYaw = vYaw;
    this.velocityPitch = vPitch;
  }

  /** Add a spin impulse (keyboard nudges) */
  nudge(yawSpeed: number, pitchSpeed: number) {
    this.response = DRAG_RESPONSE;
    this.velocityYaw += yawSpeed;
    this.velocityPitch += pitchSpeed;
  }

  /** Ease toward an orientation along the shortest path */
  transitionTo(yaw: number, pitch: number) {
    this.stopGlide();
    this.response = TRANSITION_RESPONSE;
    this.targetYaw = this.yaw + wrapAngle(yaw - this.yaw);
    this.targetPitch = THREE.MathUtils.clamp(pitch, -MAX_GLOBE_PITCH, MAX_GLOBE_PITCH);
  }

  /** Shift the target as part of a camera transition (zoom toward cursor) */
  transitionBy(deltaYaw: number, deltaPitch: number) {
    this.stopGlide();
    this.response = TRANSITION_RESPONSE;
    this.targetYaw += deltaYaw;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch + deltaPitch,
      -MAX_GLOBE_PITCH,
      MAX_GLOBE_PITCH,
    );
  }

  update(dt: number) {
    if (!this.dragging && (this.velocityYaw !== 0 || this.velocityPitch !== 0)) {
      this.targetYaw += this.velocityYaw * dt;
      this.targetPitch += this.velocityPitch * dt;
      if (Math.abs(this.targetPitch) >= MAX_GLOBE_PITCH) {
        this.targetPitch = Math.sign(this.targetPitch) * MAX_GLOBE_PITCH;
        this.velocityPitch = 0;
      }
      const decay = Math.exp(-dt * GLIDE_DECAY);
      this.velocityYaw *= decay;
      this.velocityPitch *= decay;
      if (Math.hypot(this.velocityYaw, this.velocityPitch) < 0.01) {
        this.stopGlide();
      }
    }

    const blend = 1 - Math.exp(-dt * this.response);
    this.yaw += (this.targetYaw - this.yaw) * blend;
    this.pitch += (this.targetPitch - this.pitch) * blend;
    if (Math.abs(this.targetYaw - this.yaw) < 1e-5) this.yaw = this.targetYaw;
    if (Math.abs(this.targetPitch - this.pitch) < 1e-5) this.pitch = this.targetPitch;

    // Keep yaw bounded without a visible jump
    if (Math.abs(this.yaw) > Math.PI * 4) {
      const shift = Math.round(this.yaw / (Math.PI * 2)) * Math.PI * 2;
      this.yaw -= shift;
      this.targetYaw -= shift;
    }
  }

  writeQuaternion(out: THREE.Quaternion): THREE.Quaternion {
    return globeQuaternion(this.yaw, this.pitch, out);
  }
}
