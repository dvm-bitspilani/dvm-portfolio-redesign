import * as THREE from 'three'
import type { Atlas } from './glyphs'
import type { Grid } from './grid'

/**
 * WebGL pipeline:
 *   1. persistence pass  — draws the two character grids from glyph atlases and
 *      keeps max(new, previous * decay) in a half-float ping-pong buffer (phosphor afterglow)
 *   2. bloom             — 1/4 and 1/8 resolution separable blurs
 *   3. CRT composite     — barrel curvature, chromatic fringe, scanlines, aperture grille,
 *      vignette, flicker, rolling band, glass noise, power on/off, glitch tearing
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

const PERSIST_FRAG = /* glsl */ `
precision highp float;
precision highp int;
varying vec2 vUv;
uniform sampler2D tMain, tFine, tAtlasM, tAtlasF, tPrev;
uniform vec2 uRes, uOrigin, uCell, uFCell;
uniform ivec2 uMSize, uFSize;
uniform int uACols;
uniform vec3 uInk, uHot;
uniform float uDecay, uBlinkOn;

vec3 colorOf(float a, float b, int fl) {
  bool inv = ((fl & 1) != 0) != ((fl & 16) != 0);
  float v = inv ? (1.0 - a) : a;
  vec3 c = uInk * b + (uHot - uInk) * max(0.0, b - 0.8) * 2.2;
  if ((fl & 4) != 0) c = mix(c, uHot * b, 0.6);
  return c * v;
}

vec3 textColor(vec2 g) {
  if (g.x < 0.0 || g.y < 0.0) return vec3(0.0);
  ivec2 mc = ivec2(floor(g / uCell));
  if (mc.x >= uMSize.x || mc.y >= uMSize.y) return vec3(0.0);
  vec4 cell = texelFetch(tMain, mc, 0);
  int gidx = int(cell.r * 255.0 + 0.5);
  int fl = int(cell.b * 255.0 + 0.5);
  if (gidx == 0 && (fl & 19) == 0) {
    ivec2 fc = ivec2(floor(g / uFCell));
    if (fc.x >= uFSize.x || fc.y >= uFSize.y) return vec3(0.0);
    vec4 f = texelFetch(tFine, fc, 0);
    int fg = int(f.r * 255.0 + 0.5);
    int ff = int(f.b * 255.0 + 0.5);
    if (fg == 0 && (ff & 1) == 0) return vec3(0.0);
    ivec2 flp = ivec2(g - vec2(fc) * uFCell);
    float fa = texelFetch(tAtlasF, ivec2(fg % uACols, fg / uACols) * ivec2(uFCell) + flp, 0).r;
    return colorOf(fa, f.g, ff);
  }
  ivec2 lp = ivec2(g - vec2(mc) * uCell);
  float a = texelFetch(tAtlasM, ivec2(gidx % uACols, gidx / uACols) * ivec2(uCell) + lp, 0).r;
  if ((fl & 2) != 0 && lp.y >= int(uCell.y) - max(1, int(uCell.y / 11.0))) a = 1.0;
  if ((fl & 8) != 0 && uBlinkOn < 0.5) a = ((fl & 1) != 0) ? 1.0 : 0.0;
  return colorOf(a, cell.g, fl);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 cur = textColor(px - uOrigin);
  vec3 prev = texture2D(tPrev, vUv).rgb;
  gl_FragColor = vec4(max(cur, prev * uDecay), 1.0);
}`

const DOWN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}`

const BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
  c += texture2D(tSrc, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(tSrc, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`

const CRT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene, tB1, tB2;
uniform vec2 uRes;
uniform vec3 uInk;
uniform float uTime, uCurv, uFx, uGlitch, uPowerY, uPowerX, uScanPitch, uBloom, uLumos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  // power on/off squash (CRT collapse to a line then a dot)
  float sy = max(uPowerY, 0.0005);
  float sx = max(uPowerX, 0.0005);
  vec2 pp = vec2(p.x / sx, p.y / sy);
  if (abs(pp.x) > 1.0 || abs(pp.y) > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float powerBoost = 1.0 / sqrt(sy * sx);

  vec2 q = pp;
  q.x *= 1.0 + q.y * q.y * uCurv * 0.85;
  q.y *= 1.0 + q.x * q.x * uCurv;

  // glitch: horizontal tearing on random bands
  if (uGlitch > 0.001) {
    float row = floor((q.y * 0.5 + 0.5) * 42.0);
    float tt = floor(uTime * 24.0);
    float r = hash(vec2(row, tt));
    if (r < uGlitch * 0.45) q.x += (hash(vec2(row + 7.0, tt)) - 0.5) * 0.18 * uGlitch;
  }

  vec2 s = q * 0.5 + 0.5;
  vec2 aq = abs(q);
  float rr = 0.035;
  vec2 dd = aq - (1.0 - rr);
  float dist = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - rr;
  float edge = 1.0 - smoothstep(-0.004, 0.002, dist);
  if (edge <= 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  float ca = (0.0012 + uGlitch * 0.008) * uFx;
  vec3 col;
  col.r = texture2D(tScene, s + vec2(ca * q.x, 0.0)).r;
  col.g = texture2D(tScene, s).g;
  col.b = texture2D(tScene, s - vec2(ca * q.x, 0.0)).b;
  vec3 bloom = texture2D(tB1, s).rgb * 0.7 + texture2D(tB2, s).rgb * 0.9;
  col += bloom * uBloom;

  // scanlines (in tube space so they curve with the glass)
  float lum = dot(col, vec3(0.3, 0.6, 0.1));
  float sl = s.y * uRes.y / uScanPitch;
  float scan = 0.5 + 0.5 * cos(6.2831853 * sl);
  col *= mix(1.0, mix(0.62, 1.08, scan), uFx * (1.0 - clamp(lum * 0.5, 0.0, 0.45)));

  // aperture grille
  float m = mod(floor(gl_FragCoord.x), 3.0);
  vec3 mask = m < 1.0 ? vec3(1.0, 0.86, 0.86) : (m < 2.0 ? vec3(0.86, 1.0, 0.86) : vec3(0.86, 0.86, 1.0));
  col *= mix(vec3(1.0), mask, 0.3 * uFx);

  // glass: faint phosphor glow + grain
  float n = hash(floor(gl_FragCoord.xy) + fract(uTime * 7.3) * 91.0);
  col += uInk * (0.016 + 0.014 * n) * uFx;

  // rolling refresh band
  float bp = fract(uTime * 0.075) * 1.4 - 0.2;
  col *= 1.0 + exp(-pow((1.0 - s.y - bp) * 9.0, 2.0)) * 0.06 * uFx;

  // flicker
  col *= 1.0 + (hash(vec2(floor(uTime * 50.0), 3.1)) - 0.5) * 0.035 * uFx;

  // vignette
  vec2 vv = s * (1.0 - s);
  float vig = pow(clamp(vv.x * vv.y * 15.0, 0.0, 1.0), 0.28);
  col *= mix(1.0, vig, uFx);

  // glass reflection (soft highlight top-left)
  float refl = smoothstep(1.1, 0.0, length((p - vec2(-0.55, 0.62)) * vec2(0.8, 1.3)));
  col += vec3(0.022) * refl * uFx;

  // lumos: warm white wash
  col += uInk * uLumos * 0.012;

  gl_FragColor = vec4(col * edge * powerBoost, 1.0);
}`

export interface Theme {
  ink: [number, number, number]
  hot: [number, number, number]
}

export interface Layout {
  /** device px of the grid origin inside the canvas */
  ox: number
  oy: number
  cw: number
  ch: number
  fcw: number
  fch: number
}

export interface FrameParams {
  time: number
  dt: number
  fx: number
  curvature: number
  glitch: number
  powerY: number
  powerX: number
  blinkOn: boolean
  persistence: number
  bloom: number
  lumos: number
  theme: Theme
}

function makeDataTex(cols: number, rows: number) {
  const data = new Uint8Array(Math.max(1, cols * rows) * 4)
  const t = new THREE.DataTexture(data, Math.max(1, cols), Math.max(1, rows), THREE.RGBAFormat, THREE.UnsignedByteType)
  t.minFilter = THREE.NearestFilter
  t.magFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.needsUpdate = true
  return t
}

function rt(w: number, h: number, type: THREE.TextureDataType) {
  return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  })
}

export class CRTRenderer {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private quad: THREE.Mesh
  private persist: THREE.ShaderMaterial
  private down: THREE.ShaderMaterial
  private blur: THREE.ShaderMaterial
  private crt: THREE.ShaderMaterial
  private pA: THREE.WebGLRenderTarget
  private pB: THREE.WebGLRenderTarget
  private q1: THREE.WebGLRenderTarget
  private q2: THREE.WebGLRenderTarget
  private e1: THREE.WebGLRenderTarget
  private e2: THREE.WebGLRenderTarget
  private mainTex: THREE.DataTexture
  private fineTex: THREE.DataTexture
  private atlasM: THREE.CanvasTexture | null = null
  private atlasF: THREE.CanvasTexture | null = null
  private w = 1
  private h = 1

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })
    this.renderer.autoClear = false
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    this.mainTex = makeDataTex(1, 1)
    this.fineTex = makeDataTex(1, 1)
    const half = THREE.HalfFloatType
    this.pA = rt(1, 1, half)
    this.pB = rt(1, 1, half)
    this.q1 = rt(1, 1, half)
    this.q2 = rt(1, 1, half)
    this.e1 = rt(1, 1, half)
    this.e2 = rt(1, 1, half)
    this.persist = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: PERSIST_FRAG,
      uniforms: {
        tMain: { value: this.mainTex },
        tFine: { value: this.fineTex },
        tAtlasM: { value: null },
        tAtlasF: { value: null },
        tPrev: { value: null },
        uRes: { value: new THREE.Vector2() },
        uOrigin: { value: new THREE.Vector2() },
        uCell: { value: new THREE.Vector2(8, 16) },
        uFCell: { value: new THREE.Vector2(4, 8) },
        uMSize: { value: new THREE.Vector2(1, 1) },
        uFSize: { value: new THREE.Vector2(1, 1) },
        uACols: { value: 16 },
        uInk: { value: new THREE.Color() },
        uHot: { value: new THREE.Color() },
        uDecay: { value: 0.8 },
        uBlinkOn: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    })
    this.down = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: DOWN_FRAG,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    })
    this.blur = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: BLUR_FRAG,
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    })
    this.crt = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: CRT_FRAG,
      uniforms: {
        tScene: { value: null },
        tB1: { value: this.q1.texture },
        tB2: { value: this.e1.texture },
        uRes: { value: new THREE.Vector2() },
        uInk: { value: new THREE.Color() },
        uTime: { value: 0 },
        uCurv: { value: 0.05 },
        uFx: { value: 1 },
        uGlitch: { value: 0 },
        uPowerY: { value: 1 },
        uPowerX: { value: 1 },
        uScanPitch: { value: 3 },
        uBloom: { value: 1 },
        uLumos: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    })
    this.quad = new THREE.Mesh(geo, this.persist)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  setAtlases(main: Atlas, fine: Atlas) {
    this.atlasM?.dispose()
    this.atlasF?.dispose()
    const mk = (a: Atlas) => {
      const t = new THREE.CanvasTexture(a.canvas)
      t.flipY = false
      t.minFilter = THREE.NearestFilter
      t.magFilter = THREE.NearestFilter
      t.generateMipmaps = false
      t.needsUpdate = true
      return t
    }
    this.atlasM = mk(main)
    this.atlasF = mk(fine)
    const u = this.persist.uniforms
    u.tAtlasM.value = this.atlasM
    u.tAtlasF.value = this.atlasF
    u.uACols.value = main.cols
  }

  setSize(cssW: number, cssH: number, dpr: number) {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(cssW, cssH, false)
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    this.w = w
    this.h = h
    this.pA.setSize(w, h)
    this.pB.setSize(w, h)
    const qw = Math.max(1, Math.round(w / 4))
    const qh = Math.max(1, Math.round(h / 4))
    this.q1.setSize(qw, qh)
    this.q2.setSize(qw, qh)
    this.e1.setSize(Math.max(1, Math.round(qw / 2)), Math.max(1, Math.round(qh / 2)))
    this.e2.setSize(Math.max(1, Math.round(qw / 2)), Math.max(1, Math.round(qh / 2)))
    this.renderer.setRenderTarget(this.pA)
    this.renderer.clear()
    this.renderer.setRenderTarget(this.pB)
    this.renderer.clear()
    this.renderer.setRenderTarget(null)
    ;(this.persist.uniforms.uRes.value as THREE.Vector2).set(w, h)
    ;(this.crt.uniforms.uRes.value as THREE.Vector2).set(w, h)
    this.crt.uniforms.uScanPitch.value = Math.max(2, 3 * dpr)
  }

  private uploadGrid(grid: Grid, which: 'main' | 'fine', hoverLink: number) {
    let tex = which === 'main' ? this.mainTex : this.fineTex
    const img = tex.image as { data: Uint8Array; width: number; height: number }
    if (img.width !== grid.cols || img.height !== grid.rows) {
      tex.dispose()
      tex = makeDataTex(grid.cols, grid.rows)
      if (which === 'main') {
        this.mainTex = tex
        this.persist.uniforms.tMain.value = tex
      } else {
        this.fineTex = tex
        this.persist.uniforms.tFine.value = tex
      }
    }
    const data = (tex.image as { data: Uint8Array }).data
    const n = grid.cols * grid.rows
    const { glyph, bright, flags, link } = grid
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      data[j] = glyph[i]
      data[j + 1] = bright[i]
      let f = flags[i]
      if (hoverLink && link[i] === hoverLink) f |= 16
      data[j + 2] = f
      data[j + 3] = 255
    }
    tex.needsUpdate = true
  }

  render(main: Grid, fine: Grid, layout: Layout, hoverLink: number, fp: FrameParams) {
    const r = this.renderer
    this.uploadGrid(main, 'main', hoverLink)
    this.uploadGrid(fine, 'fine', 0)
    const pu = this.persist.uniforms
    ;(pu.uOrigin.value as THREE.Vector2).set(layout.ox, layout.oy)
    ;(pu.uCell.value as THREE.Vector2).set(layout.cw, layout.ch)
    ;(pu.uFCell.value as THREE.Vector2).set(layout.fcw, layout.fch)
    ;(pu.uMSize.value as THREE.Vector2).set(main.cols, main.rows)
    ;(pu.uFSize.value as THREE.Vector2).set(fine.cols, fine.rows)
    ;(pu.uInk.value as THREE.Color).setRGB(...fp.theme.ink)
    ;(pu.uHot.value as THREE.Color).setRGB(...fp.theme.hot)
    pu.uDecay.value = fp.persistence > 0 ? Math.pow(0.5, fp.dt / fp.persistence) : 0
    pu.uBlinkOn.value = fp.blinkOn ? 1 : 0
    pu.tPrev.value = this.pB.texture

    // 1. persistence
    this.quad.material = this.persist
    r.setRenderTarget(this.pA)
    r.render(this.scene, this.camera)

    // 2. bloom
    const q = this.q1
    this.quad.material = this.down
    this.down.uniforms.tSrc.value = this.pA.texture
    ;(this.down.uniforms.uTexel.value as THREE.Vector2).set(1 / this.w, 1 / this.h)
    r.setRenderTarget(q)
    r.render(this.scene, this.camera)
    this.blurPass(this.q1, this.q2, q.width, q.height, 1)
    this.blurPass(this.q2, this.q1, q.width, q.height, 0)
    this.quad.material = this.down
    this.down.uniforms.tSrc.value = this.q1.texture
    ;(this.down.uniforms.uTexel.value as THREE.Vector2).set(0.5 / q.width, 0.5 / q.height)
    r.setRenderTarget(this.e1)
    r.render(this.scene, this.camera)
    this.blurPass(this.e1, this.e2, this.e1.width, this.e1.height, 1, 1.6)
    this.blurPass(this.e2, this.e1, this.e1.width, this.e1.height, 0, 1.6)

    // 3. composite
    const cu = this.crt.uniforms
    cu.tScene.value = this.pA.texture
    ;(cu.uInk.value as THREE.Color).setRGB(...fp.theme.ink)
    cu.uTime.value = fp.time
    cu.uCurv.value = fp.curvature
    cu.uFx.value = fp.fx
    cu.uGlitch.value = fp.glitch
    cu.uPowerY.value = fp.powerY
    cu.uPowerX.value = fp.powerX
    cu.uBloom.value = fp.bloom
    cu.uLumos.value = fp.lumos
    this.quad.material = this.crt
    r.setRenderTarget(null)
    r.render(this.scene, this.camera)

    // swap persistence buffers
    const t = this.pA
    this.pA = this.pB
    this.pB = t
  }

  private blurPass(src: THREE.WebGLRenderTarget, dst: THREE.WebGLRenderTarget, w: number, h: number, horizontal: 0 | 1, spread = 1) {
    this.quad.material = this.blur
    this.blur.uniforms.tSrc.value = src.texture
    ;(this.blur.uniforms.uDir.value as THREE.Vector2).set(horizontal ? spread / w : 0, horizontal ? 0 : spread / h)
    this.renderer.setRenderTarget(dst)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    for (const t of [this.pA, this.pB, this.q1, this.q2, this.e1, this.e2]) t.dispose()
    this.mainTex.dispose()
    this.fineTex.dispose()
    this.atlasM?.dispose()
    this.atlasF?.dispose()
    this.persist.dispose()
    this.down.dispose()
    this.blur.dispose()
    this.crt.dispose()
    this.quad.geometry.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
