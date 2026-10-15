import { useEffect, useMemo, useRef, type FocusEvent, type PointerEvent as RPointerEvent } from 'react'
import { FullscreenPass, loadImage } from '../gl/engine'
import { COMMON } from '../gl/chunks'
import { subscribePause, getEffectsPaused } from './effects'

/**
 * A droplet of mercury that follows the cursor and carries an image inside it.
 * 2D metaball field (head + two lagging tail beads) → height field → normals →
 * refraction of the image, chrome fresnel rim and thin-film iridescence.
 * mode 'cover': the hovered item's cover fills the drop.
 * mode 'loupe': the drop magnifies the element under it (portraits, artworks).
 */

export interface LensTarget {
  src?: string
  mode: 'cover' | 'loupe'
  /** For loupe: the <img> being magnified (object-fit: cover). */
  el?: HTMLElement | null
  /** Anchor for keyboard focus (lens parks next to it). */
  anchor?: HTMLElement | null
}

export class LensController {
  target: LensTarget | null = null
  version = 0
  show(t: LensTarget) {
    this.target = t
    this.version++
    this.onChange?.()
  }
  hide() {
    this.target = null
    this.version++
    this.onChange?.()
  }
  onChange?: () => void
  /** Props helper for list items. */
  bind(t: () => LensTarget) {
    return {
      onPointerEnter: (e: RPointerEvent) => {
        if (e.pointerType !== 'touch') this.show(t())
      },
      onPointerLeave: () => this.hide(),
      onFocus: (e: FocusEvent<HTMLElement>) => this.show({ ...t(), anchor: e.currentTarget }),
      onBlur: () => this.hide(),
    }
  }
}

export function useLens() {
  return useMemo(() => new LensController(), [])
}

const FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uR, uR1, uR2;
uniform vec2 uC1, uC2;
uniform sampler2D uTexCur, uTexPrev;
uniform float uMix;
uniform vec4 uCurMap, uPrevMap;   // xy = uv centre, zw = uv per lens unit
uniform float uHasCur, uHasPrev;
uniform float uWobble;
${COMMON}

float field(vec2 p, out vec2 g){
  vec2 a = p, b = p - uC1, c = p - uC2;
  float da = max(dot(a,a), 1e-5), db = max(dot(b,b), 1e-5), dc = max(dot(c,c), 1e-5);
  float ra = uR*uR, rb = uR1*uR1, rc = uR2*uR2;
  g = -2.0*(ra*a/(da*da) + rb*b/(db*db) + rc*c/(dc*dc));
  return ra/da + rb/db + rc/dc;
}

vec3 sampleImg(sampler2D t, vec4 m, vec2 p){
  vec2 uv = clamp(m.xy + vec2(p.x, -p.y) * m.zw, 0.0, 1.0);
  return texture(t, uv).rgb;
}
vec3 content(vec2 p){
  vec3 cur = uHasCur > 0.5 ? sampleImg(uTexCur, uCurMap, p) : vec3(0.0);
  vec3 prev = uHasPrev > 0.5 ? sampleImg(uTexPrev, uPrevMap, p) : vec3(0.0);
  return mix(prev, cur, uMix);
}

void main(){
  vec2 p = (2.0*gl_FragCoord.xy - uRes) / uRes.y;
  float ang = atan(p.y, p.x);
  vec2 pw = p * (1.0 + uWobble * sin(ang*3.0 + uTime*7.0) * 0.5);
  vec2 g;
  float f = field(pw, g);
  float aa = fwidth(f) * 1.2;
  float alpha = smoothstep(1.0 - aa, 1.0 + aa, f);

  // contact shadow (drop floats slightly above the page)
  vec2 gs;
  float fs = field(pw + vec2(-0.02, 0.07), gs);
  float shadow = smoothstep(0.35, 1.1, fs) * 0.55;

  vec4 outc = vec4(0.0, 0.0, 0.0, shadow * (1.0 - alpha));
  if(alpha > 0.0){
    float fc = max(f, 1.0);
    float H = 1.0 - 1.0/fc;
    vec2 gH = g / (fc*fc);
    vec3 n = normalize(vec3(-gH * 0.3, 1.0));
    float cosI = n.z;
    float fres = pow(1.0 - cosI, 2.4);
    vec2 off = -n.xy * 0.16 * (1.0 - H*0.6);
    float has = max(uHasCur * uMix, uHasPrev * (1.0 - uMix));
    vec3 img = vec3(content(p*0.92 + off).r, content(p*0.92 + off*1.12).g, content(p*0.92 + off*1.25).b);
    vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
    vec3 env = studio(r);
    vec3 film = thinFilm(cosI, 300.0 + 520.0*(1.0 - H) + 40.0*sin(uTime + p.x*4.0));
    vec3 chrome = tonemap(env * mix(vec3(1.0), film*1.5, 0.45));
    float refl = mix(1.0, clamp(fres*1.1 + 0.03, 0.0, 1.0), has);
    vec3 col = img * (0.72 + 0.28*smoothstep(0.0, 0.35, H)) * (1.0 - refl) + chrome * refl;
    // specular kiss from the overhead box
    col += vec3(1.0) * pow(max(dot(n, normalize(vec3(-0.35, 0.55, 1.0))), 0.0), 90.0) * 0.8;
    outc = vec4(col * alpha, alpha) + outc * (1.0 - alpha);
  }
  fragColor = outc;
}
`

interface Tex {
  tex: WebGLTexture
  w: number
  h: number
}

export default function LiquidLens({ controller, size = 460, radius = 0.46 }: { controller: LensController; size?: number; radius?: number }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    const canvas = document.createElement('canvas')
    canvas.className = 'merc-lens__canvas'
    canvas.style.width = canvas.style.height = `${size}px`
    el.appendChild(canvas)
    let pass: FullscreenPass
    try {
      pass = new FullscreenPass(canvas, FRAG)
    } catch {
      canvas.remove()
      return
    }
    pass.scale = 0.85
    pass.resize(size, size)

    const texCache = new Map<string, Tex | 'loading' | 'error'>()
    const empty = pass.createTexture()
    const getTex = (src?: string): Tex | null => {
      if (!src) return null
      const c = texCache.get(src)
      if (c === 'loading' || c === 'error') return null
      if (c) return c
      texCache.set(src, 'loading')
      loadImage(src)
        .then((img) => {
          if (disposed) return
          const tex = pass.createTexture(img)
          texCache.set(src, { tex, w: img.naturalWidth, h: img.naturalHeight })
          kick()
        })
        .catch(() => texCache.set(src, 'error'))
      return null
    }

    const head = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0 }
    const tails = [
      { x: head.x, y: head.y, vx: 0, vy: 0 },
      { x: head.x, y: head.y, vx: 0, vy: 0 },
    ]
    const ptr = { x: head.x, y: head.y, seen: false }
    let show = 0, showV = 0
    let wob = 0
    let mix = 1
    let cur: LensTarget | null = null
    let prev: LensTarget | null = null
    let lastVersion = -1
    let time = 0
    let last = performance.now()
    let raf = 0
    let disposed = false

    const mapFor = (t: LensTarget | null, tex: Tex | null, out: number[]) => {
      // returns [cx, cy, sx, sy] in uv
      if (!t || !tex) return [0.5, 0.5, 0.5, 0.5]
      const aspect = tex.w / tex.h
      if (t.mode === 'loupe' && t.el) {
        const r = t.el.getBoundingClientRect()
        // object-fit: cover mapping from screen px to image uv
        const ea = r.width / r.height
        let sw = 1, sh = 1
        if (aspect > ea) sw = ea / aspect
        else sh = aspect / ea
        const u = (head.x - r.left) / r.width, v = (head.y - r.top) / r.height
        const cx = 0.5 + (u - 0.5) * sw, cy = 0.5 + (v - 0.5) * sh
        const mag = 1.9
        const perUnitX = ((size / 2) / r.width) * sw / mag
        const perUnitY = ((size / 2) / r.height) * sh / mag
        out.splice(0, 4, cx, cy, perUnitX, perUnitY)
        return out
      }
      // the drop shows (almost) the full short side of the cover
      const k = 0.9
      const sx = aspect > 1 ? k / aspect : k
      const sy = aspect > 1 ? k : k * aspect
      out.splice(0, 4, 0.5, 0.5, sx, sy)
      return out
    }
    const mCur = [0, 0, 0, 0], mPrev = [0, 0, 0, 0]

    const frame = (now: number) => {
      raf = 0
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const paused = getEffectsPaused()
      time += dt

      if (controller.version !== lastVersion) {
        lastVersion = controller.version
        const next = controller.target
        if (next && (!cur || next.src !== cur.src || next.el !== cur.el)) {
          if (cur) {
            prev = cur
            mix = 0
          }
          cur = next
          wob = 1
          getTex(next.src)
          if (next.anchor && !ptr.seen) {
            const r = next.anchor.getBoundingClientRect()
            ptr.x = Math.min(innerWidth - size * 0.4, r.right + size * 0.2)
            ptr.y = r.top + r.height / 2
          }
        }
      }
      const target = controller.target
      const want = target ? 1 : 0
      if (paused) {
        show = want
        head.x = ptr.x; head.y = ptr.y
        for (const t of tails) { t.x = head.x; t.y = head.y; t.vx = t.vy = 0 }
      } else {
        showV += ((want - show) * 160 - showV * 14) * dt
        show = Math.max(0, show + showV * dt)
        head.vx += ((ptr.x - head.x) * 210 - head.vx * 22) * dt
        head.vy += ((ptr.y - head.y) * 210 - head.vy * 22) * dt
        head.x += head.vx * dt
        head.y += head.vy * dt
        tails.forEach((t, i) => {
          const lead = i === 0 ? head : tails[0]
          const K = i === 0 ? 120 : 80
          t.vx += ((lead.x - t.x) * K - t.vx * 13) * dt
          t.vy += ((lead.y - t.y) * K - t.vy * 13) * dt
          t.x += t.vx * dt
          t.y += t.vy * dt
        })
      }
      mix = Math.min(1, mix + dt * 4)
      wob = Math.max(0, wob - dt * 1.6)

      if (!target && show < 0.01 && Math.abs(showV) < 0.05) {
        canvas.style.visibility = 'hidden'
        show = 0
        showV = 0
        cur = null
        prev = null
        return // idle until next show()
      }
      canvas.style.visibility = 'visible'
      canvas.style.transform = `translate3d(${head.x - size / 2}px, ${head.y - size / 2}px, 0)`

      const half = size / 2
      const clampL = (v: number) => Math.max(-0.62, Math.min(0.62, v))
      const c1x = clampL((tails[0].x - head.x) / half), c1y = clampL(-(tails[0].y - head.y) / half)
      const c2x = clampL((tails[1].x - head.x) / half), c2y = clampL(-(tails[1].y - head.y) / half)
      const speed = Math.hypot(head.vx, head.vy)
      const stretch = Math.min(1, speed / 1800)

      const tc = getTex(cur?.src)
      const tp = getTex(prev?.src)
      pass.use()
      pass.resize(size, size)
      pass.set2f('uRes', pass.width, pass.height)
      pass.set1f('uTime', time)
      const s = Math.max(0, show)
      pass.set1f('uR', radius * s * (1 - stretch * 0.12))
      pass.set1f('uR1', radius * 0.5 * s * (0.6 + stretch))
      pass.set1f('uR2', radius * 0.32 * s * (0.5 + stretch))
      pass.set2f('uC1', c1x, c1y)
      pass.set2f('uC2', c2x, c2y)
      pass.set1f('uWobble', paused ? 0 : wob * 0.12)
      pass.setTex('uTexCur', 0, tc ? tc.tex : empty)
      pass.setTex('uTexPrev', 1, tp ? tp.tex : empty)
      pass.set1f('uHasCur', tc ? 1 : 0)
      pass.set1f('uHasPrev', tp ? 1 : 0)
      pass.set1f('uMix', mix)
      mapFor(cur, tc, mCur)
      mapFor(prev, tp, mPrev)
      pass.set4f('uCurMap', mCur[0], mCur[1], mCur[2], mCur[3])
      pass.set4f('uPrevMap', mPrev[0], mPrev[1], mPrev[2], mPrev[3])
      pass.set1f('uEnvSpin', Math.sin(time * 0.4) * 0.5 + (head.x / innerWidth - 0.5) * 0.8)
      pass.draw()
      if (!document.hidden && !paused) raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!raf && !disposed) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      ptr.x = e.clientX
      ptr.y = e.clientY
      if (!ptr.seen) {
        ptr.seen = true
        head.x = ptr.x; head.y = ptr.y
        tails.forEach((t) => { t.x = ptr.x; t.y = ptr.y })
      }
      if (controller.target) kick()
    }
    const onVis = () => {
      if (!document.hidden) kick()
    }
    controller.onChange = kick
    const unsub = subscribePause(kick)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', kick, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    canvas.style.visibility = 'hidden'
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      controller.onChange = undefined
      unsub()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', kick)
      document.removeEventListener('visibilitychange', onVis)
      pass.dispose()
      canvas.remove()
    }
  }, [controller, size, radius])

  return <div ref={host} className="merc-lens" aria-hidden="true" />
}
