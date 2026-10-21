import * as THREE from 'three';

/**
 * Rendering and quality settings: owns the WebGL renderer, its canvas, and keeping it
 * sized to the container. Quality knobs live in RENDER_QUALITY so a future low/high
 * setting has one place to change.
 */
export const RENDER_QUALITY = {
  antialias: true,
  maxPixelRatio: 2,
  shadows: true,
  shadowType: THREE.PCFSoftShadowMap as THREE.ShadowMapType,
  toneMapping: THREE.ACESFilmicToneMapping as THREE.ToneMapping,
  exposure: 1.08,
};

export class RenderSystem {
  readonly renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private onWindowResize: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    const { width, height } = this.containerSize();

    this.renderer = new THREE.WebGLRenderer({
      antialias: RENDER_QUALITY.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER_QUALITY.maxPixelRatio));
    this.renderer.shadowMap.enabled = RENDER_QUALITY.shadows;
    this.renderer.shadowMap.type = RENDER_QUALITY.shadowType;
    this.renderer.toneMapping = RENDER_QUALITY.toneMapping;
    this.renderer.toneMappingExposure = RENDER_QUALITY.exposure;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);
  }

  get domElement() {
    return this.renderer.domElement;
  }

  get aspect() {
    const { width, height } = this.containerSize();
    return width / height;
  }

  private containerSize() {
    return {
      width: this.container.clientWidth || window.innerWidth,
      height: this.container.clientHeight || window.innerHeight,
    };
  }

  /** Keep the canvas and camera matched to the container as it resizes */
  watchResize(camera: THREE.PerspectiveCamera) {
    const onResize = () => {
      if (!this.container) return;
      const { width, height } = this.containerSize();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };
    this.resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    this.resizeObserver.observe(this.container);
    window.addEventListener('resize', onResize);
    this.onWindowResize = onResize;
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    if (this.onWindowResize) window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
