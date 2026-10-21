import * as THREE from 'three';
import type { RoomEnvironmentHandles } from '../RoomEnvironment';
import {
  blendPalettes,
  DEFAULT_WORLD_TYPE,
  getWorldType,
  ResolvedPalette,
  resolvePalette,
  WorldTypeId,
} from '../worldTypes';
import type { WorldContext } from './context';

const WORLD_FADE_SECONDS = 1.0;

/**
 * World type (planet style): recolors land, water and atmosphere, fading over
 * WORLD_FADE_SECONDS. The terrain's shape and everything placed stay untouched.
 */
export class WorldStyleSystem {
  private worldType: WorldTypeId = DEFAULT_WORLD_TYPE;
  private worldPalette: ResolvedPalette = resolvePalette(getWorldType(DEFAULT_WORLD_TYPE).palette);
  private worldFade: { from: ResolvedPalette; to: ResolvedPalette; elapsed: number } | null = null;

  constructor(
    private ctx: WorldContext,
    private roomEnv: RoomEnvironmentHandles,
  ) {}

  setWorldType(id: WorldTypeId) {
    if (id === this.worldType) return;
    this.worldType = id;
    const target = getWorldType(id);
    this.worldFade = {
      from: this.worldPalette,
      to: resolvePalette(target.palette),
      elapsed: 0,
    };

    // A shimmer of sparkles across the visible land as the colors change
    for (let i = 0; i < 14; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();
      if (!this.ctx.terrain.getSurfacePointAndNormal(dir).isWater) {
        this.ctx.emitSparkles(dir, target.palette.shimmer);
      }
    }

    this.ctx.report((prev) => ({ ...prev, worldType: id }));
  }

  update(dt: number) {
    if (!this.worldFade) return;
    this.worldFade.elapsed += dt;
    const t = Math.min(1, this.worldFade.elapsed / WORLD_FADE_SECONDS);
    const eased = t * t * (3 - 2 * t);
    this.worldPalette = blendPalettes(this.worldFade.from, this.worldFade.to, eased);
    this.ctx.terrain.applyPalette(this.worldPalette);
    this.roomEnv.setAtmosphereTint(this.worldPalette.atmosphereTint);
    if (t >= 1) {
      this.worldFade = null;
    }
  }
}
