import * as THREE from 'three';

export interface AbyssalFieldHandle {
  group: THREE.Group;
  update: (timeSec: number, visibility: number) => void;
  dispose: () => void;
}

/**
 * Creates a deep-abyssal mineral-ink underwater orbital field:
 * - Soft radial depth-caustic floor ring beneath the suspended exploded pen
 * - 220 suspended mineral & brushed-gold motes drifting in cylindrical depth layers
 */
export function createAbyssalField(): AbyssalFieldHandle {
  const group = new THREE.Group();
  group.name = 'Abyssal_Orbital_Field';

  // 1. Procedural Abyssal Caustic & Azimuth Ring Floor (custom GLSL)
  const diskGeo = new THREE.PlaneGeometry(16, 16, 1, 1);
  diskGeo.rotateX(-Math.PI / 2);

  const diskMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uVisibility: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uVisibility;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y, p.x);

        // Soft abyssal radial vignette
        float mask = smoothstep(0.95, 0.15, r);

        // Concentric depth rings + subtle caustic interference waves
        float wave1 = sin(r * 18.0 - uTime * 0.8 + sin(angle * 3.0 + uTime * 0.4));
        float wave2 = cos(r * 11.0 + uTime * 0.5 - cos(angle * 5.0 - uTime * 0.3));
        float caustic = pow(max(0.0, 0.5 + 0.5 * wave1 * wave2), 3.0);

        // Subtle crisp compass calibration rings
        float ring1 = smoothstep(0.008, 0.0, abs(r - 0.42));
        float ring2 = smoothstep(0.006, 0.0, abs(r - 0.72));

        vec3 deepWater = vec3(0.11, 0.23, 0.31);
        vec3 goldGlow = vec3(0.78, 0.61, 0.43);

        vec3 col = deepWater * caustic * 0.9 + goldGlow * (ring1 * 0.34 + ring2 * 0.2);
        float alpha = mask * (caustic * 0.36 + ring1 * 0.34 + ring2 * 0.22) * uVisibility;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const diskMesh = new THREE.Mesh(diskGeo, diskMat);
  diskMesh.position.y = -3.4;
  group.add(diskMesh);

  // 2. Suspended Abyssal Mineral & Gold-Ink Motes (220 points, deterministic)
  const count = 220;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);

  let seed = 918273;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const radius = 1.4 + rand() * 5.2;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = (rand() - 0.5) * 6.5;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
    scales[i] = 0.6 + rand() * 1.8;
    phases[i] = rand() * Math.PI * 2;
  }

  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  ptsGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  ptsGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const ptsMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uVisibility: { value: 0 },
    },
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying float vAlpha;

      void main() {
        vec3 pos = position;
        pos.y += sin(uTime * 0.45 + aPhase) * 0.18;
        pos.x += cos(uTime * 0.3 + aPhase * 1.3) * 0.09;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aScale * (24.0 / max(1.0, -mvPos.z));
        vAlpha = 0.35 + 0.35 * sin(uTime * 0.8 + aPhase);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uVisibility;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.08, d);
        vec3 color = vec3(0.82, 0.75, 0.63);
        gl_FragColor = vec4(color, soft * vAlpha * uVisibility * 0.55);
      }
    `,
  });

  const points = new THREE.Points(ptsGeo, ptsMat);
  group.add(points);

  const update = (timeSec: number, visibility: number) => {
    const v = Math.max(0, Math.min(1, visibility));
    group.visible = v > 0.01;
    diskMat.uniforms.uTime.value = timeSec;
    diskMat.uniforms.uVisibility.value = v;
    ptsMat.uniforms.uTime.value = timeSec;
    ptsMat.uniforms.uVisibility.value = v;
  };

  const dispose = () => {
    diskGeo.dispose();
    diskMat.dispose();
    ptsGeo.dispose();
    ptsMat.dispose();
  };

  return { group, update, dispose };
}

export interface RipplePedestalHandle {
  mesh: THREE.Mesh;
  triggerPulse: () => void;
  update: (nowSec: number) => boolean;
  dispose: () => void;
}

/**
 * Creates a circular mineral-ink acoustic basin under the Feel Lab pen.
 * Clicking the pen cap emits an expanding physical shockwave ripple across the shader.
 */
export function createRipplePedestal(): RipplePedestalHandle {
  const geo = new THREE.PlaneGeometry(7.2, 7.2, 1, 1);
  geo.rotateX(-Math.PI / 2);

  let pulseStartSec = -10;

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uPulseAge: { value: 10.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uPulseAge;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float edgeMask = smoothstep(0.96, 0.25, r);

        // Resting mineral ink-basin ring
        float baseRing = smoothstep(0.01, 0.0, abs(r - 0.52)) * 0.22;

        // Expanding acoustic click wave
        float waveFront = uPulseAge * 0.85;
        float distFromWave = abs(r - waveFront);
        float pulse = smoothstep(0.14, 0.0, distFromWave) * exp(-uPulseAge * 1.9);
        float echo = smoothstep(0.09, 0.0, abs(r - max(0.0, waveFront - 0.16))) * exp(-uPulseAge * 2.5) * 0.5;

        vec3 baseCol = vec3(0.28, 0.30, 0.34);
        vec3 goldCol = vec3(0.82, 0.64, 0.43);

        vec3 col = mix(baseCol, goldCol, clamp(pulse + echo, 0.0, 1.0));
        float alpha = edgeMask * (baseRing + (pulse + echo) * 0.72 + 0.05);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, -2.15, 0);

  const triggerPulse = () => {
    pulseStartSec = performance.now() / 1000;
  };

  const update = (nowSec: number): boolean => {
    const age = Math.max(0, nowSec - pulseStartSec);
    mat.uniforms.uPulseAge.value = age;
    return age < 1.8;
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
  };

  return { mesh, triggerPulse, update, dispose };
}
