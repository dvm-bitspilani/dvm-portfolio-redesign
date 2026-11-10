// The hero's projector without WebGL: the same stage drawn as one SVG, projected through the
// stage's own camera (home/stageLayout.ts), so it stands exactly where the WebGL stage would and
// the mark (or its static print) still hangs in its beam. Shown by the hero's GLBoundary while a
// fresh canvas is being tried and, for good, only after repeated failures.
// Everything the WebGL stage has (chrome/holo/Projector.tsx), flattened: the original's radar
// floor (rings, the tick ring, crosshair axes, a sweeping arc, the pool of light) and bright halo
// around the base; the pedestal (three graphite discs with bright chamfers, the glowing neck
// seams, the vents and status LEDs, the lens in its well under a glass rim, and the tick ring
// hovering around the top disc); the original's lens face (rings, graduation, readout arc) and
// its flared cone with a brighter core and drifting dust. The cone breathes slowly; reduced
// motion holds everything still. `--stage-lift` (set on the hero by home/Hero.jsx) dims the
// cone and the lit parts as the mark flies off.
import * as THREE from 'three'
import { useId, useMemo } from 'react'
import { PEDESTAL, STAGE_LAYOUT, deckY, stageCamera } from '../../home/stageLayout'
import s from './stageFallback.module.css'

type Pt = readonly [number, number]

const TAU = Math.PI * 2
/** Table rings (world radius) and their stroke opacity, as in the table shader. */
const RINGS: readonly (readonly [number, number])[] = [
  [1.05, 0.62],
  [1.6, 0.4],
  [2.6, 0.26],
  [4.0, 0.16],
]
const HALO_R = 0.705
const DUST = 40

const fmt = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`
const line = (pts: Pt[], close = false) => `M${pts.map(fmt).join('L')}${close ? 'Z' : ''}`
/** Deterministic 0..1 noise (the dust must not jump between renders). */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export interface StageFallbackProps {
  /** The hero box (css px) and its layout (home/Hero.jsx useStageLayout). */
  W: number
  H: number
  narrow: boolean
  className?: string
}

export default function StageFallback({ W, H, narrow, className }: StageFallbackProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (n: string) => `v8sf-${uid}-${n}`
  const g = useMemo(() => {
    const L = STAGE_LAYOUT
    const { discs, necks, lensY: LENS_Y, lensR: LENS_R, ring, footH, chamferH } = PEDESTAL
    const cam = stageCamera(narrow, W / Math.max(1, H))
    const v = new THREE.Vector3()
    const P = (x: number, y: number, z: number): Pt => {
      v.set(x, y, z).project(cam)
      return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]
    }
    /** A horizontal circle (or an arc of it: angles from a0 to a1, 0 = +x, π/2 = toward the camera). */
    const arc = (r: number, y: number, a0 = 0, a1 = TAU, n = 96) => {
      const pts: Pt[] = []
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n
        pts.push(P(Math.cos(a) * r, y, Math.sin(a) * r))
      }
      return pts
    }
    /** Centre and radii of a horizontal circle's projection (for the squashed gradients). */
    const oval = (r: number, y: number) => {
      const c = P(0, y, 0)
      const l = P(-r, y, 0)
      const rr = P(r, y, 0)
      const f = P(0, y, r)
      const b = P(0, y, -r)
      return { cx: c[0], cy: (f[1] + b[1]) / 2, rx: Math.max(1, (rr[0] - l[0]) / 2), ry: Math.max(1, (f[1] - b[1]) / 2) }
    }
    /** Radial strokes on a horizontal circle (n of them, from r0 to r1; every `major`-th to r1m). */
    const spokes = (n: number, y: number, r0: number, r1: number, major = 0, r1m = r1) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU
        const e = major && i % major === 0 ? r1m : r1
        return `M${fmt(P(Math.cos(a) * r0, y, Math.sin(a) * r0))}L${fmt(P(Math.cos(a) * e, y, Math.sin(a) * e))}`
      }).join('')

    const rings = RINGS.map(([r, o]) => ({ d: line(arc(r, 0), true), o }))
    const ticks = spokes(48, 0, 1.6, 1.78)
    const axes = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
      .map(([x, z]) => `M${fmt(P(x * 1.7, 0, z * 1.7))}L${fmt(P(x * 6, 0, z * 6))}`)
      .join('')

    // the pedestal, bottom disc first (each one in front of the deck below it): per disc its
    // front side band, its top (deck), the bright chamfer and a panel seam; the necks' glowing
    // seams between them
    const tiers = discs.map((d) => {
      const top = deckY(d)
      const side = line([...arc(d.r, d.y0, 0, Math.PI, 48), ...arc(d.rTop, top - chamferH, Math.PI, 0, 48)], true)
      return {
        side,
        deck: line(arc(d.rTop - d.chamfer, top), true),
        chamfer: line(arc(d.rTop - d.chamfer * 0.5, top - chamferH * 0.5, 0, Math.PI, 64)),
        seam: line(arc(d.rTop + 0.003, d.y0 + footH + d.sideH * 0.62, 0, Math.PI, 64)),
      }
    })
    const seams = necks.map((n) => line(arc(n.r + 0.001, (n.y0 + n.y1) / 2, 0, Math.PI, 64)))
    // vents on the middle disc, LEDs on the plinth deck
    const mid = discs[1]
    const ventY = mid.y0 + footH + mid.sideH * 0.42
    const vents = [0.6, -0.6]
      .flatMap((c) =>
        Array.from({ length: 7 }, (_, i) => {
          const a = c + (i - 3) * 0.036
          const x = Math.sin(a) * (mid.rTop + 0.001)
          const z = Math.cos(a) * (mid.rTop + 0.001)
          return `M${fmt(P(x, ventY - 0.02, z))}L${fmt(P(x, ventY + 0.02, z))}`
        }),
      )
      .join('')
    const leds = [0.5, 0.58].map((a) => P(Math.sin(a) * 0.6, deckY(discs[0]) + 0.002, Math.cos(a) * 0.6))
    const haloFront = line(arc(HALO_R, 0, 0, Math.PI, 64))
    const haloBack = line(arc(HALO_R, 0, Math.PI, TAU, 64))

    // the lens in its well, with the original's face: rings, graduation (72), readout arc
    const topDisc = discs[2]
    const well = line(arc(topDisc.rDeckIn, deckY(topDisc)), true)
    const lens = oval(LENS_R, LENS_Y)
    const lensDisc = line(arc(LENS_R, LENS_Y), true)
    const lensRim = line(arc(LENS_R - 0.002, LENS_Y + 0.002), true)
    const lensRings = [0.32, 0.55, 0.93].map((k) => line(arc(LENS_R * k, LENS_Y), true))
    const lensTicks = spokes(72, LENS_Y, LENS_R * 0.68, LENS_R * 0.78)
    const lensSweep = line(arc(LENS_R * 0.85, LENS_Y), true)

    // the tick ring hovering around the top disc: two rims, fine ticks (every 12th long)
    const tickRims = [ring.inner + (ring.outer - ring.inner) * 0.04, ring.outer - (ring.outer - ring.inner) * 0.04].map((r) => line(arc(r, ring.y), true))
    const span = ring.outer - ring.inner
    const ringTicks = spokes(96, ring.y, ring.inner + span * 0.38, ring.inner + span * 0.82, 8, ring.inner + span * 0.82)

    // the cone: shell and core, from the lens to the top (silhouette at the widest points)
    const { baseY, height, baseR, topR } = L.cone
    const topY = baseY + height
    const shell = line([P(-baseR, baseY, 0), P(-topR, topY, 0), P(topR, topY, 0), P(baseR, baseY, 0)], true)
    const coreTop = baseY + height * 0.92
    const core = line([P(-baseR * 0.6, baseY, 0), P(-topR * 0.55, coreTop, 0), P(topR * 0.55, coreTop, 0), P(baseR * 0.6, baseY, 0)], true)
    const coneBase = P(0, baseY, 0)
    const coneTop = P(0, topY, 0)

    // dust: motes inside the cone, each with its own drift and twinkle
    const dust = Array.from({ length: DUST }, (_, i) => {
      const y = baseY + 0.15 + rand(i) * height * 0.8
      const t = (y - baseY) / height
      const r = (baseR + (topR - baseR) * t) * 0.85 * Math.sqrt(rand(i + 50))
      const a = rand(i + 100) * TAU
      const p = P(Math.cos(a) * r, y, Math.sin(a) * r)
      return { x: p[0], y: p[1], r: 0.7 + rand(i + 150) * 1.1, delay: -rand(i + 200) * 9, dur: 7 + rand(i + 250) * 6 }
    })

    return {
      pool: oval(2.4, 0),
      rings,
      ticks,
      axes,
      sweep: line(arc(2.6, 0), true),
      tiers,
      seams,
      vents,
      leds,
      haloFront,
      haloBack,
      well,
      lens,
      lensDisc,
      lensRim,
      lensRings,
      lensTicks,
      lensSweep,
      tickRims,
      ringTicks,
      shell,
      core,
      coneBase,
      coneTop,
      dust,
    }
  }, [W, H, narrow])

  const squash = (o: { cx: number; cy: number; rx: number; ry: number }) =>
    `translate(${o.cx} ${o.cy}) scale(1 ${(o.ry / o.rx).toFixed(4)}) translate(${-o.cx} ${-o.cy})`

  return (
    <svg
      className={`${s.root} ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={id('pool')} gradientUnits="userSpaceOnUse" cx={g.pool.cx} cy={g.pool.cy} r={g.pool.rx} gradientTransform={squash(g.pool)}>
          <stop offset="0" stopColor="#45e6ff" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#45e6ff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#45e6ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('lens')} gradientUnits="userSpaceOnUse" cx={g.lens.cx} cy={g.lens.cy} r={g.lens.rx} gradientTransform={squash(g.lens)}>
          <stop offset="0" stopColor="#e6fdff" stopOpacity="1" />
          <stop offset="0.12" stopColor="#45e6ff" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#45e6ff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#45e6ff" stopOpacity="0.06" />
        </radialGradient>
        <linearGradient id={id('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f6870" />
          <stop offset="0.5" stopColor="#2b3238" />
          <stop offset="1" stopColor="#14181b" />
        </linearGradient>
        <linearGradient id={id('top')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262d32" />
          <stop offset="1" stopColor="#11161a" />
        </linearGradient>
        <linearGradient id={id('cone')} gradientUnits="userSpaceOnUse" x1="0" y1={g.coneBase[1]} x2="0" y2={g.coneTop[1]}>
          <stop offset="0" stopColor="#45e6ff" stopOpacity="0" />
          <stop offset="0.04" stopColor="#45e6ff" stopOpacity="0.26" />
          <stop offset="0.45" stopColor="#45e6ff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#45e6ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('core')} gradientUnits="userSpaceOnUse" x1="0" y1={g.coneBase[1]} x2="0" y2={g.coneTop[1]}>
          <stop offset="0" stopColor="#bff6ff" stopOpacity="0" />
          <stop offset="0.04" stopColor="#bff6ff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#45e6ff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#45e6ff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('glow')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={id('soft')} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* the radar floor */}
      <g className={s.floor}>
        <ellipse cx={g.pool.cx} cy={g.pool.cy} rx={g.pool.rx} ry={g.pool.ry} fill={`url(#${id('pool')})`} />
        {g.rings.map((r) => (
          <path key={r.d.length + r.o} d={r.d} fill="none" stroke="#45e6ff" strokeOpacity={r.o} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={g.ticks} fill="none" stroke="#45e6ff" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={g.axes} fill="none" stroke="#45e6ff" strokeOpacity="0.14" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path className={s.sweep} d={g.sweep} pathLength={100} fill="none" stroke="#45e6ff" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </g>

      {/* the pedestal */}
      <path d={g.haloBack} fill="none" stroke="#7ff0ff" strokeOpacity="0.45" strokeWidth="1.2" filter={`url(#${id('glow')})`} />
      {g.tiers.map((t, i) => (
        <g key={i}>
          <path d={t.side} fill={`url(#${id('body')})`} />
          <path d={t.seam} fill="none" stroke="#020304" strokeOpacity="0.9" strokeWidth="1" />
          <path d={t.deck} fill={`url(#${id('top')})`} />
          <path d={t.chamfer} fill="none" stroke="#c3ccd2" strokeOpacity="0.6" strokeWidth="1.4" />
          {i < g.seams.length && <path className={s.lit} d={g.seams[i]} fill="none" stroke="#7ff0ff" strokeWidth="1.3" filter={`url(#${id('glow')})`} />}
          {i === 0 &&
            g.leds.map((p, k) => <circle key={k} className={s.lit} cx={p[0]} cy={p[1]} r="1.4" fill={k === 0 ? '#7ff0ff' : '#e6f6f8'} />)}
          {i === 1 && <path d={g.vents} fill="none" stroke="#08353d" strokeWidth="1.2" />}
        </g>
      ))}
      <path className={s.lit} d={g.haloFront} fill="none" stroke="#7ff0ff" strokeWidth="1.8" filter={`url(#${id('glow')})`} />

      {/* the lens in its well, and the tick ring around the top disc */}
      <path d={g.well} fill="#0d1215" />
      <g className={s.lit}>
        <path d={g.lensDisc} fill={`url(#${id('lens')})`} />
        {g.lensRings.map((d, i) => (
          <path key={d.length + i} d={d} fill="none" stroke="#45e6ff" strokeOpacity={[0.85, 0.55, 0.8][i]} strokeWidth="1" />
        ))}
        <path d={g.lensTicks} fill="none" stroke="#45e6ff" strokeOpacity="0.5" strokeWidth="0.8" />
        <path className={s.lensSweep} d={g.lensSweep} pathLength={100} fill="none" stroke="#bff6ff" strokeOpacity="0.8" strokeWidth="1.4" />
        <path d={g.lensRim} fill="none" stroke="#bff6ff" strokeWidth="1.2" filter={`url(#${id('glow')})`} />
        {g.tickRims.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#45e6ff" strokeOpacity={i ? 0.75 : 0.55} strokeWidth="1" />
        ))}
        <path d={g.ringTicks} fill="none" stroke="#45e6ff" strokeOpacity="0.5" strokeWidth="0.8" />
      </g>

      {/* the cone and its dust */}
      <g className={s.beam}>
        <g className={s.breathe}>
          <path d={g.shell} fill={`url(#${id('cone')})`} filter={`url(#${id('soft')})`} />
          <path d={g.core} fill={`url(#${id('core')})`} filter={`url(#${id('soft')})`} />
        </g>
        {g.dust.map((d, i) => (
          <circle
            key={i}
            className={s.mote}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="#9ff4ff"
            style={{ animationDelay: `${d.delay.toFixed(2)}s`, animationDuration: `${d.dur.toFixed(2)}s` }}
          />
        ))}
      </g>
    </svg>
  )
}
