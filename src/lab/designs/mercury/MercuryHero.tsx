import { useEffect, useRef, useState, type RefObject } from 'react'
import { FullscreenPass, QualityGovernor } from './gl/engine'
import { buildMercuryShader, HALF_DEPTH, MAX_BLOBS, MAX_RIPPLES } from './gl/mercuryShader'
import { logoSdfCpu } from './gl/logoSdf'
import { subscribePause, useEffectsPaused } from './ui/effects'

/**
 * The hero: a fixed fullscreen canvas raymarching the liquid-chrome mark.
 * Scroll stages are read from [data-stage="0..3"] sections inside `scope`:
 * 0 chrome · 1 frosted glass · 2 x-ray · 3 the mercury lifts away.
 * Big headings marked [data-mbackdrop] are painted into a texture so the glass
 * stage can refract the actual typography sitting behind the logo.
 */

const TIERS = [
  { scale: 0.4, steps: 56 },
  { scale: 0.5, steps: 64 },
  { scale: 0.6, steps: 80 },
  { scale: 0.72, steps: 96 },
  { scale: 0.86, steps: 110 },
]

const FOV = (34 * Math.PI) / 180
const FOCAL = 1 / Math.tan(FOV / 2)
const CHAIN = 4
const DROPS = 6
const BREAK = 0.36
const REATTACH = 0.16

interface Body {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  r: number
}
interface Drop extends Body {
  alive: boolean
  merged: boolean
  age: number
  delay: number
}

const mkBody = (): Body => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0 })

type Layout = { x: number; y: number; scale: number }
function layoutFor(aspect: number, halfW: number, halfH: number): Layout[] {
  if (aspect < 0.85) {
    // portrait / phone: logo sits high, text flows below it
    return [
      { x: 0, y: halfH * 0.3, scale: 0.78 },
      { x: 0, y: halfH * 0.36, scale: 0.7 },
      { x: 0, y: halfH * 0.36, scale: 0.7 },
      { x: 0, y: halfH * 1.6, scale: 0.7 },
    ]
  }
  return [
    { x: halfW * 0.5, y: 0.04, scale: 0.94 },
    { x: halfW * 0.46, y: 0.12, scale: 0.92 },
    { x: -halfW * 0.48, y: 0.0, scale: 0.92 },
    { x: -halfW * 0.48, y: halfH * 2.2, scale: 0.92 },
  ]
}

export const STAGE_NAMES = ['Liquid chrome', 'Frosted glass', 'X-ray'] as const

export default function MercuryHero({
  scope,
  onStage,
}: {
  scope: RefObject<HTMLElement | null>
  onStage?: (stage: number) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const paused = useEffectsPaused()
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const onStageRef = useRef(onStage)
  onStageRef.current = onStage

  useEffect(() => {
    const el = host.current
    if (!el) return
    const canvas = document.createElement('canvas')
    canvas.className = 'merc-hero__canvas'
    canvas.setAttribute('aria-hidden', 'true')
    el.appendChild(canvas)

    let pass: FullscreenPass
    try {
      pass = new FullscreenPass(canvas, buildMercuryShader({ logo: true }))
    } catch (err) {
      console.warn('[mercury] WebGL unavailable, showing static mark', err)
      canvas.remove()
      setFailed(true)
      return
    }

    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700
    const maxTier = coarse ? 2 : TIERS.length - 1
    let tier = coarse ? 0 : 2
    pass.scale = TIERS[tier].scale
    const gov = new QualityGovernor(tier, maxTier, (t) => {
      tier = t
      pass.scale = TIERS[t].scale
      pass.resize()
    })

    // ---------- backdrop typography texture
    const bdCanvas = document.createElement('canvas')
    const bdTex = pass.createTexture(undefined, true)
    let docW = 1, docH = 1
    const drawBackdrop = () => {
      const root = scope.current
      if (!root) return
      docW = window.innerWidth
      docH = Math.max(document.documentElement.scrollHeight, window.innerHeight)
      const s = Math.min(0.5, 8192 / docH)
      bdCanvas.width = Math.max(1, Math.round(docW * s))
      bdCanvas.height = Math.max(1, Math.round(docH * s))
      const ctx = bdCanvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(s, 0, 0, s, 0, 0)
      ctx.clearRect(0, 0, docW, docH)
      const sy = window.scrollY
      root.querySelectorAll<HTMLElement>('[data-mbackdrop] [data-line]').forEach((line) => {
        const r = line.getBoundingClientRect()
        const cs = getComputedStyle(line)
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
        const mtx = ctx.measureText(line.textContent ?? '')
        const asc = mtx.fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * 0.8
        const desc = mtx.fontBoundingBoxDescent ?? parseFloat(cs.fontSize) * 0.2
        const top = r.top + sy
        const base = top + (r.height - (asc + desc)) / 2 + asc
        const g = ctx.createLinearGradient(0, top, 0, top + r.height)
        g.addColorStop(0, '#ffffff')
        g.addColorStop(0.45, '#c9c9cf')
        g.addColorStop(0.55, '#55555c')
        g.addColorStop(1, '#f2f2f4')
        ctx.fillStyle = g
        ctx.fillText(line.textContent ?? '', r.left, base)
      })
      pass.uploadTexture(bdTex, bdCanvas, true)
    }

    // ---------- state
    const chain: Body[] = Array.from({ length: CHAIN }, mkBody)
    const drops: Drop[] = Array.from({ length: DROPS }, () => ({ ...mkBody(), alive: false, merged: false, age: 0, delay: 0 }))
    const ripples: { x: number; y: number; t: number; a: number }[] = []
    const blobBuf = new Float32Array(MAX_BLOBS * 4)
    const ripBuf = new Float32Array(MAX_RIPPLES * 4)
    const sdf = new Float32Array(3)
    const pointer = { nx: 0, ny: 0, active: false, sx: 0, sy: 0 }
    const smooth = { yaw: 0, pitch: 0, mode: 0, x: 0, y: 0, scale: 1, fade: 0 }
    let attached = true
    let anchorX = 0, anchorY = 0
    let time = 0
    let last = performance.now()
    let raf = 0
    let running = false
    let lastStage = -1
    const R = new Float32Array(9) // logo local->world, column-major
    const RT = new Float32Array(9)
    const cam = new Float32Array(9)
    const camPos = [0, 0.08, 3]

    const addRipple = (x: number, y: number, a: number) => {
      ripples.push({ x, y, t: time, a })
      if (ripples.length > MAX_RIPPLES) ripples.shift()
    }
    const spawnDrop = (x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, delay = 0) => {
      let d = drops.find((q) => !q.alive)
      if (!d) d = drops.reduce((a, b) => (a.age > b.age ? a : b))
      Object.assign(d, { x, y, z, vx, vy, vz, r, alive: true, merged: false, age: 0, delay })
    }

    // intro: a few beads fall into the mark and ripple it
    const intro = !pausedRef.current
    if (intro) {
      spawnDrop(0.05, 1.3, 0.02, 0, -0.4, 0, 0.06, 0.25)
      spawnDrop(-0.22, 1.6, 0.0, 0.02, -0.3, 0, 0.042, 0.55)
      spawnDrop(0.27, 1.9, 0.0, -0.03, -0.3, 0, 0.035, 0.85)
    }

    // ---------- math helpers
    const setRot = (yaw: number, pitch: number) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
      // R = Ry(yaw) * Rx(pitch); columns
      R[0] = cy; R[1] = 0; R[2] = -sy
      R[3] = sy * sp; R[4] = cp; R[5] = cy * sp
      R[6] = sy * cp; R[7] = -sp; R[8] = cy * cp
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) RT[i * 3 + j] = R[j * 3 + i]
    }
    const lookAt = (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
      let bx = px - tx, by = py - ty, bz = pz - tz
      const bl = Math.hypot(bx, by, bz); bx /= bl; by /= bl; bz /= bl
      // right = (0,1,0) x back
      let rx = bz, ry = 0, rz = -bx
      const rl = Math.hypot(rx, ry, rz); rx /= rl; ry /= rl; rz /= rl
      const ux = by * rz - bz * ry, uy = bz * rx - bx * rz, uz = bx * ry - by * rx
      cam[0] = rx; cam[1] = ry; cam[2] = rz
      cam[3] = ux; cam[4] = uy; cam[5] = uz
      cam[6] = bx; cam[7] = by; cam[8] = bz
    }

    const stageProgress = () => {
      const root = scope.current
      if (!root) return 0
      const vh = window.innerHeight
      let s = 0
      for (let i = 1; i <= 3; i++) {
        const sec = root.querySelector<HTMLElement>(`[data-stage="${i}"]`)
        if (!sec) continue
        const top = sec.getBoundingClientRect().top
        s += Math.min(1, Math.max(0, (vh * 0.85 - top) / (vh * 0.55)))
      }
      return s
    }

    // ---------- pointer ray -> logo plane -> local coords
    const local = { x: 0, y: 0 }
    let curL: Layout = { x: 0, y: 0, scale: 1 }
    const toLocal = (sx: number, sy: number, L: Layout) => {
      const cssW = canvas.clientWidth, cssH = canvas.clientHeight
      const ndcX = (sx * 2 - cssW) / cssH, ndcY = -((sy * 2 - cssH) / cssH)
      let dx = cam[0] * ndcX + cam[3] * ndcY - cam[6] * FOCAL
      let dy = cam[1] * ndcX + cam[4] * ndcY - cam[7] * FOCAL
      let dz = cam[2] * ndcX + cam[5] * ndcY - cam[8] * FOCAL
      const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl
      const nx = R[6], ny = R[7], nz = R[8]
      const denom = dx * nx + dy * ny + dz * nz
      if (Math.abs(denom) < 1e-4) return false
      const t = ((L.x - camPos[0]) * nx + (L.y - camPos[1]) * ny + (0 - camPos[2]) * nz) / denom
      const hx = camPos[0] + dx * t - L.x, hy = camPos[1] + dy * t - L.y, hz = camPos[2] + dz * t
      local.x = (R[0] * hx + R[1] * hy + R[2] * hz) / L.scale
      local.y = (R[3] * hx + R[4] * hy + R[5] * hz) / L.scale
      return Math.abs(local.x) < 2.5 && Math.abs(local.y) < 2
    }

    // ---------- physics
    const step = (dt: number, L: Layout) => {
      const pActive = pointer.active && smooth.fade > 0.6 && smooth.mode < 1.6 && toLocal(pointer.sx, pointer.sy, L)
      const lx = local.x, ly = local.y
      logoSdfCpu(lx, ly, sdf)
      const d = sdf[0]
      if (pActive) { anchorX = sdf[1]; anchorY = sdf[2] }
      const ux = d !== 0 ? (lx - anchorX) / Math.max(Math.abs(d), 1e-4) : 0
      const uy = d !== 0 ? (ly - anchorY) / Math.max(Math.abs(d), 1e-4) : 0

      const S = [1, 0.68, 0.4, 0.14]
      const stretch = Math.min(1, Math.max(0, d) / BREAK)
      for (let i = 0; i < CHAIN; i++) {
        const b = chain[i]
        let rx = anchorX, ry = anchorY, rz = 0, rr = 0
        if (pActive && d < 0) {
          rx = lx; ry = ly; rz = HALF_DEPTH * 0.7
          rr = [0.058, 0.044, 0.034, 0.026][i]
          attached = true
        } else if (pActive && attached) {
          if (d > BREAK) {
            attached = false
            chain[0].vx += ux * 0.8; chain[0].vy += uy * 0.8
          } else {
            rx = anchorX + (lx - anchorX) * S[i]
            ry = anchorY + (ly - anchorY) * S[i]
            rr = [0.062, 0.046, 0.04, 0.05][i] * (i === 0 ? 1 - 0.25 * stretch : 1 - 0.5 * stretch)
          }
        }
        if (pActive && !attached) {
          if (i === 0) { rx = lx; ry = ly; rr = 0.052 }
          else { rr = 0.0 }
          if (d < REATTACH) attached = true
        }
        const K = i === 0 ? 230 : 120 - i * 18
        const C = i === 0 ? 15 : 10
        b.vx += ((rx - b.x) * K - b.vx * C) * dt
        b.vy += ((ry - b.y) * K - b.vy * C) * dt
        b.vz += ((rz - b.z) * K - b.vz * C) * dt
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
        b.r += (rr - b.r) * Math.min(1, dt * (rr > b.r ? 9 : 5))
      }

      for (const q of drops) {
        if (!q.alive) continue
        q.age += dt
        if (q.age < q.delay) continue
        logoSdfCpu(q.x, q.y, sdf)
        const qd = sdf[0]
        let tx: number, ty: number
        if (qd < 0) { tx = q.x; ty = q.y } else { tx = sdf[1]; ty = sdf[2] }
        const k = q.merged ? 30 : 11
        q.vx += ((tx - q.x) * k - q.vx * 2.4) * dt
        q.vy += ((ty - q.y) * k - q.vy * 2.4 - (qd > 0.2 ? 2.2 : 0)) * dt
        q.vz += ((0 - q.z) * k - q.vz * 3) * dt
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt
        if (!q.merged && qd < 0.012 && Math.abs(q.z) < HALF_DEPTH + q.r) {
          q.merged = true
          addRipple(q.x, q.y, 0.006 + q.r * 0.08)
        }
        if (q.merged) q.r -= dt * 0.07
        if (q.r <= 0 || q.age > q.delay + 7) q.alive = false
      }
    }

    const upload = (L: Layout, cssW: number, cssH: number) => {
      // blobs (local space)
      let n = 0
      let bound = 0.68
      const pushBlob = (b: Body) => {
        if (b.r < 0.002 || n >= MAX_BLOBS) return
        blobBuf[n * 4] = b.x; blobBuf[n * 4 + 1] = b.y; blobBuf[n * 4 + 2] = b.z; blobBuf[n * 4 + 3] = b.r
        bound = Math.max(bound, Math.hypot(b.x, b.y, b.z) + b.r + 0.1)
        n++
      }
      chain.forEach(pushBlob)
      drops.forEach((q) => q.alive && q.age >= q.delay && pushBlob(q))
      pass.set4fv('uBlobs', blobBuf)
      pass.set1i('uBlobN', n)
      let rn = 0
      for (const r of ripples) {
        if (time - r.t > 3.2) continue
        ripBuf[rn * 4] = r.x; ripBuf[rn * 4 + 1] = r.y; ripBuf[rn * 4 + 2] = r.t; ripBuf[rn * 4 + 3] = r.a
        rn++
      }
      pass.set4fv('uRipples', ripBuf)
      pass.set1i('uRippleN', rn)
      pass.set4f('uBound', L.x, L.y, 0, bound * L.scale)

      // logo centre on screen (css px)
      const vx = L.x - camPos[0], vy = L.y - camPos[1], vz = -camPos[2]
      const cx = vx * cam[0] + vy * cam[1] + vz * cam[2]
      const cy = vx * cam[3] + vy * cam[4] + vz * cam[5]
      const cz = -(vx * cam[6] + vy * cam[7] + vz * cam[8])
      const sxp = (cx / cz) * FOCAL, syp = (cy / cz) * FOCAL
      pass.set2f('uLogoScreen', (sxp * cssH + cssW) / 2, cssH - (syp * cssH + cssH) / 2)
    }

    const frame = (now: number) => {
      raf = 0
      const dtMs = now - last
      last = now
      const isPaused = pausedRef.current
      if (!isPaused) gov.sample(dtMs)
      const dt = Math.min(dtMs / 1000, 1 / 30)
      if (!isPaused) time += dt

      if (pass.isLost) return
      pass.resize()
      const cssW = canvas.clientWidth, cssH = canvas.clientHeight
      const aspect = cssW / Math.max(1, cssH)
      // camera distance: logo ~62% of height, or fits width on portrait screens
      const dist = Math.max(0.5 / 0.62, aspect < 0.85 ? 0.5 / (aspect * 0.86) : 0) * FOCAL
      camPos[0] = 0; camPos[1] = 0.06; camPos[2] = dist
      lookAt(camPos[0], camPos[1], camPos[2], 0, 0, 0)
      const halfH = dist / FOCAL, halfW = halfH * aspect
      const layouts = layoutFor(aspect, halfW, halfH)

      const sp = stageProgress()
      const i0 = Math.min(2, Math.floor(sp)), f = sp - i0
      const a = layouts[i0], b = layouts[Math.min(3, i0 + 1)]
      const e = f * f * (3 - 2 * f)
      const L: Layout = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, scale: a.scale + (b.scale - a.scale) * e }
      const targetMode = Math.min(2, sp)
      const k = isPaused ? 1 : Math.min(1, dt * 6)
      smooth.mode += (targetMode - smooth.mode) * k
      smooth.fade += ((isPaused ? 1 : Math.min(1, time * 1.2)) * (1 - Math.max(0, Math.min(1, sp - 2)) ) - smooth.fade) * (isPaused ? 1 : Math.min(1, dt * 5))
      const stageInt = sp > 2.5 ? 3 : Math.min(2, Math.round(sp))
      if (stageInt !== lastStage) {
        lastStage = stageInt
        onStageRef.current?.(stageInt)
      }

      const xr = Math.max(0, smooth.mode - 1)
      const yawT = isPaused ? 0.1 : (pointer.active ? pointer.nx * 0.2 : 0) + Math.sin(time * 0.31) * 0.07 + xr * Math.sin(time * 0.45) * 0.55 + 0.08
      const pitchT = isPaused ? -0.14 : (pointer.active ? -pointer.ny * 0.1 : 0) + Math.sin(time * 0.23) * 0.03 - 0.13
      smooth.yaw += (yawT - smooth.yaw) * k * 0.5
      smooth.pitch += (pitchT - smooth.pitch) * k * 0.5
      setRot(smooth.yaw, smooth.pitch)

      curL = L
      if (!isPaused) step(dt, L)

      pass.use()
      if (smooth.fade < 0.004) {
        pass.clear()
      } else {
        pass.set2f('uRes', pass.width, pass.height)
        pass.set1f('uTime', time)
        pass.set1f('uMode', smooth.mode)
        pass.set3f('uCamPos', camPos[0], camPos[1], camPos[2])
        pass.setMat3('uCamRot', cam)
        pass.set1f('uFocal', FOCAL)
        pass.set3f('uLogoPos', L.x, L.y, 0)
        pass.setMat3('uLogoRotT', RT)
        pass.set1f('uLogoScale', L.scale)
        pass.set1f('uBlendK', 0.1)
        pass.set1i('uSteps', TIERS[tier].steps)
        pass.setTex('uBackdrop', 0, bdTex)
        pass.set4f('uDoc', docW, docH, window.scrollY, pass.pxPerCss)
        pass.set1f('uFloorY', L.y - 0.5 * L.scale - 0.035)
        pass.set1f('uFloorAmt', aspect < 0.85 ? 0.6 : 1)
        pass.set1f('uFade', smooth.fade)
        pass.set1f('uFrost', 1.6)
        pass.set1f('uEnvSpin', Math.sin(time * 0.17) * 0.35)
        upload(L, cssW, cssH)
        pass.draw()
      }
      if (running && !isPaused) raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!raf && running) raf = requestAnimationFrame(frame)
    }
    const start = () => {
      running = !document.hidden
      last = performance.now()
      kick()
    }
    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
        raf = 0
      } else start()
    }

    // ---------- input
    const onMove = (e: PointerEvent) => {
      pointer.sx = e.clientX
      pointer.sy = e.clientY
      pointer.nx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.ny = (e.clientY / window.innerHeight) * 2 - 1
      pointer.active = e.pointerType !== 'touch'
    }
    const onLeave = () => {
      pointer.active = false
    }
    const onDown = (e: PointerEvent) => {
      if (pausedRef.current || smooth.fade < 0.6 || smooth.mode > 1.6) return
      const t = e.target as HTMLElement
      if (t.closest('a, button, input, textarea, select, label, [data-noblob]')) return
      onMove(e)
      if (!toLocal(e.clientX, e.clientY, curL)) return
      const lx = local.x, ly = local.y
      logoSdfCpu(lx, ly, sdf)
      if (sdf[0] < 0) {
        addRipple(lx, ly, 0.012)
        spawnDrop(lx, ly, HALF_DEPTH + 0.03, (Math.random() - 0.5) * 0.4, 0.5, 1.6, 0.045 + Math.random() * 0.015)
      } else {
        const len = Math.max(1e-4, sdf[0])
        spawnDrop(lx, ly, 0.0, ((lx - sdf[1]) / len) * 0.5, 0.7, 0.3, 0.04 + Math.random() * 0.025)
      }
      kick()
    }
    const onScroll = () => {
      if (pausedRef.current) kick()
    }
    let resizeT = 0
    const onResize = () => {
      clearTimeout(resizeT)
      resizeT = window.setTimeout(() => {
        drawBackdrop()
        kick()
      }, 120)
    }
    const ro = new ResizeObserver(onResize)
    if (scope.current) ro.observe(scope.current)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      drawBackdrop()
      kick()
    })
    drawBackdrop()
    start()

    // let the paused toggle restart / freeze the loop
    const unsub = subscribePause(() => {
      last = performance.now()
      kick()
    })

    return () => {
      cancelled = true
      running = false
      cancelAnimationFrame(raf)
      clearTimeout(resizeT)
      unsub()
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
      pass.dispose()
      canvas.remove()
    }
  }, [scope])

  return (
    <div ref={host} className="merc-hero" aria-hidden="true">
      {failed && <img className="merc-hero__fallback" src="/assets/logo.svg" alt="" />}
    </div>
  )
}

