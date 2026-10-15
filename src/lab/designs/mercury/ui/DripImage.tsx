import { useEffect, useRef } from 'react'
import { FullscreenPass, loadImage } from '../gl/engine'
import { COMMON } from '../gl/chunks'
import { getEffectsPaused } from './effects'

/**
 * A cover image under a sheet of mercury. On mount the sheet drains down off
 * the frame; the trailing edge clings in rounded drips (height-field chrome
 * with thin-film). Afterwards a bead of mercury follows the cursor and refracts
 * the picture beneath it.
 */

const FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime, uProg, uHas, uImgAspect;
uniform sampler2D uTex;
uniform vec3 uBead;      // xy in px (canvas, y down), z radius px
${COMMON}

vec2 coverUV(vec2 uv){
  float boxA = uRes.x / uRes.y;
  vec2 s = boxA > uImgAspect ? vec2(1.0, uImgAspect/boxA) : vec2(boxA/uImgAspect, 1.0);
  return 0.5 + (uv - 0.5) * s;
}
vec3 img(vec2 uv){
  if(uHas < 0.5) return vec3(0.03);
  return texture(uTex, coverUV(clamp(uv, 0.0, 1.0))).rgb;
}

// distance-like value: > 0 inside the mercury
float drips(float x){
  float cells = 16.0;
  float cx = floor(x * cells);
  float d = 0.0;
  for(int k=-1;k<=1;k++){
    float c = cx + float(k);
    float h = hash12(vec2(c, 7.0));
    float centre = (c + 0.25 + 0.5*hash12(vec2(c, 3.0))) / cells;
    float w = (0.42 + 0.45*h) / cells;
    float len = (0.06 + 0.32*h*h) * smoothstep(0.0, 0.35, uProg) * (1.0 - smoothstep(0.75, 1.0, uProg));
    float q = (x - centre) / w;
    d = -smin(-d, -len * pow(max(0.0, 1.0 - q*q), 0.7), 0.04);
  }
  return d;
}
float sheet(vec2 p){ // p: x in [0,1], y down in [0,1]
  float b = mix(-0.25, 1.45, uProg) + 0.02*sin(p.x*9.0 + uTime*2.0);
  return (p.y - (b - drips(p.x)));
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = frag / uRes;
  vec3 col = img(uv);
  float a = 1.0;

  // cursor bead (2D metaball lens)
  if(uBead.z > 1.0){
    vec2 dv = frag - uBead.xy;
    float r = uBead.z;
    float f = r*r / max(dot(dv,dv), 1e-3);
    if(f > 0.6){
      float aa = fwidth(f) * 1.2;
      float m = smoothstep(1.0 - aa, 1.0 + aa, f);
      float q = clamp(inversesqrt(max(f, 1e-4)), 0.0, 1.0);   // |dv| / r
      float H = sqrt(max(0.0, 1.0 - q*q));                       // spherical cap
      vec2 dir = dv / max(length(dv), 1e-3);                      // y down
      vec3 n = normalize(vec3(dir.x*q, -dir.y*q, H + 0.05));      // y up for lighting
      vec2 off = dir * q * q * 0.05;
      vec2 base = (uBead.xy + dv * 0.6) / uRes;
      vec3 inside = vec3(img(base + off).r, img(base + off*1.1).g, img(base + off*1.2).b);
      float fres = pow(1.0 - n.z, 2.2);
      vec3 env = tonemap(studio(reflect(vec3(0,0,-1), n)) * mix(vec3(1.0), thinFilm(n.z, 320.0 + 400.0*(1.0-H))*1.5, 0.45));
      vec3 bead = mix(inside * (0.75 + 0.25*H), env, clamp(fres*1.4 + 0.05, 0.0, 1.0));
      bead += vec3(1.0) * pow(max(dot(n, normalize(vec3(-0.4, 0.6, 1.0))), 0.0), 120.0) * 0.9;
      col = mix(col * (1.0 - 0.35*smoothstep(0.6, 1.0, f)), bead, m);
    }
  }

  // draining sheet
  if(uProg < 1.0){
    float px = 1.0 / uRes.y;
    float e = sheet(uv);
    float rim = 0.035;
    float F  = clamp(e / rim, 0.0, 1.0);
    float Fx = clamp(sheet(uv + vec2(px*2.0, 0.0)) / rim, 0.0, 1.0);
    float Fy = clamp(sheet(uv + vec2(0.0, px*2.0)) / rim, 0.0, 1.0);
    float hgt = sqrt(1.0 - (1.0-F)*(1.0-F));
    float hx = sqrt(1.0 - (1.0-Fx)*(1.0-Fx)), hy = sqrt(1.0 - (1.0-Fy)*(1.0-Fy));
    vec3 n = normalize(vec3(-(hx - hgt)/(px*2.0)*0.02, (hy - hgt)/(px*2.0)*0.02, 1.0));
    // slow liquid swell inside the sheet
    float sw = 1.0 - smoothstep(0.0, 0.6, (1.0 - hgt));
    n.xy += sw * (0.22*vec2(sin(uv.y*7.0 + uTime*1.4 + uv.x*3.0), cos(uv.x*6.0 - uTime*1.1 + uv.y*2.0))
                + 0.08*vec2(sin(uv.x*23.0 + uv.y*9.0 - uTime*2.3), cos(uv.y*19.0 + uTime*1.9)));
    n = normalize(n);
    vec3 env = studio(reflect(normalize(vec3((uv.x-0.5)*0.9, (0.5-uv.y)*0.6, -1.0)), n));
    vec3 film = thinFilm(n.z, 280.0 + 600.0*(1.0-hgt));
    vec3 merc = tonemap(env * 0.9 * mix(vec3(1.0), film*1.6, 0.2 + 0.55*(1.0-hgt)));
    float cover = smoothstep(-0.002, 0.004, e);
    // contact darkening just ahead of the edge
    col *= 1.0 - 0.5*exp(-max(-e, 0.0)*60.0)*step(e, 0.0);
    col = mix(col, merc, cover);
  }
  fragColor = vec4(col * a, a);
}
`

export default function DripImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const canvas = document.createElement('canvas')
    canvas.className = 'merc-drip__canvas'
    canvas.setAttribute('aria-hidden', 'true')
    el.appendChild(canvas)
    let pass: FullscreenPass
    try {
      pass = new FullscreenPass(canvas, FRAG, { alpha: false })
    } catch {
      canvas.remove()
      el.classList.add('is-static')
      return
    }
    pass.scale = 0.8
    const tex = pass.createTexture()
    let has = 0, aspect = 16 / 9
    let disposed = false
    let prog = getEffectsPaused() ? 1 : 0
    let time = 0
    let last = performance.now()
    let raf = 0
    let started = false
    const bead = { x: -999, y: -999, tx: -999, ty: -999, r: 0, tr: 0 }

    if (src)
      loadImage(src)
        .then((img) => {
          if (disposed) return
          pass.uploadTexture(tex, img)
          has = 1
          aspect = img.naturalWidth / img.naturalHeight
          started = true
          kick()
        })
        .catch(() => {
          started = true
          kick()
        })
    else started = true

    const frame = (now: number) => {
      raf = 0
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const paused = getEffectsPaused()
      if (started) {
        time += dt
        prog = paused ? 1 : Math.min(1, prog + dt / 1.9)
      }
      bead.x += (bead.tx - bead.x) * Math.min(1, dt * 12)
      bead.y += (bead.ty - bead.y) * Math.min(1, dt * 12)
      bead.r += (bead.tr - bead.r) * Math.min(1, dt * 9)
      pass.resize()
      pass.use()
      pass.set2f('uRes', pass.width, pass.height)
      pass.set1f('uTime', time)
      pass.set1f('uProg', prog)
      pass.set1f('uHas', has)
      pass.set1f('uImgAspect', aspect)
      pass.set1f('uEnvSpin', Math.sin(time * 0.3) * 0.4)
      pass.setTex('uTex', 0, tex)
      const k = pass.pxPerCss
      pass.set3f('uBead', bead.x * k, bead.y * k, bead.r * k)
      pass.draw()
      const moving = prog < 1 || Math.abs(bead.r - bead.tr) > 0.3 || Math.hypot(bead.tx - bead.x, bead.ty - bead.y) > 0.3
      if (!disposed && !document.hidden && (moving || (!paused && bead.r > 1))) raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!raf && !disposed) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || prog < 1) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left, y = e.clientY - r.top
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height
      if (bead.r < 1 && inside) { bead.x = x; bead.y = y }
      bead.tx = x
      bead.ty = y
      bead.tr = inside ? Math.min(110, r.width * 0.09) : 0
      kick()
    }
    const ro = new ResizeObserver(kick)
    ro.observe(el)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', kick)
    kick()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', kick)
      pass.dispose()
      canvas.remove()
    }
  }, [src])

  return (
    <div ref={host} className={`merc-drip ${className ?? ''}`} role="img" aria-label={alt}>
      {src && <img className="merc-drip__fallback" src={src} alt="" />}
    </div>
  )
}
