// three.js renderer for the constellation: one WebGL context, four draw calls.
//   dust   — points far behind the graph (parallax depth)
//   guides — instanced line quads: batch-ring orbits, fest orbits, the legacy time spiral
//   edges  — instanced screen-space quads with a gaussian glow and travelling light pulses
//   nodes  — instanced billboards drawn as glowing discs / rings / diamonds / squares / triangles
// Everything is additive light over a transparent canvas, so the page's teal texture and
// grid show through. World coordinates are y-down (like the sim); three gets (x, -y, z).
import * as THREE from 'three'

const nodeVert = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData;   // radius, shape, alpha, glow
attribute vec3 iColor;
uniform vec2 uViewport;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uSquare;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vGlow;
varying float vPx;
varying float vExt;
void main() {
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float r = mix(iData.x, 13.0, uSquare);
  float px = r * projectionMatrix[1][1] / max(-mv.z, 1.0) * uViewport.y * 0.5;
  float k = max(1.0, uMinPx / max(px, 1e-3));
  if (iData.y < 4.5) k = min(k, uMaxPx / max(px, 1e-3));
  float rr = r * k;
  float ext = 1.0 + 2.6 * (0.55 + iData.w);
  mv.xy += position.xy * rr * ext;
  vUv = position.xy * ext;
  vExt = ext;
  vPx = px * k;
  vColor = iColor;
  vAlpha = iData.z;
  vShape = iData.y;
  vGlow = iData.w;
  gl_Position = projectionMatrix * mv;
}`

const nodeFrag = /* glsl */ `
precision highp float;
uniform float uSquare;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
varying float vGlow;
varying float vPx;
varying float vExt;
float sdTri(vec2 p) {
  p.y = -p.y + 0.18;
  const float k = 1.7320508;
  p.x = abs(p.x) - 0.95;
  p.y = p.y + 0.95 / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -1.9, 0.0);
  return -length(p) * sign(p.y);
}
void main() {
  if (vAlpha < 0.003) discard;
  vec2 uv = vUv;
  float aa = 1.4 / max(vPx, 0.5);
  float d = length(uv);
  float sd;
  int sh = int(vShape + 0.5);
  if (sh == 2) sd = (abs(uv.x) + abs(uv.y)) * 0.78 - 1.0;
  else if (sh == 3) sd = max(abs(uv.x), abs(uv.y)) * 1.08 - 1.0;
  else if (sh == 4) sd = sdTri(uv * 1.05);
  else sd = d - 1.0;
  float sq = max(abs(uv.x), abs(uv.y)) * 1.08 - 1.0;
  sd = mix(sd, sq, uSquare);
  float body = 1.0 - smoothstep(-aa, aa, sd);
  if (sh == 2 && uSquare < 0.5) {
    float band = 1.0 - smoothstep(0.17 - aa, 0.17 + aa, abs(sd + 0.2));
    float dot = 1.0 - smoothstep(-aa, aa, (abs(uv.x) + abs(uv.y)) * 0.78 - 0.36);
    body = max(band, dot);
  }
  if (sh == 1 && uSquare < 0.5) {
    float ring = 1.0 - smoothstep(0.16 - aa, 0.16 + aa, abs(sd + 0.2));
    float dot = 1.0 - smoothstep(-aa, aa, d - 0.3);
    body = max(ring, dot);
  }
  if (sh == 5) body = 0.0;
  float edge = max(sd, 0.0);
  float halo = exp(-edge * edge * 3.2 / (vExt * 0.18)) * (0.16 + vGlow * 0.6);
  if (sh == 5) halo = exp(-d * d * 0.55) * 0.5;
  halo *= 1.0 - smoothstep(vExt * 0.7, vExt, d);
  float light = body + halo;
  vec3 col = vColor * light + vec3(body * vGlow * 0.35);
  gl_FragColor = vec4(col * vAlpha, body * vAlpha * 0.85);
}`

const edgeVert = /* glsl */ `
attribute vec3 iA;
attribute vec3 iB;
attribute vec4 iCol;    // rgb, alpha
attribute vec4 iP;      // speed, phase, span, offset
attribute float iW;     // core width px
uniform vec2 uViewport;
uniform float uHalo;
varying float vAlong;
varying float vAcross;
varying float vLen;
varying vec4 vCol;
varying vec4 vP;
varying float vW;
void main() {
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(iA, 1.0);
  vec4 cb = projectionMatrix * modelViewMatrix * vec4(iB, 1.0);
  vec2 half_ = uViewport * 0.5;
  vec2 sa = ca.xy / ca.w * half_;
  vec2 sb = cb.xy / cb.w * half_;
  vec2 dv = sb - sa;
  float len = length(dv);
  vec2 dir = len > 1e-4 ? dv / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = iW * 0.5 + uHalo * (0.5 + iCol.a);
  vec4 c = mix(ca, cb, position.x);
  c.xy += nrm * position.y * hw / half_ * c.w;
  vAlong = position.x;
  vAcross = position.y * hw;
  vLen = len;
  vCol = iCol;
  vP = iP;
  vW = iW;
  gl_Position = c;
}`

const edgeFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uHalo;
varying float vAlong;
varying float vAcross;
varying float vLen;
varying vec4 vCol;
varying vec4 vP;
varying float vW;
void main() {
  if (vCol.a < 0.002) discard;
  float a = abs(vAcross);
  float core = exp(-pow(a / max(vW * 0.5, 0.35), 2.0));
  float glow = exp(-pow(a / max(uHalo, 0.5), 2.0) * 1.6) * 0.32;
  float bump = 0.0;
  if (vP.x > 0.0) {
    float g = fract(uTime * vP.x + vP.y);
    float local = g * vP.z - vP.w;
    float dpx = (vAlong - local) * vLen;
    bump = exp(-dpx * dpx / 260.0) * 2.2;
  }
  vec3 col = vCol.rgb * (core + glow) * vCol.a * (1.0 + bump) + vCol.rgb * bump * glow * vCol.a;
  gl_FragColor = vec4(col, 0.0);
}`

const dustVert = /* glsl */ `
attribute float aSeed;
uniform vec2 uViewport;
uniform float uTime;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(2.2 * projectionMatrix[1][1] / -mv.z * uViewport.y * 0.5, 1.0, 2.6);
  vA = 0.28 + 0.22 * sin(uTime * (0.4 + aSeed) + aSeed * 40.0);
  gl_Position = projectionMatrix * mv;
}`
const dustFrag = /* glsl */ `
precision highp float;
uniform float uAlpha;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.2, 0.5, d)) * vA * uAlpha;
  gl_FragColor = vec4(vec3(0.42, 0.85, 0.95) * a, 0.0);
}`

const ADD_LIGHT = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const

/** A growable instanced set of glowing line segments. */
export class SegmentSet {
  readonly mesh: THREE.Mesh
  readonly geo: THREE.InstancedBufferGeometry
  readonly a: Float32Array
  readonly b: Float32Array
  readonly col: Float32Array
  readonly p: Float32Array
  readonly w: Float32Array
  private attrs: THREE.InstancedBufferAttribute[]
  count = 0
  constructor(readonly capacity: number, material: THREE.ShaderMaterial) {
    const geo = (this.geo = new THREE.InstancedBufferGeometry())
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3))
    geo.setIndex([0, 1, 2, 0, 2, 3])
    this.a = new Float32Array(capacity * 3)
    this.b = new Float32Array(capacity * 3)
    this.col = new Float32Array(capacity * 4)
    this.p = new Float32Array(capacity * 4)
    this.w = new Float32Array(capacity)
    const mk = (arr: Float32Array, size: number, name: string) => {
      const at = new THREE.InstancedBufferAttribute(arr, size)
      at.setUsage(THREE.DynamicDrawUsage)
      geo.setAttribute(name, at)
      return at
    }
    this.attrs = [mk(this.a, 3, 'iA'), mk(this.b, 3, 'iB'), mk(this.col, 4, 'iCol'), mk(this.p, 4, 'iP'), mk(this.w, 1, 'iW')]
    geo.instanceCount = 0
    this.mesh = new THREE.Mesh(geo, material)
    this.mesh.frustumCulled = false
  }
  set(k: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, g: number, bl: number, al: number, w: number, speed = 0, phase = 0, span = 1, offset = 0) {
    const a = this.a, b = this.b, c = this.col, p = this.p
    a[k * 3] = ax; a[k * 3 + 1] = -ay; a[k * 3 + 2] = az
    b[k * 3] = bx; b[k * 3 + 1] = -by; b[k * 3 + 2] = bz
    c[k * 4] = r; c[k * 4 + 1] = g; c[k * 4 + 2] = bl; c[k * 4 + 3] = al
    p[k * 4] = speed; p[k * 4 + 1] = phase; p[k * 4 + 2] = span; p[k * 4 + 3] = offset
    this.w[k] = w
  }
  commit(count: number) {
    this.count = count
    this.geo.instanceCount = count
    for (const at of this.attrs) {
      at.needsUpdate = true
      at.clearUpdateRanges()
      at.addUpdateRange(0, count * at.itemSize)
    }
  }
}

export class GraphRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(30, 1, 1, 10000)
  readonly nodePos: Float32Array
  readonly nodeData: Float32Array
  readonly nodeColor: Float32Array
  readonly edges: SegmentSet
  readonly guides: SegmentSet
  private nodeAttrs: THREE.InstancedBufferAttribute[]
  private mats: THREE.ShaderMaterial[] = []
  private dust: THREE.Points
  private uniforms = {
    uViewport: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uMinPx: { value: 1.7 },
    uMaxPx: { value: 26 },
    uSquare: { value: 0 },
    uHalo: { value: 5 },
    uAlpha: { value: 1 },
  }
  width = 1
  height = 1

  constructor(readonly canvas: HTMLCanvasElement, nodeCount: number, edgeCount: number, guideCount: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const u = this.uniforms
    const mat = (vertexShader: string, fragmentShader: string, uni: Record<string, { value: unknown }>) => {
      const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: uni, ...ADD_LIGHT })
      this.mats.push(m)
      return m
    }

    // dust
    const DUST = 1100
    const dpos = new Float32Array(DUST * 3)
    const seed = new Float32Array(DUST)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let k = 0; k < DUST; k++) {
      dpos[k * 3] = (rnd() - 0.5) * 5200
      dpos[k * 3 + 1] = (rnd() - 0.5) * 3600
      dpos[k * 3 + 2] = -260 - rnd() * 1500
      seed[k] = rnd()
    }
    const dgeo = new THREE.BufferGeometry()
    dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3))
    dgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    this.dust = new THREE.Points(dgeo, mat(dustVert, dustFrag, { uViewport: u.uViewport, uTime: u.uTime, uAlpha: u.uAlpha }))
    this.dust.frustumCulled = false
    this.scene.add(this.dust)

    // guides + edges
    const segMat = () => mat(edgeVert, edgeFrag, { uViewport: u.uViewport, uTime: u.uTime, uHalo: u.uHalo })
    this.guides = new SegmentSet(guideCount, segMat())
    this.edges = new SegmentSet(edgeCount, segMat())
    this.scene.add(this.guides.mesh)
    this.scene.add(this.edges.mesh)

    // nodes
    const geo = new THREE.InstancedBufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3))
    geo.setIndex([0, 1, 2, 0, 2, 3])
    this.nodePos = new Float32Array(nodeCount * 3)
    this.nodeData = new Float32Array(nodeCount * 4)
    this.nodeColor = new Float32Array(nodeCount * 3)
    const mk = (arr: Float32Array, size: number, name: string) => {
      const at = new THREE.InstancedBufferAttribute(arr, size)
      at.setUsage(THREE.DynamicDrawUsage)
      geo.setAttribute(name, at)
      return at
    }
    this.nodeAttrs = [mk(this.nodePos, 3, 'iPos'), mk(this.nodeData, 4, 'iData'), mk(this.nodeColor, 3, 'iColor')]
    geo.instanceCount = nodeCount
    const nodes = new THREE.Mesh(geo, mat(nodeVert, nodeFrag, { uViewport: u.uViewport, uMinPx: u.uMinPx, uMaxPx: u.uMaxPx, uSquare: u.uSquare }))
    nodes.frustumCulled = false
    this.scene.add(nodes)
  }

  resize(w: number, h: number) {
    this.width = Math.max(1, w)
    this.height = Math.max(1, h)
    this.renderer.setSize(this.width, this.height, false)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    this.uniforms.uViewport.value.set(this.width, this.height)
  }

  /** Centre (world, y-down) and scale in css px per world unit at z = 0; tilt in [-1, 1]. */
  setView(cx: number, cy: number, scale: number, tiltX: number, tiltY: number) {
    const cam = this.camera
    const half = (cam.fov * Math.PI) / 360
    const D = this.height / scale / 2 / Math.tan(half)
    cam.near = Math.max(1, D * 0.25)
    cam.far = D + 2400
    cam.updateProjectionMatrix()
    cam.position.set(cx + tiltX * D * 0.07, -cy - tiltY * D * 0.05, D)
    cam.lookAt(cx, -cy, 0)
    cam.updateMatrixWorld()
  }

  setLook(minPx: number, square: number, halo: number, dustAlpha: number) {
    this.uniforms.uMinPx.value = minPx
    this.uniforms.uSquare.value = square
    this.uniforms.uHalo.value = halo
    this.uniforms.uAlpha.value = dustAlpha
  }

  commitNodes() {
    for (const at of this.nodeAttrs) at.needsUpdate = true
  }

  render(time: number) {
    this.uniforms.uTime.value = time
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
    })
    for (const m of this.mats) m.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
