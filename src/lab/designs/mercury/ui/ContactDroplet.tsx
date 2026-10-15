import { useEffect, useRef, type RefObject } from 'react'
import { FullscreenPass } from '../gl/engine'
import { buildMercuryShader, MAX_BLOBS } from '../gl/mercuryShader'
import { getEffectsPaused, subscribePause } from './effects'

/**
 * A pool of mercury that grows as you type. Every keystroke drops a bead from
 * above that falls, necks into the pool and merges; the pool's volume tracks the
 * length of the message. Same raymarcher as the hero, with the logo switched off.
 */

export interface DropletApi {
  type: (chars: number) => void
  burst: () => void
}

export default function ContactDroplet({ api }: { api: RefObject<DropletApi | null> }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const canvas = document.createElement('canvas')
    canvas.className = 'merc-droplet__canvas'
    canvas.setAttribute('aria-hidden', 'true')
    el.appendChild(canvas)
    let pass: FullscreenPass
    try {
      pass = new FullscreenPass(canvas, buildMercuryShader({ logo: false }))
    } catch {
      canvas.remove()
      return
    }
    pass.scale = window.matchMedia('(pointer: coarse)').matches ? 0.5 : 0.7
    const bd = pass.createTexture()

    const FLOOR = -0.5
    let chars = 0
    let R = 0.13, Rv = 0
    let time = 0
    let last = performance.now()
    let raf = 0
    let disposed = false
    const beads: { x: number; y: number; z: number; vy: number; r: number; on: boolean; merged: boolean }[] = Array.from({ length: 5 }, () => ({ x: 0, y: 0, z: 0, vy: 0, r: 0, on: false, merged: false }))
    const buf = new Float32Array(MAX_BLOBS * 4)
    const ident = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    const cam = new Float32Array(9)
    const cp = [0, 0.28, 2.5]
    {
      // lookAt (0,-0.12,0)
      let bx = cp[0], by = cp[1] + 0.12, bz = cp[2]
      const l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l
      let rx = bz, rz = -bx
      const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl
      const ux = by * rz, uy = bz * rx - bx * rz, uz = -by * rx
      cam.set([rx, 0, rz, ux, uy, uz, bx, by, bz])
    }

    const targetR = () => 0.13 + 0.27 * (1 - Math.exp(-chars / 140))

    const frame = (now: number) => {
      raf = 0
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const paused = getEffectsPaused()
      if (!paused) time += dt
      const tR = targetR()
      if (paused) { R = tR; Rv = 0 }
      else {
        Rv += ((tR - R) * 90 - Rv * 7) * dt
        R += Rv * dt
      }
      let n = 0
      const base = FLOOR + R * 0.7
      const wob = paused ? 0 : Math.sin(time * 2.1) * 0.006
      const push = (x: number, y: number, z: number, r: number) => {
        if (n >= MAX_BLOBS || r < 0.002) return
        buf.set([x, y, z, r], n * 4)
        n++
      }
      // a sessile drop: a soft dome over a ring of beads that spreads it into a puddle
      push(0, base + wob, 0, R * 0.92)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        const sp = R * (0.62 + 0.04 * Math.sin(time * 1.3 + i * 2.1))
        push(Math.cos(a) * sp, FLOOR + R * 0.34, Math.sin(a) * sp * 0.8, R * 0.46)
      }
      for (const b of beads) {
        if (!b.on) continue
        if (!paused) {
          b.vy -= 3.2 * dt
          b.y += b.vy * dt
          const top = base + R
          if (!b.merged && b.y - b.r < top - 0.02) b.merged = true
          if (b.merged) {
            b.r -= dt * 0.25
            b.y += ((base) - b.y) * Math.min(1, dt * 6)
          }
          if (b.r <= 0) b.on = false
        }
        push(b.x, b.y, b.z, Math.max(0, b.r))
      }

      pass.resize()
      pass.use()
      pass.set2f('uRes', pass.width, pass.height)
      pass.set1f('uTime', time)
      pass.set1f('uMode', 0)
      pass.set3f('uCamPos', cp[0], cp[1], cp[2])
      pass.setMat3('uCamRot', cam)
      pass.set1f('uFocal', 1 / Math.tan((30 * Math.PI) / 360))
      pass.set3f('uLogoPos', 0, 0, 0)
      pass.setMat3('uLogoRotT', ident)
      pass.set1f('uLogoScale', 1)
      pass.set4fv('uBlobs', buf)
      pass.set1i('uBlobN', n)
      pass.set1i('uRippleN', 0)
      pass.set1f('uBlendK', 0.14)
      pass.set4f('uBound', 0, -0.05, 0, 1.25)
      pass.set1i('uSteps', 72)
      pass.setTex('uBackdrop', 0, bd)
      pass.set4f('uDoc', 1, 1, 0, 1)
      pass.set2f('uLogoScreen', 0, 0)
      pass.set1f('uFloorY', FLOOR)
      pass.set1f('uFloorAmt', 1)
      pass.set1f('uFade', 1)
      pass.set1f('uFrost', 0)
      pass.set1f('uEnvSpin', Math.sin(time * 0.25) * 0.6)
      pass.draw()
      // the pool breathes continuously while motion is on; frozen frames otherwise
      if (!disposed && !document.hidden && !paused) raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!raf && !disposed) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    api.current = {
      type: (c) => {
        const grew = c > chars
        chars = c
        if (grew && !getEffectsPaused()) {
          const b = beads.find((q) => !q.on)
          if (b) Object.assign(b, { x: (Math.random() - 0.5) * 0.3, y: 0.95, z: (Math.random() - 0.5) * 0.1, vy: -0.4, r: 0.035 + Math.random() * 0.03, on: true, merged: false })
        }
        kick()
      },
      burst: () => {
        Rv += 1.4
        kick()
      },
    }
    const ro = new ResizeObserver(kick)
    ro.observe(el)
    const unsub = subscribePause(kick)
    document.addEventListener('visibilitychange', kick)
    kick()
    return () => {
      disposed = true
      api.current = null
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsub()
      document.removeEventListener('visibilitychange', kick)
      pass.dispose()
      canvas.remove()
    }
  }, [api])

  return <div ref={host} className="merc-droplet" aria-hidden="true" />
}
