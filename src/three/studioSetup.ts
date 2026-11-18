import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/**
 * Detects CPU/software WebGL renderers (SwiftShader, llvmpipe, WARP)
 * from the WebGL renderer string, never the User-Agent.
 */
export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface StudioSceneRig {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  isSoftwareGl: boolean;
  keyLight: THREE.DirectionalLight;
  dispose: () => void;
}

export function createStudioRig(
  container: HTMLElement,
  fov = 34,
  transparentBg = false,
): StudioSceneRig {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
  );
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  if (transparentBg) {
    renderer.setClearColor(0x000000, 0);
  }

  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (!transparentBg) {
    scene.background = new THREE.Color(0x0e0f12);
  }
  scene.fog = new THREE.FogExp2(0x0e0f12, 0.018);

  // Mandatory Studio IBL Environment on ALL devices so metals never turn black
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  roomEnv.dispose();
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 80);
  camera.position.set(0, 0.2, 8.2);

  // Balanced 3-point + warm/cool studio contrast
  const hemiLight = new THREE.HemisphereLight(0xd4dce8, 0x1c1916, 0.62);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.65);
  keyLight.position.set(4.5, 6.2, 5.2);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xcfd9eb, 1.45);
  rimLight.position.set(-5.0, 2.2, -4.8);
  scene.add(rimLight);

  const underFill = new THREE.DirectionalLight(0x9f8b70, 0.55);
  underFill.position.set(1.5, -5.0, 3.0);
  scene.add(underFill);

  // Studio softbox panel on GPU devices for elongated specular bevel highlights
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const softbox = new THREE.RectAreaLight(0xfff7ec, 3.2, 3.2, 7.5);
    softbox.position.set(3.6, 1.5, 4.2);
    softbox.lookAt(0, 0, 0);
    scene.add(softbox);
  }

  const dispose = () => {
    envTarget.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    renderer,
    camera,
    isSoftwareGl,
    keyLight,
    dispose,
  };
}
