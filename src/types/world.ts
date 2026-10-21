import type { WorldTypeId } from '../three/worldTypes';

export type ToolId =
  // Original Tools
  | 'tree'
  | 'house'
  | 'windmill'
  | 'lighthouse'
  | 'mountain'
  | 'lake'
  | 'flower'
  | 'cloud'
  | 'villager'
  | 'sheep'
  | 'raise'
  | 'lower'
  | 'remove'
  // A. Water & Coastal Life
  | 'sailboat'
  | 'dock'
  | 'duck'
  // B. Cozy Village & Countryside Landmarks
  | 'campfire'
  | 'balloon'
  | 'watchtower'
  | 'beehive'
  | 'lantern'
  // C. Weather & Elemental Powers
  | 'rainbow'
  | 'snowcloud'
  | 'shootingstar';

/** Parent categories the toolbar is organized around; 'utility' holds Remove */
export type ToolCategory =
  | 'world'
  | 'terrain'
  | 'structures'
  | 'nature'
  | 'decorations'
  | 'creatures'
  | 'sky'
  | 'utility';

export type CameraViewId = 'orb' | 'surface' | 'orbit' | 'village';

export type TimeMode = 'auto' | 'day' | 'twilight' | 'night';

export interface WorldState {
  planetName: string;
  population: number;
  happiness: number;
  dayCount: number;
  /** null when no tool is armed */
  activeTool: ToolId | null;
  activeView: CameraViewId;
  /** Active world type (planet style) */
  worldType: WorldTypeId;
  timeMode: TimeMode;
  /** 0..1 where 0.25 = warm noon/afternoon, 0.52 = blue twilight, 0.78 = deep night */
  timeOfDay: number;
  tourActive: boolean;
  tourElapsed: number;
  tourPhase: string;
  objectCounts: {
    houses: number;
    trees: number;
    windmills: number;
    lighthouses: number;
    villagers: number;
    sheep: number;
    clouds: number;
    flowers: number;
    boats: number;
  };
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  category: ToolCategory;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  description: string;
}

/** The seven parent categories, in toolbar order */
export const TOOL_CATEGORIES: { id: Exclude<ToolCategory, 'utility'>; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'structures', label: 'Structures' },
  { id: 'nature', label: 'Nature' },
  { id: 'decorations', label: 'Decorations' },
  { id: 'creatures', label: 'Creatures' },
  { id: 'sky', label: 'Sky' },
];

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // Terrain
  {
    id: 'mountain',
    label: 'Mountains',
    category: 'terrain',
    accentBg: 'bg-[#e3e6ee]',
    accentBorder: 'border-[#b2bacf]',
    accentText: 'text-[#363e52]',
    description: 'Raise a snowy faceted peak',
  },
  {
    id: 'lake',
    label: 'Lakes',
    category: 'terrain',
    accentBg: 'bg-[#d4f1f4]',
    accentBorder: 'border-[#8fd3db]',
    accentText: 'text-[#1c5961]',
    description: 'Carve a shallow-to-deep turquoise basin',
  },
  {
    id: 'raise',
    label: 'Raise Land',
    category: 'terrain',
    accentBg: 'bg-[#e6eed6]',
    accentBorder: 'border-[#b5c993]',
    accentText: 'text-[#3b4f1d]',
    description: 'Elevate spherical terrain facets',
  },
  {
    id: 'lower',
    label: 'Lower Land',
    category: 'terrain',
    accentBg: 'bg-[#d8edf2]',
    accentBorder: 'border-[#96c9d6]',
    accentText: 'text-[#20515e]',
    description: 'Lower terrain facets to admit turquoise water',
  },

  // Structures
  {
    id: 'house',
    label: 'Houses',
    category: 'structures',
    accentBg: 'bg-[#fce4d6]',
    accentBorder: 'border-[#ebb69b]',
    accentText: 'text-[#6e3820]',
    description: 'Build a pastel cottage with roof tiles & glowing windows',
  },
  {
    id: 'windmill',
    label: 'Windmills',
    category: 'structures',
    accentBg: 'bg-[#fdf2d0]',
    accentBorder: 'border-[#e5cc87]',
    accentText: 'text-[#665014]',
    description: 'Erect a white windmill with turning canvas sails',
  },
  {
    id: 'lighthouse',
    label: 'Lighthouses',
    category: 'structures',
    accentBg: 'bg-[#fadadd]',
    accentBorder: 'border-[#e59fa6]',
    accentText: 'text-[#70232b]',
    description: 'Build a striped coastal lighthouse with sweeping beam',
  },
  {
    id: 'watchtower',
    label: 'Watchtower',
    category: 'structures',
    accentBg: 'bg-[#e6e2f5]',
    accentBorder: 'border-[#b8b0d9]',
    accentText: 'text-[#3c345c]',
    description: 'Build a fairytale stone keep with a waving pennant flag',
  },
  {
    id: 'dock',
    label: 'Docks & Bridges',
    category: 'structures',
    accentBg: 'bg-[#efe4d4]',
    accentBorder: 'border-[#cbb393]',
    accentText: 'text-[#543d22]',
    description: 'Build a timber pier on shores or an arched bridge across channels',
  },

  // Nature
  {
    id: 'tree',
    label: 'Trees',
    category: 'nature',
    accentBg: 'bg-[#dff0d8]',
    accentBorder: 'border-[#a6cfa0]',
    accentText: 'text-[#2c5227]',
    description: 'Plant oaks on hills, pines on peaks, or palms on beaches',
  },
  {
    id: 'flower',
    label: 'Flowers',
    category: 'nature',
    accentBg: 'bg-[#f5dff7]',
    accentBorder: 'border-[#d6a9dc]',
    accentText: 'text-[#5b2a61]',
    description: 'Scatter pastel meadow blossoms',
  },

  // Decorations
  {
    id: 'lantern',
    label: 'Stone Lantern',
    category: 'decorations',
    accentBg: 'bg-[#fef0c9]',
    accentBorder: 'border-[#e5c777]',
    accentText: 'text-[#634b10]',
    description: 'Place a stone shrine lantern that glows at dusk',
  },
  {
    id: 'campfire',
    label: 'Campfire',
    category: 'decorations',
    accentBg: 'bg-[#fde2c8]',
    accentBorder: 'border-[#eba972]',
    accentText: 'text-[#70360f]',
    description: 'Light a crackling stone campfire where disciples gather at night',
  },
  {
    id: 'beehive',
    label: 'Beehives',
    category: 'decorations',
    accentBg: 'bg-[#fcf0c2]',
    accentBorder: 'border-[#e3c76b]',
    accentText: 'text-[#5e480d]',
    description: 'Place a painted apiary box with fluttering butterflies & bees',
  },

  // Creatures
  {
    id: 'villager',
    label: 'Disciples',
    category: 'creatures',
    accentBg: 'bg-[#fde8c8]',
    accentBorder: 'border-[#e6be83]',
    accentText: 'text-[#664414]',
    description: 'Welcome a disciple who walks the Sect grounds',
  },
  {
    id: 'sheep',
    label: 'Sheep',
    category: 'creatures',
    accentBg: 'bg-[#f2efe9]',
    accentBorder: 'border-[#ccc5b8]',
    accentText: 'text-[#474137]',
    description: 'Add a fluffy white grazing sheep',
  },
  {
    id: 'duck',
    label: 'Swans & Ducks',
    category: 'creatures',
    accentBg: 'bg-[#e2f5ef]',
    accentBorder: 'border-[#9ad1c0]',
    accentText: 'text-[#1f5747]',
    description: 'Add paddling white swans & ducks that leave water ripples',
  },
  {
    id: 'sailboat',
    label: 'Sailboats',
    category: 'creatures',
    accentBg: 'bg-[#d6eff7]',
    accentBorder: 'border-[#8ec9de]',
    accentText: 'text-[#1c5166]',
    description: 'Launch a wooden sailboat with pastel sails & night lantern',
  },

  // Sky
  {
    id: 'cloud',
    label: 'Rain Cloud',
    category: 'sky',
    accentBg: 'bg-[#e1ecf7]',
    accentBorder: 'border-[#a4c2e3]',
    accentText: 'text-[#264669]',
    description: 'Summon a puffy rain cloud that waters & grows trees below',
  },
  {
    id: 'snowcloud',
    label: 'Snow Cloud',
    category: 'sky',
    accentBg: 'bg-[#e4f2fc]',
    accentBorder: 'border-[#9ec8e8]',
    accentText: 'text-[#1e4b6e]',
    description: 'Summon a frosty cloud that dusts hills & roofs in white snow',
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    category: 'sky',
    accentBg: 'bg-[#fce3f0]',
    accentBorder: 'border-[#e3a1c4]',
    accentText: 'text-[#662247]',
    description: 'Arch a translucent pastel rainbow across the sky',
  },
  {
    id: 'shootingstar',
    label: 'Shooting Star',
    category: 'sky',
    accentBg: 'bg-[#e5dff7]',
    accentBorder: 'border-[#b3a3e3]',
    accentText: 'text-[#392769]',
    description: 'Send a sparkling shooting star across the orb sky',
  },
  {
    id: 'balloon',
    label: 'Hot Air Balloon',
    category: 'sky',
    accentBg: 'bg-[#f9d9e6]',
    accentBorder: 'border-[#e39db9]',
    accentText: 'text-[#6b2543]',
    description: 'Launch a striped pastel hot air balloon with a glowing burner',
  },

  // Utility
  {
    id: 'remove',
    label: 'Remove',
    category: 'utility',
    accentBg: 'bg-[#f7dede]',
    accentBorder: 'border-[#dfa4a4]',
    accentText: 'text-[#692626]',
    description: 'Clear an object from the planet surface',
  },
];

/**
 * Cozy-farm items from the original pocket-world prototype. Their meshes still exist,
 * but they are kept out of the Sect toolbar because they set the wrong tone.
 */
export const FARM_PROTOTYPE_TOOLS: ToolId[] = [
  'house',
  'windmill',
  'lighthouse',
  'watchtower',
  'balloon',
  'sailboat',
  'dock',
  'duck',
  'beehive',
  'sheep',
];
