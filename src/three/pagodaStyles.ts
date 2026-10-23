/**
 * Pagoda styles: the looks a Sect can pick for its home pagoda. A style changes the
 * pagoda's shape (tiers, roofs, eaves, finial) and colors; where it stands, its terrace
 * and its footprint stay the same, so disciples walk around every style alike.
 */
export type PagodaStyleId = 'classic' | 'imperial' | 'hermitage' | 'celestial' | 'shadow';

export interface PagodaPalette {
  stone: string;
  darkStone: string;
  wall: string;
  pillar: string;
  tile: string;
  trim: string;
  door: string;
  window: string;
  windowGlow: string;
  jewel: string;
  jewelGlow: string;
}

export interface PagodaTierSpec {
  width: number;
  height: number;
  eaveWidth: number;
  eaveRise: number;
}

export interface PagodaSpec {
  /** Square tiers, or eight-sided ones with a roof tip at every corner */
  plan: 'square' | 'octagon';
  palette: PagodaPalette;
  /** Metal finish of the trim, fascia and finial */
  trimFinish: { metalness: number; roughness: number };
  platform: {
    low: { size: number; height: number; y: number };
    high: { size: number; height: number; y: number };
  };
  stairs: { count: number; width: number; y0: number; dy: number; z0: number; dz: number };
  /** Height where the first tier's walls start */
  tierBaseY: number;
  tiers: PagodaTierSpec[];
  /** Upturned eave corner tips, sized relative to each eave's rise */
  eaveTip: { radius: number; length: number; lean: number };
  finial: 'spire' | 'pearl' | 'knob' | 'moon' | 'blade';
  /** Paper lanterns hanging from the lowest eave's corners */
  hangingLanterns: boolean;
}

export interface PagodaStyleDefinition {
  id: PagodaStyleId;
  label: string;
  /** Menu swatch colors */
  swatch: { roof: string; wall: string; trim: string };
  /** Sparkle color when switching to this style */
  accent: string;
  spec: PagodaSpec;
}

/** The two-step stone platform and front stairs most styles stand on */
const STANDARD_PLATFORM: Pick<PagodaSpec, 'platform' | 'stairs' | 'tierBaseY'> = {
  platform: {
    low: { size: 0.13, height: 0.014, y: 0.0 },
    high: { size: 0.112, height: 0.012, y: 0.012 },
  },
  stairs: { count: 3, width: 0.03, y0: 0.004, dy: 0.0055, z0: 0.07, dz: 0.006 },
  tierBaseY: 0.018,
};

export const PAGODA_STYLES: PagodaStyleDefinition[] = [
  {
    id: 'classic',
    label: 'Classic Temple',
    swatch: { roof: '#2f4b4c', wall: '#efe3cc', trim: '#a5342a' },
    accent: '#ffe484',
    spec: {
      plan: 'square',
      palette: {
        stone: '#9a958c',
        darkStone: '#7b766e',
        wall: '#efe3cc',
        pillar: '#a5342a',
        tile: '#2f4b4c',
        trim: '#d6ad55',
        door: '#5e1d17',
        window: '#ffe9b8',
        windowGlow: '#ffae38',
        jewel: '#f4dd8a',
        jewelGlow: '#ffcf5c',
      },
      trimFinish: { metalness: 0.6, roughness: 0.32 },
      ...STANDARD_PLATFORM,
      tiers: [
        { width: 0.074, height: 0.034, eaveWidth: 0.112, eaveRise: 0.014 },
        { width: 0.058, height: 0.026, eaveWidth: 0.09, eaveRise: 0.012 },
        { width: 0.044, height: 0.022, eaveWidth: 0.07, eaveRise: 0.011 },
      ],
      eaveTip: { radius: 0.32, length: 1.5, lean: 0.5 },
      finial: 'spire',
      hangingLanterns: false,
    },
  },
  {
    id: 'imperial',
    label: 'Imperial Gold',
    swatch: { roof: '#d9a63a', wall: '#9b2a22', trim: '#f2d27a' },
    accent: '#ffd36b',
    spec: {
      plan: 'square',
      palette: {
        stone: '#e8e2d6',
        darkStone: '#cbc3b4',
        wall: '#9b2a22',
        pillar: '#6e1712',
        tile: '#d9a63a',
        trim: '#f2d27a',
        door: '#3d0d0a',
        window: '#ffe2a8',
        windowGlow: '#ffa630',
        jewel: '#ff8a5c',
        jewelGlow: '#ff5a2a',
      },
      trimFinish: { metalness: 0.7, roughness: 0.28 },
      ...STANDARD_PLATFORM,
      tiers: [
        { width: 0.074, height: 0.024, eaveWidth: 0.108, eaveRise: 0.013 },
        { width: 0.064, height: 0.019, eaveWidth: 0.094, eaveRise: 0.012 },
        { width: 0.055, height: 0.016, eaveWidth: 0.082, eaveRise: 0.011 },
        { width: 0.047, height: 0.014, eaveWidth: 0.07, eaveRise: 0.01 },
        { width: 0.04, height: 0.012, eaveWidth: 0.06, eaveRise: 0.009 },
      ],
      eaveTip: { radius: 0.28, length: 2.0, lean: 0.62 },
      finial: 'pearl',
      hangingLanterns: false,
    },
  },
  {
    id: 'hermitage',
    label: 'Mountain Hermitage',
    swatch: { roof: '#5f7a4a', wall: '#cdbfa4', trim: '#4a3424' },
    accent: '#c9f29b',
    spec: {
      plan: 'square',
      palette: {
        stone: '#8a857c',
        darkStone: '#66625c',
        wall: '#cdbfa4',
        pillar: '#4a3424',
        tile: '#5f7a4a',
        trim: '#8a7a52',
        door: '#3a2a1e',
        window: '#ffe6b0',
        windowGlow: '#ffb447',
        jewel: '#9c8a5a',
        jewelGlow: '#6b5a2c',
      },
      trimFinish: { metalness: 0.3, roughness: 0.6 },
      platform: {
        low: { size: 0.13, height: 0.02, y: 0.0 },
        high: { size: 0.116, height: 0.018, y: 0.017 },
      },
      stairs: { count: 4, width: 0.032, y0: 0.005, dy: 0.006, z0: 0.07, dz: 0.006 },
      tierBaseY: 0.026,
      tiers: [
        { width: 0.084, height: 0.032, eaveWidth: 0.12, eaveRise: 0.012 },
        { width: 0.06, height: 0.024, eaveWidth: 0.094, eaveRise: 0.011 },
      ],
      eaveTip: { radius: 0.3, length: 1.0, lean: 0.35 },
      finial: 'knob',
      hangingLanterns: false,
    },
  },
  {
    id: 'celestial',
    label: 'Celestial Spire',
    swatch: { roof: '#7f9fc4', wall: '#e9f1ee', trim: '#9cc9bb' },
    accent: '#bfe6ff',
    spec: {
      plan: 'octagon',
      palette: {
        stone: '#c9d3d6',
        darkStone: '#a3afb5',
        wall: '#e9f1ee',
        pillar: '#9cc9bb',
        tile: '#7f9fc4',
        trim: '#d8e2ee',
        door: '#2c3e57',
        window: '#d8f0ff',
        windowGlow: '#7cc8ff',
        jewel: '#e6f6ff',
        jewelGlow: '#8fd4ff',
      },
      trimFinish: { metalness: 0.75, roughness: 0.25 },
      ...STANDARD_PLATFORM,
      tiers: [
        { width: 0.062, height: 0.027, eaveWidth: 0.092, eaveRise: 0.012 },
        { width: 0.054, height: 0.025, eaveWidth: 0.082, eaveRise: 0.011 },
        { width: 0.046, height: 0.023, eaveWidth: 0.07, eaveRise: 0.01 },
        { width: 0.038, height: 0.021, eaveWidth: 0.058, eaveRise: 0.009 },
      ],
      eaveTip: { radius: 0.26, length: 1.7, lean: 0.55 },
      finial: 'moon',
      hangingLanterns: false,
    },
  },
  {
    id: 'shadow',
    label: 'Shadow Lacquer',
    swatch: { roof: '#26232a', wall: '#1d1a1f', trim: '#b3262a' },
    accent: '#ff6b5c',
    spec: {
      plan: 'square',
      palette: {
        stone: '#4a464c',
        darkStone: '#353238',
        wall: '#1d1a1f',
        pillar: '#8e1b1b',
        tile: '#26232a',
        trim: '#b3262a',
        door: '#0d0b0e',
        window: '#ffb3a6',
        windowGlow: '#ff3b2f',
        jewel: '#ff5a4a',
        jewelGlow: '#ff1f1f',
      },
      trimFinish: { metalness: 0.45, roughness: 0.35 },
      ...STANDARD_PLATFORM,
      tiers: [
        { width: 0.07, height: 0.038, eaveWidth: 0.104, eaveRise: 0.013 },
        { width: 0.054, height: 0.03, eaveWidth: 0.084, eaveRise: 0.012 },
        { width: 0.04, height: 0.026, eaveWidth: 0.066, eaveRise: 0.011 },
      ],
      eaveTip: { radius: 0.2, length: 2.3, lean: 0.7 },
      finial: 'blade',
      hangingLanterns: true,
    },
  },
];

export const DEFAULT_PAGODA_STYLE: PagodaStyleId = 'classic';

export function getPagodaStyle(id: PagodaStyleId): PagodaStyleDefinition {
  return PAGODA_STYLES.find((s) => s.id === id) ?? PAGODA_STYLES[0];
}
