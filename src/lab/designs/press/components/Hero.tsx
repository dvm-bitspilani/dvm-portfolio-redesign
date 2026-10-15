import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { site } from '../../../data'
import { EngravedMark, STROKE_COUNT } from './Mark'
import Ticker from './Ticker'
import { isReduced } from '../lib/hooks'

interface Row {
  text: string
  of?: boolean
  aside?: 'lead' | 'fig'
}
const WIDE: Row[] = [{ text: 'DEPARTMENT' }, { text: 'VISUAL', of: true, aside: 'lead' }, { text: 'MEDIA', aside: 'fig' }]
// portrait screens: break the long word so the type can stay big
const NARROW: Row[] = [{ text: 'DEPART' }, { text: 'MENT' }, { text: 'VISUAL', of: true }, { text: 'MEDIA' }]
const NARROW_MQ = '(max-width: 700px)'
const FONT = '"Bricolage Grotesque Variable"'

// axis ranges of Bricolage Grotesque (standard file): wght 200–800, wdth 75–100
const W0 = 200,
  W1 = 800,
  D0 = 75,
  D1 = 100
const MID = `"wght" 500, "wdth" 88, "opsz" 96`
const fvs = (w: number, d: number) => `"wght" ${w}, "wdth" ${d}, "opsz" 96`

/** Melt buckets → displacement scale as a fraction of the font size. */
const MELT = [0, 0.12, 0.28, 0.55]
/** Vertical ramp used to weight the melt (black = hold, white = run). */
const RAMP =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="64" preserveAspectRatio="none"><linearGradient id="g" x2="0" y2="1"><stop offset=".28" stop-color="#000"/><stop offset=".62" stop-color="#fff"/></linearGradient><rect width="8" height="64" fill="url(#g)"/></svg>`,
  )

interface LetterEls {
  box: HTMLSpanElement
  ink: HTMLSpanElement
  red: HTMLSpanElement
  ch: string
}

export default function Hero() {
  const hero = useRef<HTMLElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLDivElement>(null)
  const turb = useRef<(SVGFETurbulenceElement | null)[]>([])
  const disp = useRef<(SVGFEDisplacementMapElement | null)[]>([])
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW_MQ).matches)
  const ROWS = narrow ? NARROW : WIDE

  useEffect(() => {
    const mq = matchMedia(NARROW_MQ)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    const root = hero.current!
    const typeArea = area.current!
    const boxes = Array.from(root.querySelectorAll<HTMLSpanElement>('.pr-l'))
    const L: LetterEls[] = boxes.map((box) => ({
      box,
      ink: box.querySelector<HTMLSpanElement>('.pr-g-w')!,
      red: box.querySelector<HTMLSpanElement>('.pr-g-r')!,
      ch: box.dataset.ch!,
    }))
    const N = L.length
    const reduced = isReduced()
    const v = new Float32Array(N).fill(1)
    const vv = new Float32Array(N)
    const r = new Float32Array(N).fill(1)
    const rv = new Float32Array(N)
    const lastW = new Float32Array(N).fill(-1)
    const lastR = new Float32Array(N).fill(-1)
    const bucket = new Int8Array(N).fill(-1)
    const want = new Int8Array(N)
    const heat = new Float32Array(N)
    const order = Array.from({ length: N }, (_, i) => i)
    const cx = new Float32Array(N)
    const cy = new Float32Array(N)
    const release = new Float32Array(N)
    let S = 100
    let widths: Record<string, number> = {}
    let capH = 0.7
    let capTop = 0.2
    let raf = 0
    let alive = true
    let ready = false
    let inView = true

    // pointer state (client coords)
    let px = -1e4,
      py = -1e4,
      lastMove = -1e9,
      hasPointer = false,
      speed = 0,
      prevX = 0,
      prevY = 0,
      ghostW = 1,
      t0 = 0

    const measure = () => {
      const probe = document.createElement('span')
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${FONT};font-size:100px;line-height:1;font-variation-settings:${MID}`
      root.appendChild(probe)
      widths = {}
      for (const ch of new Set(ROWS.map((r) => r.text).join(''))) {
        probe.textContent = ch
        widths[ch] = probe.getBoundingClientRect().width
      }
      root.removeChild(probe)
      // vertical metrics so the caps sit exactly inside each box
      const c = document.createElement('canvas').getContext('2d')!
      c.font = `200 100px ${FONT}`
      const m = c.measureText('H')
      const asc = m.fontBoundingBoxAscent / 100 || 0.95
      const desc = m.fontBoundingBoxDescent / 100 || 0.25
      capH = m.actualBoundingBoxAscent / 100 || 0.7
      const baseline = (1 - (asc + desc)) / 2 + asc
      capTop = baseline - capH
    }

    const layout = () => {
      const availW = typeArea.clientWidth
      const availH = typeArea.clientHeight
      const rowW = (row: Row) => [...row.text].reduce((s, ch) => s + widths[ch], 0) + (row.of ? 30 : 0)
      const w1 = Math.max(...ROWS.map(rowW)) * 1.04
      const gap = 0.09
      const sW = (availW / w1) * 100
      const sH = availH / (ROWS.length * (capH + gap))
      S = Math.max(40, Math.min(sW, sH))
      root.style.setProperty('--S', `${S}px`)
      root.style.setProperty('--capH', String(capH))
      root.style.setProperty('--capTop', String(capTop))
      for (const l of L) l.box.style.width = `${(widths[l.ch] * S * 1.04) / 100}px`
      // centres in page coordinates, read after the writes above have laid out
      requestAnimationFrame(() => {
        const sx = scrollX,
          sy = scrollY
        L.forEach((l, i) => {
          const b = l.box.getBoundingClientRect()
          cx[i] = b.left + b.width / 2 + sx
          cy[i] = b.top + b.height / 2 + sy
        })
      })
    }

    const write = (i: number, now: number) => {
      const a = v[i]
      const w = Math.round(W0 + (W1 - W0) * a)
      const d = Math.round((D0 + (D1 - D0) * a) * 2) / 2
      const key = w * 1000 + d
      if (key !== lastW[i]) {
        lastW[i] = key
        L[i].ink.style.fontVariationSettings = fvs(w, d)
        L[i].ink.style.transform = `translateX(-50%) scaleY(${(1 + 0.06 * a).toFixed(3)})`
      }
      const b = r[i]
      const rw = Math.round(W0 + 110 + (W1 - W0) * b)
      const rd = Math.round((D0 + (D1 - D0) * b) * 2) / 2
      const ox = S * (0.004 + 0.016 * b)
      const oy = S * (0.003 + 0.006 * b * Math.sin(now * 0.002 + i))
      const rkey = rw * 1000 + rd + Math.round(ox) * 1e7 + Math.round(oy * 2) * 1e9
      if (rkey !== lastR[i]) {
        lastR[i] = rkey
        L[i].red.style.fontVariationSettings = fvs(Math.min(800, rw), rd)
        L[i].red.style.transform = `translate(calc(-50% + ${ox.toFixed(1)}px), ${oy.toFixed(1)}px) scaleY(${(1 + 0.06 * b).toFixed(3)})`
      }
    }

    const frame = (now: number) => {
      raf = 0
      if (!alive || !ready) return
      // ghost cursor ("attract mode") takes over when the real pointer rests
      const idle = !hasPointer || now - lastMove > 2600
      ghostW += ((idle ? 1 : 0) - ghostW) * (idle ? 0.015 : 0.2)
      const hb = typeArea.getBoundingClientRect()
      const t = (now - t0) * 0.001
      const gx = hb.left + hb.width * (0.5 + 0.42 * Math.sin(t * 0.37))
      const gy = hb.top + hb.height * (0.5 + 0.36 * Math.sin(t * 0.61 + 1.3))
      const fx = px * (1 - ghostW) + gx * ghostW
      const fy = py * (1 - ghostW) + gy * ghostW
      const dx = fx - prevX,
        dy = fy - prevY
      prevX = fx
      prevY = fy
      speed += (Math.min(1, Math.hypot(dx, dy) / (S * 0.18)) - speed) * 0.12
      const sx = scrollX,
        sy = scrollY
      const R = 0.85
      let best = -1,
        bestV = 0.25
      let melting = false
      for (let i = 0; i < N; i++) {
        const ddx = (fx + sx - cx[i]) / S
        const ddy = ((fy + sy - cy[i]) / S) * 1.35
        let target = Math.exp(-(ddx * ddx + ddy * ddy) / (R * R))
        if (now < release[i]) target = 1
        // ink: snappy spring; red overprint: lazier so it bleeds behind
        vv[i] = (vv[i] + (target - v[i]) * 0.11) * 0.74
        v[i] += vv[i]
        rv[i] = (rv[i] + (target - r[i]) * 0.05) * 0.8
        r[i] += rv[i]
        write(i, now)
        if (v[i] > bestV && now >= release[i]) {
          bestV = v[i]
          best = i
        }
        const m = v[i] * v[i] * (0.35 + speed * 1.1)
        want[i] = now < release[i] ? 0 : m > 0.8 ? 3 : m > 0.5 ? 2 : m > 0.22 ? 1 : 0
        heat[i] = m
      }
      // the SVG filter is the expensive part: only the three hottest letters run,
      // and only on the white plate (the red overprint stays crisp underneath)
      order.sort((a, b) => heat[b] - heat[a])
      for (let k = 0; k < N; k++) {
        const i = order[k]
        const b = k < 3 ? want[i] : 0
        if (b) melting = true
        if (b !== bucket[i]) {
          bucket[i] = b
          L[i].ink.style.filter = b ? `url(#press-melt-${b})` : ''
        }
      }
      if (melting) {
        for (let k = 1; k < 4; k++) {
          turb.current[k]?.setAttribute('baseFrequency', `${(0.03 + 0.006 * Math.sin(t * 1.3 + k)).toFixed(4)} ${(0.002 + 0.0008 * Math.sin(t * 0.9)).toFixed(4)}`)
          disp.current[k]?.setAttribute('scale', (S * MELT[k] * (0.75 + 0.5 * speed)).toFixed(1))
        }
      }
      const ro = readout.current
      if (ro) {
        if (best >= 0 && ghostW < 0.5) {
          const a = v[best]
          ro.style.opacity = '1'
          ro.style.transform = `translate3d(${px - hb.left + 18}px, ${py - hb.top + 18}px, 0)`
          ro.firstElementChild!.textContent = L[best].ch
          ro.lastElementChild!.textContent = `wght ${Math.round(W0 + (W1 - W0) * a)}\nwdth ${Math.round(D0 + (D1 - D0) * a)}`
        } else ro.style.opacity = '0'
      }
      if (inView && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (!raf && alive && ready && !reduced) raf = requestAnimationFrame(frame)
    }

    const staticPose = () => {
      // reduced motion: a frozen diagonal swell, no melt
      L.forEach((_, i) => {
        const a = 0.62 * Math.max(0, Math.sin((i / (N - 1)) * Math.PI * 1.5 + 0.4)) ** 2
        v[i] = r[i] = a
        write(i, 0)
      })
    }

    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      if (!hasPointer) {
        prevX = px
        prevY = py
      }
      hasPointer = true
      lastMove = performance.now()
    }
    const onLeaveWin = () => {
      lastMove = -1e9
    }

    let cancelled = false
    Promise.all([document.fonts.load(`200 100px ${FONT}`), document.fonts.load(`800 100px ${FONT}`)])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        measure()
        layout()
        ready = true
        root.dataset.ready = '1'
        t0 = performance.now()
        if (reduced) {
          staticPose()
          return
        }
        // press-stamp intro: every letter lands heavy, then cools to hairline in a wave
        L.forEach((_, i) => (release[i] = t0 + 500 + i * 55))
        start()
      })

    const ro = new ResizeObserver(() => {
      if (!ready) return
      layout()
    })
    ro.observe(typeArea)
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting
      if (inView) start()
    })
    io.observe(root)
    const onVis = () => !document.hidden && start()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeaveWin)
    return () => {
      alive = false
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeaveWin)
    }
    // ROWS only changes with `narrow`; the effect re-binds to the new letter spans
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow])

  const now = new Date()
  const dateline = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  let li = 0
  const letters = (row: string) =>
    [...row].map((ch, i) => (
      <span key={i} className="pr-l" data-ch={ch} style={{ '--li': li++ } as CSSProperties}>
        <span className="pr-g pr-g-r">{ch}</span>
        <span className="pr-g pr-g-w">{ch}</span>
      </span>
    ))

  return (
    <section ref={hero} className="pr-hero" aria-labelledby="pr-hero-h">
      <svg className="pr-defs" aria-hidden="true" width="0" height="0">
        <defs>
          {[1, 2, 3].map((k) => (
            <filter key={k} id={`press-melt-${k}`} x="-12%" y="-5%" width="124%" height="160%" colorInterpolationFilters="sRGB">
              <feTurbulence
                ref={(el) => {
                  turb.current[k] = el
                }}
                type="fractalNoise"
                baseFrequency="0.03 0.002"
                numOctaves={2}
                seed={k * 7}
                result="noise"
              />
              {/* opaque noise in G only */}
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" result="n" />
              {/* vertical ramp: the top of each letter holds, the bottom runs */}
              <feImage href={RAMP} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="ramp" />
              <feComposite in="n" in2="ramp" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="weighted" />
              {/* R = 0.5 (no sideways shift); G = 0.5 - weight → only ever samples from above, so ink drips down */}
              <feColorMatrix in="weighted" type="matrix" values="0 0 0 0 0.5  0 -1 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="pull" />
              <feDisplacementMap
                ref={(el) => {
                  disp.current[k] = el
                }}
                in="SourceGraphic"
                in2="pull"
                scale={10 * k}
                xChannelSelector="R"
                yChannelSelector="G"
                result="melt"
              />
              <feGaussianBlur in="melt" stdDeviation={0.8 + k * 0.6} result="soft" />
              <feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
            </filter>
          ))}
        </defs>
      </svg>

      <div className="pr-hero-dateline">
        <span>Vol. 2026 · BITS Pilani</span>
        <span className="pr-hero-date">{dateline}</span>
        <span>No. 06, the type issue</span>
      </div>
      <Ticker />

      <h1 id="pr-hero-h" className="pr-sr">
        Department of Visual Media
      </h1>
      <div ref={area} className="pr-hero-type">
        {ROWS.map((row, i) => (
          <div key={`${narrow}-${i}`} className="pr-row">
            {row.of && (
              <span className="pr-of" aria-hidden="true">
                of
              </span>
            )}
            <span className="pr-word" aria-hidden="true">
              {letters(row.text)}
            </span>
            {row.aside === 'lead' && <p className="pr-row-aside pr-lead">{site.about[0]}</p>}
            {row.aside === 'fig' && (
              <div className="pr-row-aside pr-hero-fig">
                <EngravedMark className="pr-hero-mark" delay={1500} />
                <p className="pr-cap">
                  <em>Fig. 1.</em> The mark, engraved in {STROKE_COUNT} strokes. Scroll down and the press takes it apart.
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={readout} className="pr-readout" aria-hidden="true">
          <span />
          <span />
        </div>
      </div>
      <p className="pr-hero-mlead">{site.about[0]}</p>
      <p className="pr-hero-hint">
        Set in Bricolage Grotesque, weight 200 to 800, width 75 to 100. Move across the type and it swells, holds still and it cools, push it fast and the ink runs.
      </p>
    </section>
  )
}
