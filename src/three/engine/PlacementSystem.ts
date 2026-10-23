import * as THREE from 'three';
import type { ToolId } from '../../types/world';
import {
  createBeehiveMesh,
  createCampfireMesh,
  createFlowerClusterMesh,
  createLanternPostMesh,
  createOakTreeMesh,
  createPagodaMesh,
  createPalmTreeMesh,
  createPastelHouseMesh,
  createPineTreeMesh,
  createRainbowArchMesh,
  createSteppingPathMesh,
  createStoneWatchtowerMesh,
  createStoneWellMesh,
  createStripedLighthouseMesh,
  createWhiteWindmillMesh,
  createWoodenDockMesh,
  createWoodenFenceMesh,
  PlacedObjectEntity,
  PlacedObjectType,
} from '../MiniatureObjects';
import { DEFAULT_PAGODA_STYLE, getPagodaStyle } from '../pagodaStyles';
import { SECT_ZONE_ANGLE, WorldContext } from './context';
import type { CreatureSystem } from './CreatureSystem';
import type { DiscipleSystem } from './DiscipleSystem';
import type { SkyEventsSystem } from './SkyEventsSystem';
import {
  computeYawFacingTarget,
  findCollisionFreeRainbowYaw,
  getBridgesAndDocks,
  getBuildingEntranceDir,
  orientObjectOnSurface,
  orientPlacedObject,
  realignAllObjectsToTerrain,
} from './spatial';
import type { WeatherSystem } from './WeatherSystem';
import { releaseObjectResources } from './SceneResources';

/** Sculpting brushes stay armed between taps; every other tool places one item */
function isBrushTool(tool: ToolId) {
  return (
    tool === 'raise' ||
    tool === 'lower' ||
    tool === 'mountain' ||
    tool === 'lake' ||
    tool === 'remove'
  );
}

/**
 * Object placement and selection: the armed tool, the hover cursor, building and
 * removing things, sculpting, and keeping the Sect grounds locked.
 */
export class PlacementSystem {
  // null = nothing armed; each item tool places one item and then disarms
  private armedTool: ToolId | null = null;
  // Hover indicator on spherical surface
  readonly cursorRing: THREE.Mesh;
  private houseCounter = 0;

  constructor(
    private ctx: WorldContext,
    private disciples: DiscipleSystem,
    private creatures: CreatureSystem,
    private weather: WeatherSystem,
    private skyEvents: SkyEventsSystem,
  ) {
    // Surface Placement Cursor Ring
    const ringGeo = new THREE.RingGeometry(0.028, 0.036, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#fff8d6',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.cursorRing = new THREE.Mesh(ringGeo, ringMat);
    this.cursorRing.visible = false;
    ctx.planetRoot.add(this.cursorRing);
  }

  get activeTool() {
    return this.armedTool;
  }

  setTool(tool: ToolId | null) {
    this.armedTool = tool;
    if (!tool) {
      this.cursorRing.visible = false;
    }
    this.ctx.report((prev) => ({ ...prev, activeTool: tool }));
  }

  /** Show the cursor ring resting on the surface at `dir` */
  showCursorAt(dir: THREE.Vector3, normalOffset: number, onWater: boolean) {
    this.cursorRing.visible = true;
    orientObjectOnSurface(this.ctx.terrain, this.cursorRing, dir, 0, normalOffset, onWater);
  }

  hideCursor() {
    this.cursorRing.visible = false;
  }

  /** Back to the resting look (the tour pulses and recolors it) */
  resetCursor() {
    this.cursorRing.visible = false;
    this.cursorRing.scale.setScalar(1.0);
    (this.cursorRing.material as THREE.MeshBasicMaterial).color.set('#fff8d6');
  }

  placeStaticObject(
    type: PlacedObjectType,
    dir: THREE.Vector3,
    yaw = Math.random() * Math.PI * 2,
    removable = true,
    withSparkles = true,
  ): PlacedObjectEntity {
    const { terrain } = this.ctx;
    const normDir = dir.clone().normalize();
    let meshGroup: THREE.Group;
    let windmillRotor: THREE.Object3D | undefined;
    let lighthouseBeamPivot: THREE.Object3D | undefined;
    let lighthouseConeMats: THREE.MeshBasicMaterial[] | undefined;
    let lighthousePointLight: THREE.PointLight | undefined;
    let windowMaterials: THREE.MeshStandardMaterial[] | undefined;
    let campfireFlameGroup: THREE.Group | undefined;
    let campfireEmbers: THREE.Points | undefined;
    let campfireLight: THREE.PointLight | undefined;
    let watchtowerFlag: THREE.Mesh | undefined;
    let butterflySwarm: THREE.Group | undefined;

    if (type === 'pagoda') {
      const res = createPagodaMesh(getPagodaStyle(DEFAULT_PAGODA_STYLE).spec);
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'house') {
      const res = createPastelHouseMesh(this.houseCounter++);
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'windmill') {
      const res = createWhiteWindmillMesh();
      meshGroup = res.group;
      windmillRotor = res.rotor;
      windowMaterials = res.windowMaterials;
    } else if (type === 'lighthouse') {
      const res = createStripedLighthouseMesh();
      meshGroup = res.group;
      lighthouseBeamPivot = res.beamPivot;
      lighthouseConeMats = res.coneMats;
      lighthousePointLight = res.pointLight;
      windowMaterials = res.windowMaterials;
    } else if (type === 'well') {
      meshGroup = createStoneWellMesh();
    } else if (type === 'fence') {
      meshGroup = createWoodenFenceMesh();
    } else if (type === 'path') {
      meshGroup = createSteppingPathMesh();
    } else if (type === 'oak') {
      meshGroup = createOakTreeMesh();
    } else if (type === 'pine') {
      const surface = terrain.getSurfacePointAndNormal(normDir);
      meshGroup = createPineTreeMesh(surface.isMountain || normDir.y > 0.65);
    } else if (type === 'palm') {
      meshGroup = createPalmTreeMesh();
    } else if (type === 'dock' || type === 'bridge') {
      const res = createWoodenDockMesh(type === 'bridge');
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'campfire') {
      const res = createCampfireMesh();
      meshGroup = res.group;
      campfireFlameGroup = res.flameGroup;
      campfireEmbers = res.embers;
      campfireLight = res.light;
    } else if (type === 'watchtower') {
      const res = createStoneWatchtowerMesh();
      meshGroup = res.group;
      watchtowerFlag = res.flagMesh;
      windowMaterials = res.windowMaterials;
    } else if (type === 'beehive') {
      const res = createBeehiveMesh();
      meshGroup = res.group;
      butterflySwarm = res.butterflySwarm;
    } else if (type === 'lantern') {
      const res = createLanternPostMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'rainbow') {
      meshGroup = createRainbowArchMesh();
    } else {
      meshGroup = createFlowerClusterMesh();
    }

    orientPlacedObject(terrain, type, meshGroup, normDir, yaw);
    this.ctx.groups.objects.add(meshGroup);

    const isTree = type === 'oak' || type === 'pine' || type === 'palm';
    const initialGrowth = isTree ? 0.82 + Math.random() * 0.22 : 1.0;

    const entity: PlacedObjectEntity = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      dir: normDir,
      yaw,
      mesh: meshGroup,
      baseScale: 1.0,
      growth: initialGrowth,
      targetGrowth: initialGrowth,
      bounceTime: withSparkles ? 0.0 : 10.0,
      bounceActive: withSparkles,
      windmillRotor,
      lighthouseBeamPivot,
      lighthouseConeMats,
      lighthousePointLight,
      windowMaterials,
      campfireFlameGroup,
      campfireEmbers,
      campfireLight,
      watchtowerFlag,
      butterflySwarm,
      removable,
    };

    if (withSparkles) {
      meshGroup.scale.setScalar(0.01);
      this.ctx.emitSparkles(normDir, '#ffe484');
    } else {
      meshGroup.scale.setScalar(initialGrowth);
    }

    this.ctx.entities.placedObjects.push(entity);
    return entity;
  }

  /** A tap on the planet with a tool armed */
  handleSurfaceAction(localDir: THREE.Vector3) {
    const tool = this.armedTool;
    if (!tool) return;

    const isBrush = isBrushTool(tool);
    const isSky = tool === 'cloud' || tool === 'snowcloud' || tool === 'shootingstar';

    // The Sect grounds are locked: nothing is built or sculpted on the terrace
    if (tool !== 'remove' && !isSky) {
      const keepClear = (this.ctx.homeZone?.angularRadius ?? SECT_ZONE_ANGLE) + (isBrush ? 0.04 : 0.015);
      if (localDir.angleTo(this.ctx.homeBaseDirection) < keepClear) {
        this.ctx.emitSparkles(localDir, '#ffb8b8');
        return;
      }
    }

    this.applyToolAt(tool, localDir);

    // Items are placed one at a time; brushes stay armed
    if (!isBrush) {
      this.setTool(null);
    }
  }

  private applyToolAt(tool: ToolId, localDir: THREE.Vector3) {
    const { terrain, homeBaseDirection } = this.ctx;
    const surface = terrain.getSurfacePointAndNormal(localDir);

    if (tool === 'raise' || tool === 'lower' || tool === 'mountain' || tool === 'lake') {
      terrain.sculptAtDirection(localDir, tool);
      realignAllObjectsToTerrain(this.ctx);
      this.ctx.emitSparkles(
        localDir,
        tool === 'lake' || tool === 'lower' ? '#7ef2e6' : '#c9f29b',
      );
      this.ctx.syncStats();
      return;
    }

    if (tool === 'remove') {
      this.removeNear(localDir);
      return;
    }

    // Weather & Sky tools
    if (tool === 'cloud') {
      this.weather.spawnCloud(localDir, true, 1.0, false);
      this.ctx.syncStats();
      return;
    }
    if (tool === 'snowcloud') {
      this.weather.spawnCloud(localDir, true, 0.2, true);
      this.ctx.syncStats();
      return;
    }
    if (tool === 'balloon') {
      this.skyEvents.spawnBalloon(localDir, true);
      this.ctx.syncStats();
      return;
    }
    if (tool === 'shootingstar') {
      this.skyEvents.spawnShootingStar(localDir);
      this.ctx.syncStats();
      return;
    }
    if (tool === 'rainbow') {
      const yaw = findCollisionFreeRainbowYaw(this.ctx, localDir);
      this.placeStaticObject(
        'rainbow',
        localDir,
        yaw,
        true,
        true,
      );
      this.ctx.syncStats();
      return;
    }

    // Water & Coastal tools
    if (tool === 'sailboat') {
      this.creatures.spawnSailboat(localDir, true);
      this.ctx.syncStats();
      return;
    }
    if (tool === 'duck') {
      this.creatures.spawnDuckFlock(localDir, true);
      this.ctx.syncStats();
      return;
    }
    if (tool === 'dock') {
      if (surface.isWater) {
        // Clicking on water spans an arched wooden footbridge across the channel
        this.placeStaticObject(
          'bridge',
          localDir,
          Math.random() * Math.PI * 2,
          true,
          true,
        );
      } else {
        // Clicking near shoreline builds a timber pier extending toward the nearest water
        const nearestWater = terrain.findNearestWaterDirection(localDir, 0.55);
        let yaw = Math.random() * Math.PI * 2;
        if (nearestWater) {
          const tangent = nearestWater
            .clone()
            .sub(localDir)
            .projectOnPlane(surface.normal)
            .normalize();
          yaw = Math.atan2(tangent.x, tangent.z);
        }
        this.placeStaticObject('dock', localDir, yaw, true, true);
      }
      this.ctx.syncStats();
      return;
    }

    // Ensure dry land for land-based items (if underwater, gently raise a small island patch!)
    if (surface.isWater) {
      terrain.sculptAtDirection(localDir, 'raise');
      realignAllObjectsToTerrain(this.ctx);
    }

    if (tool === 'tree') {
      const updated = terrain.getSurfacePointAndNormal(localDir);
      let treeType: PlacedObjectType = 'oak';
      if (updated.isBeach) {
        treeType = 'palm';
      } else if (updated.isMountain || localDir.y > 0.58) {
        treeType = 'pine';
      }
      this.placeStaticObject(treeType, localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'house') {
      const houseYaw = computeYawFacingTarget(terrain, localDir, homeBaseDirection);
      const newHouse = this.placeStaticObject('house', localDir, houseYaw, true, true);
      // Connect with a stepping stone path from the front door toward the well if nearby
      const doorDir = getBuildingEntranceDir(terrain, newHouse, 0);
      if (localDir.distanceTo(homeBaseDirection) < 0.55) {
        const pathDir = doorDir.clone().lerp(homeBaseDirection, 0.5).normalize();
        const pathYaw = computeYawFacingTarget(terrain, pathDir, homeBaseDirection);
        this.placeStaticObject('path', pathDir, pathYaw, true, false);
      }
      // Every new house welcomes 2 new villagers at its front doorstep!
      this.disciples.spawn(getBuildingEntranceDir(terrain, newHouse, -0.014), false);
      this.disciples.spawn(getBuildingEntranceDir(terrain, newHouse, 0.014), false);
    } else if (tool === 'windmill') {
      const yaw = computeYawFacingTarget(terrain, localDir, homeBaseDirection);
      this.placeStaticObject('windmill', localDir, yaw, true, true);
    } else if (tool === 'lighthouse') {
      this.placeStaticObject('lighthouse', localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'watchtower') {
      const yaw = computeYawFacingTarget(terrain, localDir, homeBaseDirection);
      this.placeStaticObject('watchtower', localDir, yaw, true, true);
    } else if (tool === 'campfire') {
      this.placeStaticObject('campfire', localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'beehive') {
      this.placeStaticObject('beehive', localDir, Math.random() * Math.PI * 2, true, true);
      // Also scatter a nearby meadow blossom cluster for the bees & butterflies
      const blossomDir = localDir
        .clone()
        .add(new THREE.Vector3(0.035, 0.02, -0.02))
        .normalize();
      if (!terrain.getSurfacePointAndNormal(blossomDir).isWater) {
        this.placeStaticObject('flower', blossomDir, Math.random() * Math.PI * 2, true, false);
      }
    } else if (tool === 'lantern') {
      this.placeStaticObject('lantern', localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'flower') {
      this.placeStaticObject('flower', localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'villager') {
      this.disciples.spawn(localDir, true);
    } else if (tool === 'sheep') {
      this.creatures.spawnSheep(localDir, true);
    }

    // Displace any villagers or sheep standing inside a newly placed structure's footprint
    const bridgesAndDocks = getBridgesAndDocks(this.ctx);
    for (const v of this.ctx.entities.villagers) {
      this.disciples.resolveCollisions(v, bridgesAndDocks);
    }
    for (const s of this.ctx.entities.sheep) {
      this.creatures.resolveSheepCollisions(s);
    }

    this.ctx.syncStats();
  }

  /** Remove the closest removable thing near `localDir`: an object, boat, flock or balloon */
  private removeNear(localDir: THREE.Vector3) {
    const { entities, groups, terrain } = this.ctx;

    // Find closest removable placed object, sailboat, duck, balloon, or cloud
    let bestIdx = -1;
    let bestDist = 0.16;
    for (let i = 0; i < entities.placedObjects.length; i++) {
      const o = entities.placedObjects[i];
      if (!o.removable) continue;
      const d = o.dir.distanceTo(localDir);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      const removed = entities.placedObjects.splice(bestIdx, 1)[0];
      groups.objects.remove(removed.mesh);
      releaseObjectResources(removed.mesh);
      this.ctx.emitSparkles(removed.dir, '#ffb8b8');
      this.ctx.syncStats();
      return;
    }

    // Check sailboats
    for (let i = 0; i < entities.sailboats.length; i++) {
      if (entities.sailboats[i].dir.distanceTo(localDir) < 0.18) {
        const removed = entities.sailboats.splice(i, 1)[0];
        groups.inhabitants.remove(removed.mesh);
        releaseObjectResources(removed.mesh);
        this.ctx.emitSparkles(removed.dir, '#ffb8b8', terrain.seaLevel);
        this.ctx.syncStats();
        return;
      }
    }

    // Check ducks
    for (let i = 0; i < entities.ducks.length; i++) {
      if (entities.ducks[i].dir.distanceTo(localDir) < 0.18) {
        const removed = entities.ducks.splice(i, 1)[0];
        groups.inhabitants.remove(removed.mesh);
        releaseObjectResources(removed.mesh);
        this.ctx.emitSparkles(removed.dir, '#ffb8b8', terrain.seaLevel);
        this.ctx.syncStats();
        return;
      }
    }

    // Check balloons
    for (let i = 0; i < entities.balloons.length; i++) {
      if (entities.balloons[i].currentDir.distanceTo(localDir) < 0.24) {
        const removed = entities.balloons.splice(i, 1)[0];
        groups.atmosphere.remove(removed.mesh);
        releaseObjectResources(removed.mesh);
        this.ctx.emitSparkles(removed.currentDir, '#ffb8b8', removed.baseAltitude);
        this.ctx.syncStats();
        return;
      }
    }
  }
}
