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

export type ToolCategory = 'all' | 'village' | 'water' | 'nature' | 'weather' | 'sculpt';

export type CameraViewId = 'orb' | 'surface' | 'orbit' | 'village';

export type TimeMode = 'auto' | 'day' | 'twilight' | 'night';

export interface WorldState {
  planetName: string;
  population: number;
  happiness: number;
  dayCount: number;
  activeTool: ToolId;
  activeView: CameraViewId;
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
  category: Exclude<ToolCategory, 'all'>;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  description: string;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // Village & Landmarks
  {
    id: 'house',
    label: 'Houses',
    category: 'village',
    accentBg: 'bg-[#fce4d6]',
    accentBorder: 'border-[#ebb69b]',
    accentText: 'text-[#6e3820]',
    description: 'Build a pastel cottage with roof tiles & glowing windows',
  },
  {
    id: 'windmill',
    label: 'Windmills',
    category: 'village',
    accentBg: 'bg-[#fdf2d0]',
    accentBorder: 'border-[#e5cc87]',
    accentText: 'text-[#665014]',
    description: 'Erect a white windmill with turning canvas sails',
  },
  {
    id: 'lighthouse',
    label: 'Lighthouses',
    category: 'village',
    accentBg: 'bg-[#fadadd]',
    accentBorder: 'border-[#e59fa6]',
    accentText: 'text-[#70232b]',
    description: 'Build a striped coastal lighthouse with sweeping beam',
  },
  {
    id: 'watchtower',
    label: 'Watchtower',
    category: 'village',
    accentBg: 'bg-[#e6e2f5]',
    accentBorder: 'border-[#b8b0d9]',
    accentText: 'text-[#3c345c]',
    description: 'Build a fairytale stone keep with a waving pennant flag',
  },
  {
    id: 'campfire',
    label: 'Campfire',
    category: 'village',
    accentBg: 'bg-[#fde2c8]',
    accentBorder: 'border-[#eba972]',
    accentText: 'text-[#70360f]',
    description: 'Light a crackling stone campfire where villagers gather at night',
  },
  {
    id: 'lantern',
    label: 'Lantern Road',
    category: 'village',
    accentBg: 'bg-[#fef0c9]',
    accentBorder: 'border-[#e5c777]',
    accentText: 'text-[#634b10]',
    description: 'Place a wrought-iron streetlamp & cobblestone path that glows at dusk',
  },
  {
    id: 'balloon',
    label: 'Hot Air Balloon',
    category: 'village',
    accentBg: 'bg-[#f9d9e6]',
    accentBorder: 'border-[#e39db9]',
    accentText: 'text-[#6b2543]',
    description: 'Launch a striped pastel hot air balloon with a glowing burner',
  },

  // Water & Coastal Life
  {
    id: 'sailboat',
    label: 'Sailboats',
    category: 'water',
    accentBg: 'bg-[#d6eff7]',
    accentBorder: 'border-[#8ec9de]',
    accentText: 'text-[#1c5166]',
    description: 'Launch a wooden sailboat with pastel sails & night lantern',
  },
  {
    id: 'dock',
    label: 'Docks & Bridges',
    category: 'water',
    accentBg: 'bg-[#efe4d4]',
    accentBorder: 'border-[#cbb393]',
    accentText: 'text-[#543d22]',
    description: 'Build a timber pier on shores or an arched bridge across channels',
  },
  {
    id: 'duck',
    label: 'Swans & Ducks',
    category: 'water',
    accentBg: 'bg-[#e2f5ef]',
    accentBorder: 'border-[#9ad1c0]',
    accentText: 'text-[#1f5747]',
    description: 'Add paddling white swans & ducks that leave water ripples',
  },

  // Nature & Life
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
  {
    id: 'beehive',
    label: 'Beehives',
    category: 'nature',
    accentBg: 'bg-[#fcf0c2]',
    accentBorder: 'border-[#e3c76b]',
    accentText: 'text-[#5e480d]',
    description: 'Place a painted apiary box with fluttering butterflies & bees',
  },
  {
    id: 'villager',
    label: 'Villagers',
    category: 'nature',
    accentBg: 'bg-[#fde8c8]',
    accentBorder: 'border-[#e6be83]',
    accentText: 'text-[#664414]',
    description: 'Welcome a villager who travels between homes, campfires & well',
  },
  {
    id: 'sheep',
    label: 'Sheep',
    category: 'nature',
    accentBg: 'bg-[#f2efe9]',
    accentBorder: 'border-[#ccc5b8]',
    accentText: 'text-[#474137]',
    description: 'Add a fluffy white grazing sheep',
  },

  // Weather & Elemental Powers
  {
    id: 'cloud',
    label: 'Rain Cloud',
    category: 'weather',
    accentBg: 'bg-[#e1ecf7]',
    accentBorder: 'border-[#a4c2e3]',
    accentText: 'text-[#264669]',
    description: 'Summon a puffy rain cloud that waters & grows trees below',
  },
  {
    id: 'snowcloud',
    label: 'Snow Cloud',
    category: 'weather',
    accentBg: 'bg-[#e4f2fc]',
    accentBorder: 'border-[#9ec8e8]',
    accentText: 'text-[#1e4b6e]',
    description: 'Summon a frosty cloud that dusts hills & roofs in white snow',
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    category: 'weather',
    accentBg: 'bg-[#fce3f0]',
    accentBorder: 'border-[#e3a1c4]',
    accentText: 'text-[#662247]',
    description: 'Arch a translucent pastel rainbow across the sky',
  },
  {
    id: 'shootingstar',
    label: 'Shooting Star',
    category: 'weather',
    accentBg: 'bg-[#e5dff7]',
    accentBorder: 'border-[#b3a3e3]',
    accentText: 'text-[#392769]',
    description: 'Send a sparkling shooting star across the orb sky',
  },

  // Sculpt & Clear
  {
    id: 'mountain',
    label: 'Mountains',
    category: 'sculpt',
    accentBg: 'bg-[#e3e6ee]',
    accentBorder: 'border-[#b2bacf]',
    accentText: 'text-[#363e52]',
    description: 'Raise a snowy faceted peak',
  },
  {
    id: 'lake',
    label: 'Lakes',
    category: 'sculpt',
    accentBg: 'bg-[#d4f1f4]',
    accentBorder: 'border-[#8fd3db]',
    accentText: 'text-[#1c5961]',
    description: 'Carve a shallow-to-deep turquoise basin',
  },
  {
    id: 'raise',
    label: 'Raise Land',
    category: 'sculpt',
    accentBg: 'bg-[#e6eed6]',
    accentBorder: 'border-[#b5c993]',
    accentText: 'text-[#3b4f1d]',
    description: 'Elevate spherical terrain facets',
  },
  {
    id: 'lower',
    label: 'Lower Land',
    category: 'sculpt',
    accentBg: 'bg-[#d8edf2]',
    accentBorder: 'border-[#96c9d6]',
    accentText: 'text-[#20515e]',
    description: 'Lower terrain facets to admit turquoise water',
  },
  {
    id: 'remove',
    label: 'Remove',
    category: 'sculpt',
    accentBg: 'bg-[#f7dede]',
    accentBorder: 'border-[#dfa4a4]',
    accentText: 'text-[#692626]',
    description: 'Clear an object from the planet surface',
  },
];
