import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPagodaMesh } from '../src/three/MiniatureObjects';
import {
  DEFAULT_PAGODA_STYLE,
  getPagodaStyle,
  PAGODA_STYLES,
} from '../src/three/pagodaStyles';

// Today's pagoda platform: every style stands within it so the footprint never changes
const PLATFORM_SIZE = 0.13;
// Widest the eaves and tips may reach, still well inside the terrace (~0.128)
const MAX_HALF_SPAN = 0.1;
// Tallest a pagoda may stand and still fit the Pagoda camera view (Classic is ~0.166)
const MAX_HEIGHT = 0.19;

assert.equal(DEFAULT_PAGODA_STYLE, 'classic');
assert.equal(getPagodaStyle(DEFAULT_PAGODA_STYLE).id, 'classic');
assert.equal(new Set(PAGODA_STYLES.map((s) => s.id)).size, PAGODA_STYLES.length, 'style ids are unique');

for (const style of PAGODA_STYLES) {
  const { spec } = style;
  assert.ok(spec.tiers.length >= 2, `${style.id}: at least two tiers`);
  assert.ok(spec.platform.low.size <= PLATFORM_SIZE + 1e-9, `${style.id}: platform within today's footprint`);
  for (const [key, value] of Object.entries(spec.palette)) {
    assert.match(value, /^#[0-9a-f]{6}$/i, `${style.id}: palette.${key} is a color`);
  }
  spec.tiers.forEach((tier, i) => {
    assert.ok(tier.eaveWidth > tier.width, `${style.id}: tier ${i} eaves overhang its walls`);
    if (i > 0) {
      assert.ok(tier.width < spec.tiers[i - 1].width, `${style.id}: tier ${i} is narrower than the one below`);
    }
  });

  const { group, windowMaterials } = createPagodaMesh(spec);
  assert.ok(windowMaterials.length >= spec.tiers.length, `${style.id}: every tier has glowing windows`);

  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const halfSpan = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z);
  assert.ok(halfSpan <= MAX_HALF_SPAN, `${style.id}: reaches ${halfSpan.toFixed(3)} from center`);
  assert.ok(box.max.y <= MAX_HEIGHT, `${style.id}: stands ${box.max.y.toFixed(3)} tall`);
  assert.ok(box.max.y > 0.1, `${style.id}: is a real building`);
}

console.log('✓ All pagoda style tests passed.');
