import * as THREE from 'three';

/**
 * World types: whole-planet styles a Sect can pick. A world type recolors the land,
 * beaches, rock, snow and water and tints the atmosphere; the terrain's shape and
 * everything placed on it stay as they are.
 */
export type WorldTypeId = 'jade' | 'frost' | 'autumn' | 'blossom' | 'ember';

export interface WorldPalette {
  ground: {
    deepSand: string;
    beachSand: string;
    warmSand: string;
    grassLight: string;
    grassMid: string;
    grassDeep: string;
    rock: string;
    rockDark: string;
    snow: string;
    snowShade: string;
  };
  water: {
    shallow: string;
    mid: string;
    deep: string;
    opacity: number;
    /** Self-lit glow (e.g. lava); black with intensity 0 for ordinary water */
    glow: string;
    glowIntensity: number;
  };
  /** Multiplier on the atmosphere's day/twilight/night colors */
  atmosphereTint: string;
  /** Sparkle color for the shimmer when switching to this world */
  shimmer: string;
}

export interface WorldTypeDefinition {
  id: WorldTypeId;
  label: string;
  /** Two-tone toolbar swatch */
  swatch: { land: string; water: string };
  palette: WorldPalette;
}

export const WORLD_TYPES: WorldTypeDefinition[] = [
  {
    id: 'jade',
    label: 'Jade Valley',
    swatch: { land: '#6a9a5a', water: '#3c9f9c' },
    palette: {
      ground: {
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
      water: {
        shallow: '#8fdcc8',
        mid: '#3c9f9c',
        deep: '#1b5868',
        opacity: 0.86,
        glow: '#000000',
        glowIntensity: 0,
      },
      atmosphereTint: '#ffffff',
      shimmer: '#c9f29b',
    },
  },
  {
    id: 'frost',
    label: 'Frost Peaks',
    swatch: { land: '#c9d6e3', water: '#9cc9dc' },
    palette: {
      ground: {
        deepSand: '#8f9aa6',
        beachSand: '#d9e2ea',
        warmSand: '#c6d1dc',
        grassLight: '#e7eef5',
        grassMid: '#c9d6e3',
        grassDeep: '#a3b4c6',
        rock: '#7c8796',
        rockDark: '#626d7c',
        snow: '#fbfdff',
        snowShade: '#e6f0fa',
      },
      water: {
        shallow: '#d7f0f7',
        mid: '#9cc9dc',
        deep: '#4d7f99',
        opacity: 0.9,
        glow: '#000000',
        glowIntensity: 0,
      },
      atmosphereTint: '#dfe9ff',
      shimmer: '#ffffff',
    },
  },
  {
    id: 'autumn',
    label: 'Crimson Autumn',
    swatch: { land: '#9e3424', water: '#2e7a78' },
    palette: {
      ground: {
        deepSand: '#7d6248',
        beachSand: '#d8bf98',
        warmSand: '#c9a77a',
        grassLight: '#c4642a',
        grassMid: '#9e3424',
        grassDeep: '#6e231c',
        rock: '#7a6f66',
        rockDark: '#5f554e',
        snow: '#fbf3ea',
        snowShade: '#ecdccb',
      },
      water: {
        shallow: '#6fb3a4',
        mid: '#2e7a78',
        deep: '#163f45',
        opacity: 0.88,
        glow: '#000000',
        glowIntensity: 0,
      },
      atmosphereTint: '#ffc9a8',
      shimmer: '#ffb35c',
    },
  },
  {
    id: 'blossom',
    label: 'Spirit Blossom',
    swatch: { land: '#b884be', water: '#a77fc4' },
    palette: {
      ground: {
        deepSand: '#8f7a95',
        beachSand: '#efdbe6',
        warmSand: '#e2c9d9',
        grassLight: '#e3a3c6',
        grassMid: '#b884be',
        grassDeep: '#7f5b9c',
        rock: '#8a8299',
        rockDark: '#6e6680',
        snow: '#fff7fb',
        snowShade: '#f3e4f0',
      },
      water: {
        shallow: '#f4c2d8',
        mid: '#a77fc4',
        deep: '#4e3a7a',
        opacity: 0.86,
        glow: '#000000',
        glowIntensity: 0,
      },
      atmosphereTint: '#ffd6f2',
      shimmer: '#ffc6e6',
    },
  },
  {
    id: 'ember',
    label: 'Ember Wastes',
    swatch: { land: '#3a3333', water: '#ff6a1f' },
    palette: {
      ground: {
        deepSand: '#2a2222',
        beachSand: '#5a4a44',
        warmSand: '#4a3c37',
        grassLight: '#5c5250',
        grassMid: '#3a3333',
        grassDeep: '#262222',
        rock: '#4d4645',
        rockDark: '#332d2c',
        snow: '#8f8580',
        snowShade: '#756c68',
      },
      water: {
        shallow: '#ffd25a',
        mid: '#ff6a1f',
        deep: '#b3200f',
        opacity: 0.96,
        glow: '#ff4a14',
        glowIntensity: 0.55,
      },
      atmosphereTint: '#ffbf94',
      shimmer: '#ff8a3a',
    },
  },
];

export const DEFAULT_WORLD_TYPE: WorldTypeId = 'jade';

export function getWorldType(id: WorldTypeId): WorldTypeDefinition {
  return WORLD_TYPES.find((w) => w.id === id) ?? WORLD_TYPES[0];
}

/** Palette with live THREE.Color values, ready to apply or blend */
export interface ResolvedPalette {
  ground: Record<keyof WorldPalette['ground'], THREE.Color>;
  water: {
    shallow: THREE.Color;
    mid: THREE.Color;
    deep: THREE.Color;
    opacity: number;
    glow: THREE.Color;
    glowIntensity: number;
  };
  atmosphereTint: THREE.Color;
}

export function resolvePalette(p: WorldPalette): ResolvedPalette {
  const ground = {} as ResolvedPalette['ground'];
  for (const key of Object.keys(p.ground) as (keyof WorldPalette['ground'])[]) {
    ground[key] = new THREE.Color(p.ground[key]);
  }
  return {
    ground,
    water: {
      shallow: new THREE.Color(p.water.shallow),
      mid: new THREE.Color(p.water.mid),
      deep: new THREE.Color(p.water.deep),
      opacity: p.water.opacity,
      glow: new THREE.Color(p.water.glow),
      glowIntensity: p.water.glowIntensity,
    },
    atmosphereTint: new THREE.Color(p.atmosphereTint),
  };
}

/** Interpolated palette between a (t=0) and b (t=1), for the world-type fade */
export function blendPalettes(a: ResolvedPalette, b: ResolvedPalette, t: number): ResolvedPalette {
  const ground = {} as ResolvedPalette['ground'];
  for (const key of Object.keys(a.ground) as (keyof ResolvedPalette['ground'])[]) {
    ground[key] = a.ground[key].clone().lerp(b.ground[key], t);
  }
  return {
    ground,
    water: {
      shallow: a.water.shallow.clone().lerp(b.water.shallow, t),
      mid: a.water.mid.clone().lerp(b.water.mid, t),
      deep: a.water.deep.clone().lerp(b.water.deep, t),
      opacity: THREE.MathUtils.lerp(a.water.opacity, b.water.opacity, t),
      glow: a.water.glow.clone().lerp(b.water.glow, t),
      glowIntensity: THREE.MathUtils.lerp(a.water.glowIntensity, b.water.glowIntensity, t),
    },
    atmosphereTint: a.atmosphereTint.clone().lerp(b.atmosphereTint, t),
  };
}
