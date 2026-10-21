import * as THREE from 'three';

export type PlacedObjectType =
  | 'pagoda'
  | 'house'
  | 'windmill'
  | 'lighthouse'
  | 'well'
  | 'fence'
  | 'path'
  | 'oak'
  | 'pine'
  | 'palm'
  | 'flower'
  | 'dock'
  | 'bridge'
  | 'campfire'
  | 'watchtower'
  | 'beehive'
  | 'lantern'
  | 'rainbow';

export interface PlacedObjectEntity {
  id: string;
  type: PlacedObjectType;
  dir: THREE.Vector3;
  yaw: number;
  mesh: THREE.Group;
  baseScale: number;
  growth: number;
  targetGrowth: number;
  bounceTime: number;
  bounceActive: boolean;
  // Dynamic parts for animation
  windmillRotor?: THREE.Object3D;
  lighthouseBeamPivot?: THREE.Object3D;
  lighthouseConeMats?: THREE.MeshBasicMaterial[];
  lighthousePointLight?: THREE.PointLight;
  windowMaterials?: THREE.MeshStandardMaterial[];
  campfireFlameGroup?: THREE.Group;
  campfireEmbers?: THREE.Points;
  campfireLight?: THREE.PointLight;
  watchtowerFlag?: THREE.Mesh;
  butterflySwarm?: THREE.Group;
  removable: boolean;
}

export interface VillagerEntity {
  id: string;
  mesh: THREE.Group;
  bodyMesh: THREE.Object3D;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  dir: THREE.Vector3;
  targetDir: THREE.Vector3;
  speed: number;
  walkPhase: number;
  pauseTimer: number;
  headingToWell: boolean;
  bounceTime: number;
  yaw: number;
  stuckTimer?: number;
  steerSign?: number;
}

export interface SheepEntity {
  id: string;
  mesh: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Group[];
  tailMesh: THREE.Object3D;
  dir: THREE.Vector3;
  targetDir: THREE.Vector3;
  speed: number;
  walkPhase: number;
  grazeTimer: number;
  isGrazing: boolean;
  bounceTime: number;
  yaw: number;
  inPasture?: boolean;
}

export interface CloudEntity {
  id: string;
  isSnow: boolean;
  mesh: THREE.Group;
  rainLines: THREE.LineSegments;
  rainMat: THREE.LineBasicMaterial;
  snowPoints?: THREE.Points;
  snowMat?: THREE.PointsMaterial;
  orbitAxis: THREE.Vector3;
  currentDir: THREE.Vector3;
  orbitSpeed: number;
  altitude: number;
  rainTimer: number;
  isRaining: boolean;
  bounceTime: number;
}

export interface SailboatEntity {
  id: string;
  mesh: THREE.Group;
  hullGroup: THREE.Group;
  lanternMat: THREE.MeshStandardMaterial;
  dir: THREE.Vector3;
  targetDir: THREE.Vector3;
  speed: number;
  bobPhase: number;
  yaw: number;
}

export interface DuckEntity {
  id: string;
  mesh: THREE.Group;
  rippleRings: THREE.Mesh[];
  dir: THREE.Vector3;
  targetDir: THREE.Vector3;
  speed: number;
  bobPhase: number;
  yaw: number;
}

export interface BalloonEntity {
  id: string;
  mesh: THREE.Group;
  burnerMat: THREE.MeshStandardMaterial;
  orbitAxis: THREE.Vector3;
  currentDir: THREE.Vector3;
  orbitSpeed: number;
  baseAltitude: number;
  phase: number;
}

export interface ShootingStarEntity {
  id: string;
  mesh: THREE.Group;
  orbitAxis: THREE.Vector3;
  currentDir: THREE.Vector3;
  speed: number;
  altitude: number;
  age: number;
  maxAge: number;
  sparkleTimer: number;
}
