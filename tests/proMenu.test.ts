import assert from 'node:assert/strict';
import {
  CATEGORY_METADATA,
  getActiveToolMetadata,
  getCategoryItemCount,
  getToolLiveCount,
  getToolsForCategory,
  resolveShortcutAction,
  WORLD_TYPE_DESCRIPTIONS,
} from '../src/components/menu/menuConfig';
import { TOOL_CATEGORIES } from '../src/types/world';
import { WORLD_TYPES } from '../src/three/worldTypes';

function runProMenuTests() {
  // 1. Verify all 7 categories have complete Pro metadata and 1..7 shortcuts
  assert.equal(TOOL_CATEGORIES.length, 7, 'Must have 7 parent categories');
  TOOL_CATEGORIES.forEach((cat, idx) => {
    const meta = CATEGORY_METADATA[cat.id];
    assert.ok(meta, `Category ${cat.id} must have metadata`);
    assert.equal(
      meta.shortcut,
      String(idx + 1),
      `Category ${cat.id} must map to shortcut key ${idx + 1}`,
    );
    assert.ok(meta.subtitle.length > 10, `Category ${cat.id} must have a descriptive subtitle`);
  });

  // 2. Verify all 5 world types have atmospheric descriptions and World category item count matches
  assert.equal(
    getCategoryItemCount('world'),
    WORLD_TYPES.length,
    'World category count must equal WORLD_TYPES.length',
  );
  for (const world of WORLD_TYPES) {
    assert.ok(
      WORLD_TYPE_DESCRIPTIONS[world.id]?.length > 10,
      `Biome ${world.id} must have a rich description`,
    );
  }

  // 3. Verify farm-prototype tools stay filtered out while Sect tools are exposed
  const terrainTools = getToolsForCategory('terrain').map((t) => t.id);
  assert.deepEqual(terrainTools, ['mountain', 'lake', 'raise', 'lower']);

  const creatureTools = getToolsForCategory('creatures').map((t) => t.id);
  assert.deepEqual(
    creatureTools,
    ['villager'],
    'Creatures category must expose Disciples and filter out farm prototype animals',
  );

  const structureTools = getToolsForCategory('structures');
  assert.equal(
    structureTools.length,
    0,
    'Structures category should filter out farm prototype buildings until Sect structures are added',
  );

  // 4. Verify ActiveToolHud metadata lookup for creation and utility brushes
  assert.equal(getActiveToolMetadata(null), null, 'Null tool returns null HUD metadata');

  const mountainHud = getActiveToolMetadata('mountain');
  assert.ok(mountainHud, 'Mountain tool must return HUD metadata');
  assert.equal(mountainHud.label, 'Mountains');
  assert.equal(mountainHud.categoryLabel, 'Terrain');
  assert.equal(mountainHud.isDestructive, false);

  const removeHud = getActiveToolMetadata('remove');
  assert.ok(removeHud, 'Remove tool must return HUD metadata');
  assert.equal(removeHud.label, 'Remove');
  assert.equal(removeHud.categoryLabel, 'Utility');
  assert.equal(removeHud.isDestructive, true);

  // 5. Verify live object count mapping for popover cards
  const sampleCounts = {
    houses: 4,
    trees: 22,
    windmills: 1,
    lighthouses: 2,
    villagers: 12,
    sheep: 8,
    clouds: 3,
    flowers: 5,
    boats: 3,
  };
  assert.equal(getToolLiveCount('tree', sampleCounts), 22);
  assert.equal(getToolLiveCount('villager', sampleCounts), 12);
  assert.equal(getToolLiveCount('mountain', sampleCounts), null);

  // 6. Verify Escape priority order: Inspector -> Category Popover -> Active Tool -> None
  assert.deepEqual(
    resolveShortcutAction('Escape', {
      inspectorOpen: true,
      openCategory: 'terrain',
      activeTool: 'mountain',
    }),
    { type: 'close-inspector' },
  );

  assert.deepEqual(
    resolveShortcutAction('Escape', {
      inspectorOpen: false,
      openCategory: 'terrain',
      activeTool: 'mountain',
    }),
    { type: 'close-category' },
  );

  assert.deepEqual(
    resolveShortcutAction('Escape', {
      inspectorOpen: false,
      openCategory: null,
      activeTool: 'mountain',
    }),
    { type: 'disarm-tool' },
  );

  assert.deepEqual(
    resolveShortcutAction('Escape', {
      inspectorOpen: false,
      openCategory: null,
      activeTool: null,
    }),
    { type: 'none' },
  );

  // 7. Verify number keys 1..7 and Delete/X shortcuts, and suppression while typing
  assert.deepEqual(
    resolveShortcutAction('2', {
      inspectorOpen: false,
      openCategory: null,
      activeTool: null,
    }),
    { type: 'toggle-category', category: 'terrain' },
  );

  assert.deepEqual(
    resolveShortcutAction('Backspace', {
      inspectorOpen: false,
      openCategory: null,
      activeTool: null,
    }),
    { type: 'toggle-remove' },
  );

  assert.deepEqual(
    resolveShortcutAction('2', {
      inspectorOpen: false,
      openCategory: null,
      activeTool: null,
      isEditingText: true,
    }),
    { type: 'none' },
    'Shortcuts must be ignored while editing planet name text',
  );

  console.log('✓ All Pro Creation Menu & HUD tests passed.');
}

runProMenuTests();
