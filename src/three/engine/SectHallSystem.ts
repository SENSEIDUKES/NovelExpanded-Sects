import * as THREE from 'three';
import { createPagodaMesh } from '../MiniatureObjects';
import { DEFAULT_PAGODA_STYLE, getPagodaStyle, PagodaStyleId } from '../pagodaStyles';
import { SECT_ZONE_ANGLE, UP_VEC, WorldContext } from './context';
import { orientPlacedObject } from './spatial';
import { releaseObjectResources } from './SceneResources';

/**
 * The Sect's home pagoda: which look it has, and rebuilding it in place when the Sect
 * picks a new one. Its spot, terrace and footprint never change.
 */
export class SectHallSystem {
  private styleId: PagodaStyleId = DEFAULT_PAGODA_STYLE;

  constructor(private ctx: WorldContext) {}

  get pagodaStyle() {
    return this.styleId;
  }

  setPagodaStyle(id: PagodaStyleId) {
    if (id === this.styleId) return;
    const pagoda = this.ctx.entities.placedObjects.find((o) => o.type === 'pagoda');
    if (!pagoda) return;
    this.styleId = id;
    const style = getPagodaStyle(id);

    const { group, windowMaterials } = createPagodaMesh(style.spec);
    orientPlacedObject(this.ctx.terrain, 'pagoda', group, pagoda.dir, pagoda.yaw);
    this.ctx.groups.objects.remove(pagoda.mesh);
    releaseObjectResources(pagoda.mesh);
    this.ctx.groups.objects.add(group);
    pagoda.mesh = group;
    pagoda.windowMaterials = windowMaterials;

    // Pop up like a fresh placement
    group.scale.setScalar(0.01);
    pagoda.bounceTime = 0;
    pagoda.bounceActive = true;

    // A ring of sparkles around the terrace edge in the new style's color
    const home = this.ctx.homeBaseDirection;
    const right = new THREE.Vector3().crossVectors(UP_VEC, home).normalize();
    const up = new THREE.Vector3().crossVectors(home, right).normalize();
    const ringRadius = Math.tan((this.ctx.homeZone?.angularRadius ?? SECT_ZONE_ANGLE) * 0.8);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dir = home
        .clone()
        .addScaledVector(right, Math.cos(angle) * ringRadius)
        .addScaledVector(up, Math.sin(angle) * ringRadius)
        .normalize();
      this.ctx.emitSparkles(dir, style.accent);
    }
    this.ctx.emitSparkles(home, style.accent);

    this.ctx.report((prev) => ({ ...prev, pagodaStyle: id }));
  }
}
