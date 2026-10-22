import {
  FARM_PROTOTYPE_TOOLS,
  TOOL_CATEGORIES,
  TOOL_DEFINITIONS,
  ToolCategory,
  ToolDefinition,
  ToolId,
  WorldState,
} from '../../types/world';
import { WORLD_TYPES, WorldTypeId } from '../../three/worldTypes';

export type DockCategory = (typeof TOOL_CATEGORIES)[number]['id'];

export interface CategoryMeta {
  id: DockCategory;
  label: string;
  shortcut: string;
  subtitle: string;
}

export const CATEGORY_METADATA: Record<DockCategory, CategoryMeta> = {
  world: {
    id: 'world',
    label: 'World',
    shortcut: '1',
    subtitle: 'Planetary biome palettes & atmosphere tinting',
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain',
    shortcut: '2',
    subtitle: 'Sculpt elevation, snowy peaks & turquoise basins',
  },
  structures: {
    id: 'structures',
    label: 'Structures',
    shortcut: '3',
    subtitle: 'Sect sanctuaries, bridges & architectural landmarks',
  },
  nature: {
    id: 'nature',
    label: 'Nature',
    shortcut: '4',
    subtitle: 'Sacred forests, mountain pines & meadow blossoms',
  },
  decorations: {
    id: 'decorations',
    label: 'Decorations',
    shortcut: '5',
    subtitle: 'Stone shrine lanterns & warm night campfires',
  },
  creatures: {
    id: 'creatures',
    label: 'Creatures',
    shortcut: '6',
    subtitle: 'Walking Sect disciples & living companions',
  },
  sky: {
    id: 'sky',
    label: 'Sky',
    shortcut: '7',
    subtitle: 'Weather clouds, rainbows & celestial phenomena',
  },
};

export const WORLD_TYPE_DESCRIPTIONS: Record<WorldTypeId, string> = {
  jade: 'Lush emerald terraces with tranquil turquoise waters',
  frost: 'Crystalline alpine peaks and glacial mirror lakes',
  autumn: 'Crimson maple highlands and deep teal waters',
  blossom: 'Violet spirit-blossom groves and misty lavender seas',
  ember: 'Obsidian volcanic wastes with glowing magma rivers',
};

/**
 * Returns visible tools for a given dock category (excluding hidden farm-prototype tools).
 */
export function getToolsForCategory(category: Exclude<ToolCategory, 'utility'>): ToolDefinition[] {
  if (category === 'world') return [];
  return TOOL_DEFINITIONS.filter(
    (t) => t.category === category && !FARM_PROTOTYPE_TOOLS.includes(t.id),
  );
}

/**
 * Returns the number of selectable items inside a dock category.
 */
export function getCategoryItemCount(category: DockCategory): number {
  if (category === 'world') {
    return WORLD_TYPES.length;
  }
  return getToolsForCategory(category).length;
}

/**
 * Maps a tool ID to its live placed count on the planet when tracked in WorldState.
 */
export function getToolLiveCount(
  toolId: ToolId,
  counts: WorldState['objectCounts'],
): number | null {
  switch (toolId) {
    case 'tree':
      return counts.trees;
    case 'flower':
      return counts.flowers;
    case 'villager':
      return counts.villagers;
    case 'cloud':
    case 'snowcloud':
      return counts.clouds;
    case 'house':
      return counts.houses;
    case 'windmill':
      return counts.windmills;
    case 'lighthouse':
      return counts.lighthouses;
    case 'sailboat':
      return counts.boats;
    case 'sheep':
      return counts.sheep;
    default:
      return null;
  }
}

export interface ActiveToolHudMeta {
  id: ToolId;
  label: string;
  categoryLabel: string;
  instruction: string;
  isDestructive: boolean;
}

/**
 * Resolves display metadata for the top-center Active Tool HUD pill.
 */
export function getActiveToolMetadata(toolId: ToolId | null): ActiveToolHudMeta | null {
  if (!toolId) return null;
  const def = TOOL_DEFINITIONS.find((t) => t.id === toolId);
  if (!def) return null;

  const isDestructive = def.id === 'remove';
  const categoryLabel =
    def.category === 'utility'
      ? 'Utility'
      : CATEGORY_METADATA[def.category]?.label ?? 'Creation';

  return {
    id: def.id,
    label: def.label,
    categoryLabel,
    instruction: def.description,
    isDestructive,
  };
}

export type ShortcutAction =
  | { type: 'close-inspector' }
  | { type: 'close-category' }
  | { type: 'disarm-tool' }
  | { type: 'toggle-category'; category: DockCategory }
  | { type: 'toggle-remove' }
  | { type: 'none' };

/**
 * Pure keyboard shortcut resolver for the Pro Creation Menu.
 * Priority for Escape:
 * 1. Close Inspector popover if open
 * 2. Close Category popover if open
 * 3. Disarm active tool if armed
 */
export function resolveShortcutAction(
  key: string,
  state: {
    openCategory: DockCategory | null;
    inspectorOpen: boolean;
    activeTool: ToolId | null;
    isEditingText?: boolean;
  },
): ShortcutAction {
  if (state.isEditingText) {
    return { type: 'none' };
  }

  if (key === 'Escape') {
    if (state.inspectorOpen) {
      return { type: 'close-inspector' };
    }
    if (state.openCategory) {
      return { type: 'close-category' };
    }
    if (state.activeTool) {
      return { type: 'disarm-tool' };
    }
    return { type: 'none' };
  }

  const index = Number.parseInt(key, 10);
  if (index >= 1 && index <= TOOL_CATEGORIES.length) {
    const category = TOOL_CATEGORIES[index - 1].id;
    return { type: 'toggle-category', category };
  }

  if (key === 'Backspace' || key === 'Delete' || key.toLowerCase() === 'x') {
    return { type: 'toggle-remove' };
  }

  return { type: 'none' };
}
