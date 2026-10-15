import * as THREE from 'three'

/* Palette (sRGB hex; THREE.Color converts to linear working space). */
export const PAL = {
  skyTop: '#02030f',
  skyHorizon: '#12153f',
  skyGlow: '#3b2350',
  fog: '#0c0e30',
  lamp: '#ffb547',
  lampHot: '#ffd59a',
  window: '#ffc879',
  windowCool: '#ffe3b0',
  violet: '#8f72ff',
  moon: '#c9d4ff',
}

/** Uniforms shared by every world material (updated once per frame). */
export const shared = {
  uTime: { value: 0 },
  uGlowOn: { value: 0 },
  uLit: { value: 0 },
  uMon: { value: 0 },
  uMoonDir: { value: new THREE.Vector3(-0.55, 0.72, -0.42).normalize() },
  uMoonCol: { value: new THREE.Color('#a3b2ff').multiplyScalar(0.42) },
  uSky: { value: new THREE.Color('#3a4888').multiplyScalar(0.4) },
  uGround: { value: new THREE.Color('#231a36').multiplyScalar(0.4) },
  uVoid: { value: new THREE.Color(PAL.fog) },
}

const fogParsV = /* glsl */ `#include <fog_pars_vertex>`
const fogParsF = /* glsl */ `#include <fog_pars_fragment>`

/* ---------------- world (toon + hemi + baked glow) ---------------- */
const worldVert = /* glsl */ `
attribute vec3 aGlow;
varying vec3 vColor;
varying vec3 vGlow;
varying vec3 vN;
varying vec3 vWorld;
${fogParsV}
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 wp = modelMatrix * p;
  vWorld = wp.xyz;
  vN = mat3(modelMatrix) * n;
  vColor = color;
  #ifdef USE_INSTANCING_COLOR
    vColor *= instanceColor;
  #endif
  vGlow = aGlow;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const worldFrag = /* glsl */ `
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uVoid;
uniform float uGlowOn;
uniform float uHi;
uniform float uEmit;
uniform float uDim;
uniform vec3 uHiCol;
varying vec3 vColor;
varying vec3 vGlow;
varying vec3 vN;
varying vec3 vWorld;
${fogParsF}
void main() {
  float nl = length(vN);
  vec3 n = nl > 1e-5 ? vN / nl : vec3(0.0, 1.0, 0.0);
  vec3 V = normalize(cameraPosition - vWorld);
  float hemi = n.y * 0.5 + 0.5;
  vec3 amb = mix(uGround, uSky, hemi);
  float ndl = dot(n, uMoonDir);
  float toon = smoothstep(0.0, 0.06, ndl) * 0.55 + smoothstep(0.42, 0.5, ndl) * 0.45;
  vec3 col = vColor * (amb + uMoonCol * toon);
  // moon rim on silhouettes
  float rim = pow(clamp(1.0 - dot(n, V), 0.0, 1.0), 3.0);
  col += uMoonCol * rim * 0.18 * max(ndl + 0.3, 0.0);
  col += vColor * vGlow * uGlowOn * 1.7;
  col += vColor * uEmit;
  col += uHiCol * (rim * 1.1 + 0.07) * uHi;
  col *= 1.0 - uDim;
  col = max(col, vec3(0.0));
  // fall into the void under the island
  float under = smoothstep(-0.8, -6.2, vWorld.y);
  col = mix(col, uVoid * 0.6, under * 0.7);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`

export function makeWorldMaterial(opts: { emit?: number } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: worldVert,
    fragmentShader: worldFrag,
    vertexColors: true,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMoonDir: shared.uMoonDir,
      uMoonCol: shared.uMoonCol,
      uSky: shared.uSky,
      uGround: shared.uGround,
      uVoid: shared.uVoid,
      uGlowOn: shared.uGlowOn,
      uHi: { value: 0 },
      uEmit: { value: opts.emit ?? 0 },
      uDim: { value: 0 },
      uHiCol: { value: new THREE.Color(PAL.lamp).multiplyScalar(0.9) },
    },
  })
}

/* ---------------- windows (seeded light-up + slow flicker) ---------------- */
const winVert = /* glsl */ `
attribute float aSeed;
varying vec3 vColor;
varying float vSeed;
${fogParsV}
void main() {
  vColor = color;
  vSeed = aSeed;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const winFrag = /* glsl */ `
uniform float uLit;
uniform float uHi;
uniform float uTime;
uniform float uFade;
varying vec3 vColor;
varying float vSeed;
${fogParsF}
float h(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
void main() {
  float on = step(vSeed, uLit * 1.02);
  float slot = floor(uTime * 0.06 + vSeed * 37.0);
  float flick = step(0.1, h(slot + vSeed * 91.0));
  float b = on * mix(1.0, flick, step(0.08, vSeed));
  vec3 lit = vColor * (0.95 + 0.3 * h(vSeed * 13.0) + uHi * 1.1);
  vec3 off = vec3(0.025, 0.028, 0.07);
  gl_FragColor = vec4(mix(off, lit * (1.0 - uFade * 0.8), b), 1.0);
  #include <fog_fragment>
}`
export function makeWindowMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: winVert,
    fragmentShader: winFrag,
    vertexColors: true,
    fog: true,
    side: THREE.DoubleSide,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uLit: shared.uLit, uTime: shared.uTime, uHi: { value: 0 }, uFade: { value: 0 } },
  })
}

/* ---------------- basic glow (bulbs, clock faces) ---------------- */
export function makeGlowMaterial(color: THREE.ColorRepresentation, intensity: number) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), fog: false, toneMapped: false })
  return m
}

/* ---------------- exhibit screens (atlas) ---------------- */
const exVert = /* glsl */ `
attribute vec4 aRect;
attribute float aHi;
varying vec2 vUv;
varying float vHi;
${fogParsV}
void main() {
  vUv = aRect.xy + uv * aRect.zw;
  vHi = aHi;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const exFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uBright;
uniform float uDim;
varying vec2 vUv;
varying float vHi;
${fogParsF}
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  c *= uBright * (1.0 - uDim * (1.0 - vHi)) + vHi * 0.55;
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`
export function makeExhibitMaterial(map: THREE.Texture, bright: number) {
  return new THREE.ShaderMaterial({
    vertexShader: exVert,
    fragmentShader: exFrag,
    fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uMap: { value: map }, uBright: { value: bright }, uDim: { value: 0 } },
  })
}

/* ---------------- water ---------------- */
export function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    transparent: false,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: shared.uTime, uGlowOn: shared.uGlowOn },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      ${fogParsV}
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uGlowOn;
      varying vec3 vWorld;
      ${fogParsF}
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(clamp(1.0 - V.y, 0.0, 1.0), 3.0);
        vec3 deep = vec3(0.012, 0.018, 0.06);
        vec3 sky = vec3(0.10, 0.12, 0.32);
        vec3 c = mix(deep, sky, fres);
        float w = sin(vWorld.x * 23.0 + uTime * 1.3) * sin(vWorld.z * 19.0 - uTime * 1.1) + sin((vWorld.x + vWorld.z) * 31.0 + uTime * 0.7) * 0.5;
        float glint = smoothstep(1.05, 1.4, w);
        c += vec3(1.0, 0.62, 0.25) * glint * 0.9 * uGlowOn;
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }`,
  })
}

/* ---------------- sky dome ---------------- */
export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(PAL.skyTop) },
      uHor: { value: new THREE.Color(PAL.skyHorizon) },
      uGlow: { value: new THREE.Color(PAL.skyGlow) },
      uMoonDir: shared.uMoonDir,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHor;
      uniform vec3 uGlow;
      uniform vec3 uMoonDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(uHor, uTop, smoothstep(0.45, 0.95, h));
        c = mix(c, uHor * 0.55, smoothstep(0.45, 0.1, h));
        // warm haze low on the opposite side of the moon (town glow)
        vec2 hd = d.xz / max(length(d.xz), 1e-4);
        float town = pow(max(dot(hd, -normalize(uMoonDir.xz)), 0.0), 3.0);
        c += uGlow * town * smoothstep(0.72, 0.5, h) * smoothstep(0.25, 0.5, h) * 0.8;
        float m = max(dot(d, uMoonDir), 0.0);
        c += vec3(0.55, 0.6, 0.9) * pow(m, 60.0) * 0.35 + vec3(0.25, 0.28, 0.5) * pow(m, 8.0) * 0.12;
        c += vec3(1.3, 1.32, 1.4) * smoothstep(0.99935, 0.9996, m);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

/* ---------------- stars ---------------- */
export function makeStarMaterial(dpr: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uDpr: { value: dpr } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uDpr;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w * 0.9999;
        float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 2.2) + aSeed * 40.0);
        vA = tw * (0.5 + aSize * 0.45);
        gl_PointSize = aSize * 1.3 * uDpr * (0.8 + 0.4 * tw);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.85, 0.88, 1.0) * a * vA, 1.0);
      }`,
  })
}

/* ---------------- fireflies ---------------- */
export function makeFireflyMaterial(dpr: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uDpr: { value: dpr }, uOn: shared.uGlowOn },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uDpr;
      uniform float uOn;
      varying float vA;
      void main() {
        vec3 p = position;
        float t = uTime * (0.25 + aSeed * 0.3) + aSeed * 60.0;
        p.x += sin(t * 1.3) * 0.22 + sin(t * 0.37) * 0.3;
        p.z += cos(t * 1.1) * 0.22 + sin(t * 0.29 + 2.0) * 0.3;
        p.y += sin(t * 0.9) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float blink = pow(max(sin(uTime * (0.8 + aSeed) + aSeed * 17.0), 0.0), 2.5);
        vA = blink * uOn;
        gl_PointSize = min((70.0 + 50.0 * aSeed) * uDpr / -mv.z, 26.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.18, 0.0, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.35;
        gl_FragColor = vec4(vec3(1.0, 0.92, 0.45) * (core * 2.4 + halo) * vA, 1.0);
      }`,
  })
}

/* ---------------- DVM monument ---------------- */
export function makeMonumentMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uOn: shared.uMon, uHi: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vWorld;
      varying vec3 vLocal;
      varying vec3 vLN;
      void main() {
        vLocal = position;
        vLN = normal;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = mat3(modelMatrix) * normal;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOn;
      uniform float uHi;
      varying vec3 vN;
      varying vec3 vWorld;
      varying vec3 vLocal;
      varying vec3 vLN;
      void main() {
        float nl = length(vN);
        vec3 n = nl > 1e-5 ? vN / nl : vec3(0.0, 0.0, 1.0);
        vec3 V = normalize(cameraPosition - vWorld);
        float facing = abs(dot(n, V));
        float fres = pow(clamp(1.0 - facing, 0.0, 1.0), 2.0);
        float y = vLocal.y + 0.5;
        float lz = abs(vLN.z / max(length(vLN), 1e-5));
        // faces, bevel (the hot edge) and the extruded sides
        float cap = smoothstep(0.88, 0.97, lz);
        float bevel = smoothstep(0.12, 0.3, lz) * (1.0 - cap);
        float side = 1.0 - cap - bevel;
        vec3 violet = vec3(0.36, 0.22, 1.0);
        vec3 warm = vec3(1.0, 0.68, 0.32);
        vec3 glow = mix(violet, warm, smoothstep(0.05, 1.0, y));
        float scan = smoothstep(0.03, 0.0, abs(fract(y - uTime * 0.16) - 0.5));
        float breathe = 0.9 + 0.1 * sin(uTime * 1.3);
        // faces: luminous enamel, brighter towards the top, with a travelling scan line
        vec3 faceCol = glow * (0.2 + 0.24 * y) + vec3(0.04, 0.02, 0.1);
        vec3 c = faceCol * cap * uOn;
        c += glow * bevel * 3.4 * breathe * uOn;
        c += glow * side * (0.75 + fres * 1.4) * uOn;
        c += vec3(1.0, 0.92, 0.82) * scan * (0.6 * cap + 1.6 * bevel) * uOn;
        c += vec3(0.03, 0.02, 0.08) * (1.0 - uOn);
        c *= 1.0 + uHi * 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

/** Soft volumetric shaft: view-dependent edge fade so the cylinder never reads as a tube. */
export function makeBeamMaterial(intensity = 0.16, tint = new THREE.Color(0.55, 0.42, 1.0)) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uOn: shared.uMon, uI: { value: intensity }, uTint: { value: tint } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vN = mat3(modelMatrix) * normal;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOn;
      uniform float uI;
      uniform vec3 uTint;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vWorld;
      void main() {
        vec3 n = normalize(vN + vec3(1e-5));
        vec3 V = normalize(cameraPosition - vWorld);
        float facing = pow(abs(dot(n, V)), 1.6);
        float v = vUv.y;
        float a = smoothstep(0.0, 0.06, v) * pow(clamp(1.0 - v, 0.0, 1.0), 1.7);
        float streak = 0.72 + 0.28 * sin(vUv.x * 6.2831 * 5.0 + uTime * 0.35 + v * 3.0);
        float drift = 0.85 + 0.15 * sin(v * 9.0 - uTime * 0.9);
        gl_FragColor = vec4(uTint * a * facing * streak * drift * uI * uOn, 1.0);
      }`,
  })
}

/** Ring of light on the rotunda floor (+ a slow dashed orbit). */
export function makeGroundRingMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uOn: shared.uMon, uHi: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOn;
      uniform float uHi;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float ang = atan(vP.y, vP.x);
        vec3 violet = vec3(0.45, 0.3, 1.0);
        vec3 warm = vec3(1.0, 0.7, 0.34);
        vec3 col = mix(violet, warm, 0.5 + 0.5 * sin(ang * 2.0 + uTime * 0.4));
        float pulse = 0.85 + 0.15 * sin(uTime * 1.3);
        float ring = exp(-pow((r - 1.02) / 0.03, 2.0)) * 1.9 + exp(-pow((r - 1.02) / 0.2, 2.0)) * 0.32;
        float dash = step(0.55, fract(ang / 6.2831 * 28.0 + uTime * 0.03)) * exp(-pow((r - 1.2) / 0.018, 2.0)) * 0.9;
        float pool = smoothstep(1.35, 0.5, r) * 0.12;
        float a = (ring * pulse + dash + pool) * (1.0 + uHi * 0.6) * uOn;
        gl_FragColor = vec4(col * a, 1.0);
      }`,
  })
}

export function makeRingMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uA: { value: 0 }, uCol: { value: new THREE.Color(PAL.lamp).multiplyScalar(3.2) } },
    vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform float uA; uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol * uA, 1.0); }`,
  })
}
