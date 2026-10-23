import * as THREE from 'three';

/** Options for teardown of a scene whose resources are owned by this world. */
export interface SceneDisposalOptions {
  /** Disable only when textures are owned by an external/shared asset manager. */
  disposeTextures?: boolean;
  /** Textures retained by an external asset cache or another live world. */
  retainTextures?: ReadonlySet<THREE.Texture>;
}

/**
 * Release an owned object's GPU resources without detaching it. Geometries and
 * materials shared inside this subtree are freed once. Textures are deliberately
 * retained: effects can share their sprite with sky objects outside the subtree.
 * Geometry/material sharing across separate owners requires an asset manager.
 */
export function releaseObjectResources(root: THREE.Object3D): void {
  releaseResources(root, false);
}

/**
 * Tear down an entire owned scene, including texture maps, environment/background
 * textures and light shadow targets. Detaches the graph and is safe to repeat.
 */
export function disposeSceneResources(
  scene: THREE.Scene,
  { disposeTextures = true, retainTextures }: SceneDisposalOptions = {},
): void {
  releaseResources(scene, disposeTextures, retainTextures);
  scene.environment = null;
  scene.background = null;
  scene.clear();
}

/** Collect before disposing so shared resources in a graph receive one release. */
function releaseResources(root: THREE.Object3D, disposeTextures: boolean, retainTextures?: ReadonlySet<THREE.Texture>): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const shadows = new Set<THREE.LightShadow>();
  const textures = new Set<THREE.Texture>();

  root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Points || node instanceof THREE.Line) {
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material);
      }
    } else if (node instanceof THREE.Sprite) {
      // Sprite geometry is managed/shared by Three.js, while its material is owned here.
      materials.add(node.material);
    }
    if (node instanceof THREE.DirectionalLight || node instanceof THREE.SpotLight || node instanceof THREE.PointLight) {
      shadows.add(node.shadow);
    }
    if (disposeTextures && node instanceof THREE.Scene) {
      if (node.environment) textures.add(node.environment);
      if (node.background instanceof THREE.Texture) textures.add(node.background);
    }
  });

  if (disposeTextures) {
    const visited = new Set<object>();
    const collectTextures = (value: unknown): void => {
      if (value instanceof THREE.Texture) {
        textures.add(value);
      } else if (value && typeof value === 'object' && !visited.has(value)) {
        visited.add(value);
        if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) {
          for (const child of Object.values(value)) collectTextures(child);
        }
      }
    };
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      if (material instanceof THREE.ShaderMaterial) collectTextures(material.uniforms);
    }
  }

  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const shadow of shadows) shadow.dispose();
  for (const texture of textures) {
    if (!retainTextures?.has(texture)) texture.dispose();
  }
}
