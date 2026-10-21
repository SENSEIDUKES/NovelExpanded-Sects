import assert from 'node:assert/strict';
import {
  blendPalettes,
  DEFAULT_WORLD_TYPE,
  getWorldType,
  resolvePalette,
  WORLD_TYPES,
} from '../src/three/worldTypes';

import type { Color } from 'three';

const sameColor = (x: Color, y: Color) =>
  Math.abs(x.r - y.r) < 1e-6 && Math.abs(x.g - y.g) < 1e-6 && Math.abs(x.b - y.b) < 1e-6;

function runWorldTypeTests() {
  // 1. The default world keeps the exact look the planet had before world types existed
  const jade = getWorldType(DEFAULT_WORLD_TYPE);
  assert.equal(jade.id, 'jade', 'Jade Valley must be the default world type');
  assert.deepEqual(
    jade.palette.ground,
    {
      deepSand: '#a99d80',
      beachSand: '#ddd3b6',
      warmSand: '#cfc29f',
      grassLight: '#93b86f',
      grassMid: '#6a9a5a',
      grassDeep: '#47744b',
      rock: '#878d99',
      rockDark: '#6f7582',
      snow: '#f7fbff',
      snowShade: '#e3eef9',
    },
    'Jade Valley land colors must match the original planet',
  );
  assert.equal(jade.palette.water.shallow, '#8fdcc8');
  assert.equal(jade.palette.water.mid, '#3c9f9c');
  assert.equal(jade.palette.water.deep, '#1b5868');
  assert.equal(jade.palette.water.opacity, 0.86);
  assert.equal(jade.palette.water.glowIntensity, 0);
  assert.equal(jade.palette.atmosphereTint, '#ffffff', 'Default atmosphere stays untinted');

  // 2. All five world types exist, with unique ids and complete palettes
  assert.deepEqual(
    WORLD_TYPES.map((w) => w.id),
    ['jade', 'frost', 'autumn', 'blossom', 'ember'],
  );
  const groundKeys = Object.keys(jade.palette.ground).sort();
  for (const world of WORLD_TYPES) {
    assert.deepEqual(
      Object.keys(world.palette.ground).sort(),
      groundKeys,
      `${world.label} must define every land color`,
    );
    for (const hex of [
      ...Object.values(world.palette.ground),
      world.palette.water.shallow,
      world.palette.water.mid,
      world.palette.water.deep,
      world.palette.water.glow,
      world.palette.atmosphereTint,
      world.swatch.land,
      world.swatch.water,
    ]) {
      assert.match(hex, /^#[0-9a-f]{6}$/i, `${world.label} has a malformed color ${hex}`);
    }
    assert.ok(
      world.palette.water.opacity > 0 && world.palette.water.opacity <= 1,
      `${world.label} water opacity must be in (0, 1]`,
    );
  }

  // 3. Blending lands on each end and the true midpoint
  const a = resolvePalette(getWorldType('jade').palette);
  const b = resolvePalette(getWorldType('ember').palette);
  const start = blendPalettes(a, b, 0);
  const end = blendPalettes(a, b, 1);
  const mid = blendPalettes(a, b, 0.5);
  assert.ok(sameColor(start.ground.grassMid, a.ground.grassMid), 'Blend at 0 is the starting world');
  assert.ok(sameColor(end.ground.grassMid, b.ground.grassMid), 'Blend at 1 is the target world');
  assert.ok(sameColor(end.water.mid, b.water.mid), 'Blend at 1 reaches the target water');
  assert.ok(
    Math.abs(mid.ground.grassMid.r - (a.ground.grassMid.r + b.ground.grassMid.r) / 2) < 1e-6,
    'Blend at 0.5 is halfway',
  );
  assert.ok(
    Math.abs(mid.water.glowIntensity - b.water.glowIntensity / 2) < 1e-6,
    'Lava glow fades in with the blend',
  );
  assert.notEqual(start.ground.grassMid, a.ground.grassMid, 'Blending must not alias source colors');

  console.log('✓ All world type tests passed.');
}

runWorldTypeTests();
