import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react'
import { drawLogo } from '../../../shared/logo'
import { CENTRE, MARK, type WallModel } from '../model'
import type { FrameInfo, WallEngine } from '../engine/WallEngine'

export interface MinimapHandle {
  draw(f: FrameInfo): void
}

const CW = 216
const TONE: Record<string, string> = {
  work: '#3e5768',
  films: '#2f4656',
  art: '#7891a1',
  journal: '#9fb6c4',
  team: '#24323d',
}

interface Props {
  engine: RefObject<WallEngine | null>
  model: WallModel
  filter: string
  accent: string
  ink: string
}

const Minimap = forwardRef<MinimapHandle, Props>(function Minimap({ engine, model, filter, accent, ink }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const last = useRef<FrameInfo | null>(null)
  const P = model.period
  const CH = Math.round((CW * P.h) / P.w)
  const S = CW / P.w
  const props = useRef({ filter, accent, ink })
  props.current = { filter, accent, ink }

  const draw = (f: FrameInfo | null) => {
    const c = canvasRef.current
    const e = engine.current
    if (!c || !e) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const { filter: fl, accent: ac, ink: ik } = props.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (c.width !== Math.round(CW * dpr) || c.height !== Math.round(CH * dpr)) {
      c.width = Math.round(CW * dpr)
      c.height = Math.round(CH * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, CW, CH)
    ctx.fillStyle = 'rgba(5,8,14,0.9)'
    ctx.fillRect(0, 0, CW, CH)
    const r = e.rects
    const dims = e.dims
    const match = model.layout(fl).match
    for (let i = 0; i < model.count; i++) {
      const w = r[i * 4 + 2], h = r[i * 4 + 3]
      let x = r[i * 4] + w / 2, y = r[i * 4 + 1] + h / 2
      x -= P.w * Math.round(x / P.w)
      y -= P.h * Math.round(y / P.h)
      const it = model.items[i]
      ctx.globalAlpha = 1 - dims[i] * 0.72
      ctx.fillStyle = it.kind === 'contact' ? ac : match[i] && fl !== 'all' ? '#cfe8ff' : TONE[it.item.category] ?? '#4a5a66'
      ctx.fillRect((x - w / 2 + P.w / 2) * S + 0.4, (y - h / 2 + P.h / 2) * S + 0.4, Math.max(0.5, w * S - 0.8), Math.max(0.5, h * S - 0.8))
    }
    ctx.globalAlpha = 1
    drawLogo(ctx, (MARK.cx + P.w / 2) * S, (MARK.cy + P.h / 2) * S, MARK.h * S, ik)
    ctx.strokeStyle = 'rgba(207,232,255,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect((CENTRE.x + P.w / 2) * S + 0.5, (CENTRE.y + P.h / 2) * S + 0.5, CENTRE.w * S - 1, CENTRE.h * S - 1)

    // Viewport (wraps around the torus).
    const fi = f ?? last.current
    if (fi) {
      const vp = e.viewport
      const vw = vp.w / e.z, vh = vp.h / e.z
      let cx = fi.x, cy = -fi.y
      cx -= P.w * Math.round(cx / P.w)
      cy -= P.h * Math.round(cy / P.h)
      ctx.strokeStyle = ac
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 1
      if (vw >= P.w && vh >= P.h) {
        ctx.strokeRect(1, 1, CW - 2, CH - 2)
      } else {
        for (const ox of [-P.w, 0, P.w])
          for (const oy of [-P.h, 0, P.h]) {
            const x = (cx - vw / 2 + ox + P.w / 2) * S
            const y = (cy - vh / 2 + oy + P.h / 2) * S
            ctx.globalAlpha = 0.14
            ctx.fillStyle = ac
            ctx.fillRect(x, y, vw * S, vh * S)
            ctx.globalAlpha = 1
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
  }, [filter, accent, model])

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.type === 'pointermove' && e.buttons !== 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const wx = ((e.clientX - rect.left) / rect.width) * P.w - P.w / 2
    const wy = ((e.clientY - rect.top) / rect.height) * P.h - P.h / 2
    engine.current?.flyToWorld(wx, wy, e.type === 'pointermove' ? 120 : 700)
  }

  return (
    <div className="imm-archive-mini">
      <canvas
        ref={canvasRef}
        style={{ width: CW, height: CH }}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        role="img"
        aria-label="Minimap of one full repeat of the wall. Click to travel."
      />
      <span className="imm-archive-mini__legend">
        One repeat: {P.w} by {P.h} cells
      </span>
    </div>
  )
})

export default Minimap
