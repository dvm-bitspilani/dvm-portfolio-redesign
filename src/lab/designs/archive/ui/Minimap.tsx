import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react'
import { drawLogo } from '../../../shared/logo'
import { CENTRE, CONTACT_INDEX, ITEMS, LAYOUTS, PERIOD, type Filter } from '../engine/layout'
import type { FrameInfo, WallEngine } from '../engine/WallEngine'
import { MARK } from '../engine/textures'

export interface MinimapHandle {
  draw(f: FrameInfo): void
}

const CW = 216
const CH = Math.round((CW * PERIOD.h) / PERIOD.w)
const S = CW / PERIOD.w
const TONE: Record<string, string> = {
  work: '#7d828d',
  team: '#565a63',
  journal: '#a3a8b2',
  contact: '#4d7cff',
}

const Minimap = forwardRef<MinimapHandle, { engine: RefObject<WallEngine | null>; filter: Filter }>(function Minimap({ engine, filter }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const last = useRef<FrameInfo | null>(null)
  const filterRef = useRef(filter)
  filterRef.current = filter

  const draw = (f: FrameInfo | null) => {
    const c = canvasRef.current
    const e = engine.current
    if (!c || !e) return
    const ctx = c.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (c.width !== CW * dpr) {
      c.width = CW * dpr
      c.height = CH * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, CW, CH)
    ctx.fillStyle = '#121316'
    ctx.fillRect(0, 0, CW, CH)
    const r = e.rects
    const dims = e.dims
    const match = LAYOUTS[filterRef.current].match
    for (let i = 0; i < ITEMS.length; i++) {
      const w = r[i * 4 + 2], h = r[i * 4 + 3]
      let x = r[i * 4] + w / 2, y = r[i * 4 + 1] + h / 2
      x -= PERIOD.w * Math.round(x / PERIOD.w)
      y -= PERIOD.h * Math.round(y / PERIOD.h)
      const it = ITEMS[i]
      ctx.globalAlpha = 1 - dims[i] * 0.72
      ctx.fillStyle = i === CONTACT_INDEX ? TONE.contact : match[i] && filterRef.current !== 'all' ? '#c9ccd3' : TONE[it.group]
      ctx.fillRect((x - w / 2 + PERIOD.w / 2) * S + 0.4, (y - h / 2 + PERIOD.h / 2) * S + 0.4, w * S - 0.8, h * S - 0.8)
    }
    ctx.globalAlpha = 1
    // mark
    drawLogo(ctx, (MARK.cx + PERIOD.w / 2) * S, (MARK.cy + PERIOD.h / 2) * S, MARK.h * S, '#eef0f4')
    ctx.strokeStyle = 'rgba(233,234,238,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect((CENTRE.x + PERIOD.w / 2) * S + 0.5, (CENTRE.y + PERIOD.h / 2) * S + 0.5, CENTRE.w * S - 1, CENTRE.h * S - 1)

    // viewport (wraps around the torus)
    const fi = f ?? last.current
    if (fi) {
      const vp = e.viewport
      const zoomPx = e.z
      const vw = vp.w / zoomPx, vh = vp.h / zoomPx
      let cx = fi.x, cy = -fi.y
      cx -= PERIOD.w * Math.round(cx / PERIOD.w)
      cy -= PERIOD.h * Math.round(cy / PERIOD.h)
      ctx.strokeStyle = '#4d7cff'
      ctx.lineWidth = 1.5
      ctx.fillStyle = 'rgba(77,124,255,0.12)'
      if (vw >= PERIOD.w && vh >= PERIOD.h) {
        ctx.strokeRect(1, 1, CW - 2, CH - 2)
      } else {
        for (const ox of [-PERIOD.w, 0, PERIOD.w])
          for (const oy of [-PERIOD.h, 0, PERIOD.h]) {
            const x = (cx - vw / 2 + ox + PERIOD.w / 2) * S
            const y = (cy - vh / 2 + oy + PERIOD.h / 2) * S
            ctx.fillRect(x, y, vw * S, vh * S)
            ctx.strokeRect(x, y, vw * S, vh * S)
          }
      }
    }
  }

  useImperativeHandle(ref, () => ({
    draw(f) {
      last.current = f
      draw(f)
    },
  }))

  useEffect(() => {
    draw(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.type === 'pointermove' && e.buttons !== 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const wx = ((e.clientX - rect.left) / rect.width) * PERIOD.w - PERIOD.w / 2
    const wy = ((e.clientY - rect.top) / rect.height) * PERIOD.h - PERIOD.h / 2
    engine.current?.flyToWorld(wx, wy, e.type === 'pointermove' ? 120 : 700)
  }

  return (
    <div className="ar-mini">
      <canvas
        ref={canvasRef}
        style={{ width: CW, height: CH }}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        role="img"
        aria-label="Minimap of one full repeat of the wall. Click to travel."
      />
      <span className="ar-mini__legend">
        One repeat: {PERIOD.w} by {PERIOD.h} cells
      </span>
    </div>
  )
})

export default Minimap
