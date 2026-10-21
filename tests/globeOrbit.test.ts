import assert from 'node:assert/strict';
import * as THREE from 'three';
import { computeCameraPoseForZoom, getCameraPresetConfig } from '../src/three/cameraZoomRig';
import {
  GlobeOrbit,
  MAX_GLOBE_PITCH,
  globeQuaternion,
  solveFacingOrientation,
  sphereHitWorld,
} from '../src/three/globeOrbit';

const STEP = 1 / 60;

function runGlobeOrbitTests() {
  // 1. Dragging any way never rolls the world: its north axis stays in the camera's vertical plane
  const orbit = new GlobeOrbit();
  orbit.beginDrag(0);
  for (let i = 1; i <= 200; i++) {
    orbit.dragBy(Math.sin(i * 0.3) * 0.2, Math.cos(i * 0.17) * 0.15, i * 16);
    orbit.update(STEP);
    const north = new THREE.Vector3(0, 1, 0).applyQuaternion(
      orbit.writeQuaternion(new THREE.Quaternion()),
    );
    assert.ok(Math.abs(north.x) < 1e-9, 'Globe must never roll sideways');
    assert.ok(
      Math.abs(orbit.targetPitch) <= MAX_GLOBE_PITCH + 1e-9,
      'Tilt must stay within the pole limit',
    );
  }

  // 2. Letting go mid-swipe glides; holding still before letting go does not
  const fling = new GlobeOrbit();
  fling.beginDrag(0);
  for (let t = 16; t <= 96; t += 16) fling.dragBy(0.02, 0, t);
  fling.endDrag(100);
  const atRelease = fling.targetYaw;
  for (let i = 0; i < 120; i++) fling.update(STEP);
  assert.ok(fling.targetYaw - atRelease > 0.1, 'A swipe should keep gliding after release');
  assert.ok(fling.isSettled, 'A glide should come to rest within two seconds');

  const held = new GlobeOrbit();
  held.beginDrag(0);
  for (let t = 16; t <= 96; t += 16) held.dragBy(0.02, 0, t);
  held.endDrag(260);
  const heldAt = held.targetYaw;
  for (let i = 0; i < 60; i++) held.update(STEP);
  assert.equal(held.targetYaw, heldAt, 'Holding still before release must not fling');

  // 3. Glide distance does not depend on frame rate
  const glideAt = (fps: number) => {
    const g = new GlobeOrbit();
    g.beginDrag(0);
    for (let t = 16; t <= 96; t += 16) g.dragBy(0.02, 0, t);
    g.endDrag(100);
    const start = g.targetYaw;
    for (let i = 0; i < fps * 2; i++) g.update(1 / fps);
    return g.targetYaw - start;
  };
  assert.ok(
    Math.abs(glideAt(60) - glideAt(120)) < 0.01,
    'Glide must travel the same at 60Hz and 120Hz',
  );

  // 4. Transitions take the short way around
  const turn = new GlobeOrbit();
  turn.setImmediate(3.0, 0);
  turn.transitionTo(-3.0, 0);
  assert.ok(
    Math.abs(turn.targetYaw - turn.yaw) < Math.PI,
    'Transitions must rotate the short way around',
  );

  // 5. Facing solve puts a planet spot exactly on a requested direction
  const spot = new THREE.Vector3(0.5, 0.4, -0.7).normalize();
  const want = new THREE.Vector3(-0.2, 0.15, 1).normalize();
  const solved = solveFacingOrientation(spot, want, 0, 0);
  assert.ok(
    spot.clone().applyQuaternion(globeQuaternion(solved.yaw, solved.pitch)).distanceTo(want) <
      1e-6,
    'Facing solve must land the spot on the requested direction',
  );

  // 6. Zooming toward the cursor keeps the spot under the cursor, near and far
  const W = 1000;
  const H = 640;
  const R = 0.9;
  const cam = new THREE.PerspectiveCamera(38, W / H, 0.04, 80);
  const preset = getCameraPresetConfig('orb');
  const pose = (d: number) => {
    const p = computeCameraPoseForZoom(preset.anchorDir, preset.baseLookAt, d);
    cam.position.copy(p.position);
    cam.lookAt(p.lookAt);
    cam.updateMatrixWorld();
  };
  const ndc = (x: number, y: number) => new THREE.Vector2((x / W) * 2 - 1, -((y / H) * 2 - 1));
  for (const [from, to] of [
    [4.6, 3.8],
    [2.2, 1.8],
    [1.6, 1.3],
  ]) {
    const [cx, cy] = [560, 380];
    pose(from);
    const before = sphereHitWorld(cam, ndc(cx, cy), R);
    assert.ok(before, 'Cursor should be over the planet');
    const local = before!.normalize().applyQuaternion(globeQuaternion(0, 0).invert());
    pose(to);
    const after = sphereHitWorld(cam, ndc(cx, cy), R);
    assert.ok(after, 'Cursor should still be over the planet');
    const goal = solveFacingOrientation(local, after!, 0, 0);
    const shown = local
      .clone()
      .multiplyScalar(R)
      .applyQuaternion(globeQuaternion(goal.yaw, goal.pitch))
      .project(cam);
    const px = ((shown.x + 1) / 2) * W;
    const py = ((1 - shown.y) / 2) * H;
    assert.ok(
      Math.hypot(px - cx, py - cy) < 0.5,
      `Zoom ${from}->${to} must keep the spot under the cursor`,
    );
  }

  console.log('✓ All globe orbit tests passed.');
}

runGlobeOrbitTests();
