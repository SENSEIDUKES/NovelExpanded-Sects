import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  computeCameraPoseForZoom,
  computeNextPinchZoomDistance,
  computeNextWheelZoomDistance,
  getCameraPresetConfig,
  MAX_ZOOM_DIST,
  MIN_ZOOM_DIST,
  PLANET_SCALE,
  TILT_START_DIST,
} from '../src/three/cameraZoomRig';
import { ATMOSPHERE_OUTER_RADIUS } from '../src/three/RoomEnvironment';

function runPhase1Tests() {
  // 1. Verify ~20% planet scale increase and full weather-enclosing atmosphere radius
  assert.equal(PLANET_SCALE, 1.2, 'PLANET_SCALE must be 1.2 (20% increase)');
  const maxCloudWorldRadius = 1.03 * PLANET_SCALE;
  assert.ok(
    ATMOSPHERE_OUTER_RADIUS > maxCloudWorldRadius + 0.1,
    'ATMOSPHERE_OUTER_RADIUS must enclose orbiting clouds and weather effects',
  );

  // 2. Verify camera presets exist and return valid configurations
  for (const presetId of ['orb', 'orbit', 'village', 'surface'] as const) {
    const cfg = getCameraPresetConfig(presetId);
    assert.ok(
      Math.abs(cfg.anchorDir.length() - 1.0) < 1e-5,
      `Preset ${presetId} anchorDir must be normalized`,
    );
    assert.ok(
      cfg.defaultDistance >= MIN_ZOOM_DIST &&
        cfg.defaultDistance <= MAX_ZOOM_DIST,
      `Preset ${presetId} defaultDistance must be within zoom bounds`,
    );
  }

  // 3. Verify close-range surface tilt interpolation and altitude safety
  const anchor = new THREE.Vector3(0, 0, 1);
  const baseLook = new THREE.Vector3(0, 0, 0);

  const farPose = computeCameraPoseForZoom(anchor, baseLook, 4.5);
  assert.equal(
    farPose.tiltFactor,
    0,
    'Far zoom should have zero surface horizon tilt',
  );
  assert.ok(
    farPose.position.length() >= 4.49,
    'Far zoom position should match requested distance',
  );

  const midTiltPose = computeCameraPoseForZoom(
    anchor,
    baseLook,
    (TILT_START_DIST + MIN_ZOOM_DIST) * 0.5,
  );
  assert.ok(
    midTiltPose.tiltFactor > 0.1 && midTiltPose.tiltFactor < 0.9,
    'Mid-close zoom should partially engage surface tilt',
  );

  const closePose = computeCameraPoseForZoom(anchor, baseLook, MIN_ZOOM_DIST);
  assert.equal(
    closePose.tiltFactor,
    1,
    'Minimum zoom distance should fully engage surface horizon tilt',
  );
  assert.ok(
    closePose.position.length() >= MIN_ZOOM_DIST - 1e-5,
    'Camera position must never clip inside MIN_ZOOM_DIST',
  );
  assert.ok(
    closePose.lookAt.y > 0.2,
    'Close-range lookAt should tilt upward along local surface tangent',
  );

  // 4. Verify desktop wheel zoom behavior
  const startDist = 3.2;
  const zoomedInWheel = computeNextWheelZoomDistance(startDist, -100, 0);
  const zoomedOutWheel = computeNextWheelZoomDistance(startDist, 100, 0);
  assert.ok(
    zoomedInWheel < startDist,
    'Scrolling up (negative deltaY) must zoom in closer',
  );
  assert.ok(
    zoomedOutWheel > startDist,
    'Scrolling down (positive deltaY) must zoom out farther',
  );
  assert.equal(
    computeNextWheelZoomDistance(MIN_ZOOM_DIST, -500, 0),
    MIN_ZOOM_DIST,
    'Wheel zoom in must clamp at MIN_ZOOM_DIST',
  );
  assert.equal(
    computeNextWheelZoomDistance(MAX_ZOOM_DIST, 500, 0),
    MAX_ZOOM_DIST,
    'Wheel zoom out must clamp at MAX_ZOOM_DIST',
  );

  // 5. Verify mobile two-finger pinch-to-zoom behavior
  const zoomedInPinch = computeNextPinchZoomDistance(startDist, 100, 160);
  const zoomedOutPinch = computeNextPinchZoomDistance(startDist, 160, 100);
  assert.ok(
    zoomedInPinch < startDist,
    'Spreading fingers apart must zoom in closer',
  );
  assert.ok(
    zoomedOutPinch > startDist,
    'Pinching fingers together must zoom out farther',
  );
  assert.equal(
    computeNextPinchZoomDistance(MIN_ZOOM_DIST, 80, 240),
    MIN_ZOOM_DIST,
    'Pinch zoom in must clamp at MIN_ZOOM_DIST',
  );
  assert.equal(
    computeNextPinchZoomDistance(MAX_ZOOM_DIST, 240, 80),
    MAX_ZOOM_DIST,
    'Pinch zoom out must clamp at MAX_ZOOM_DIST',
  );

  // 6. Verify RoomEnvironment has stripped domestic props and includes circular multi-depth starfield & atmosphere rim
  const roomEnvSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/three/RoomEnvironment.ts'),
    'utf8',
  );
  assert.ok(
    roomEnvSource.includes('spaceSkyDome') &&
      roomEnvSource.includes('parallaxStarfield') &&
      roomEnvSource.includes('atmosphereRimHalo'),
    'RoomEnvironment.ts must define spaceSkyDome, parallaxStarfield, and atmosphereRimHalo',
  );
  assert.ok(
    roomEnvSource.includes('gl_PointCoord') &&
      roomEnvSource.includes('if (r > 1.0) discard;') &&
      roomEnvSource.includes('starShellNear') &&
      roomEnvSource.includes('starShellMid') &&
      roomEnvSource.includes('starShellDeep'),
    'RoomEnvironment.ts must render circular radial stars and 3 depth parallax shells',
  );
  assert.ok(
    !roomEnvSource.includes('succulentGroup') &&
      !roomEnvSource.includes('sillGroup') &&
      !roomEnvSource.includes('linenGroup'),
    'Domestic windowsill, linen cloth, and succulent props must be stripped out',
  );

  console.log('✓ All Phase 1 Scene & Camera Transformation tests passed.');
}

runPhase1Tests();
