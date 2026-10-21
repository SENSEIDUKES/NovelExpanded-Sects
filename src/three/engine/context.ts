import * as THREE from 'three';
import type { WorldState } from '../../types/world';
import type {
  BalloonEntity,
  CloudEntity,
  DuckEntity,
  PlacedObjectEntity,
  SailboatEntity,
  SheepEntity,
  ShootingStarEntity,
  VillagerEntity,
} from '../MiniatureObjects';
import type { PlanetTerrainHandles } from '../PlanetTerrain';

/**
 * Shared world state every engine system works against: the planet, its scene groups,
 * and the registry of everything living on it. Systems own their behavior; the context
 * only holds what more than one of them needs to see.
 */

export const UP_VEC = new THREE.Vector3(0, 1, 0);

/**
 * The Sect grounds: a fixed, locked zone around the pagoda, the same on every Sect's
 * world. Its ground is leveled and paved, and nothing can be built or sculpted there.
 */
export const SECT_ZONE_ANGLE = 0.17;
export const SECT_ZONE_BLEND_ANGLE = 0.3;

export type StateReporter = (updater: (prev: WorldState) => WorldState) => void;

/** Every entity on the planet, by kind */
export interface WorldEntities {
  placedObjects: PlacedObjectEntity[];
  villagers: VillagerEntity[];
  sheep: SheepEntity[];
  clouds: CloudEntity[];
  sailboats: SailboatEntity[];
  ducks: DuckEntity[];
  balloons: BalloonEntity[];
  shootingStars: ShootingStarEntity[];
}

export function createWorldEntities(): WorldEntities {
  return {
    placedObjects: [],
    villagers: [],
    sheep: [],
    clouds: [],
    sailboats: [],
    ducks: [],
    balloons: [],
    shootingStars: [],
  };
}

/** Scene groups under the planet root, one per kind of content */
export interface WorldGroups {
  objects: THREE.Group;
  inhabitants: THREE.Group;
  atmosphere: THREE.Group;
  effects: THREE.Group;
}

/** The farm prototype's fenced sheep corral; off for Sect worlds, which start without one */
export interface PastureConfig {
  center: THREE.Vector3;
  radius: number;
  enabled: boolean;
}

export type SparkleEmitter = (dir: THREE.Vector3, hexColor?: string, customRadius?: number) => void;

export interface WorldContext {
  planetRoot: THREE.Group;
  terrain: PlanetTerrainHandles;
  groups: WorldGroups;
  entities: WorldEntities;
  /** Where every Sect's pagoda stands (planet space) */
  homeBaseDirection: THREE.Vector3;
  pasture: PastureConfig;
  emitSparkles: SparkleEmitter;
  /** Push a change to the React UI */
  report: StateReporter;
  /** Recount the world and push the stats to the UI */
  syncStats: () => void;
}
