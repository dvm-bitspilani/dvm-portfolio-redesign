// `?debug=stage` only (lib/stageDebug.ts): a small fixed readout of the hero stage's state in
// the bottom-right corner, refreshed four times a second, so the state can be read (and
// reported) from any browser. Rendered into <body>, above the menu and the mark. The mark's
// own fields (driven, lift) are read straight from its runtime; changes of `driven` are logged
// like the other transitions.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MarkRuntime } from './runtime'
import { stageDebug } from '../../lib/stageDebug'

const f2 = (v: number) => v.toFixed(2)

function readout(rt: MarkRuntime) {
  const d = stageDebug
  const lines = [
    'v8 stage · ?debug=stage',
    `phase     ${d.phase}`,
    `revealed  ${d.revealed}   active ${d.active}`,
    `driven    ${rt.driven}   lift ${f2(rt.signal.lift)}`,
    `fallback  ${d.fallback ? (d.final ? 'YES (final)' : 'yes (retrying)') : 'no'}   attempt ${d.attempt}`,
    `ctx lost  ${d.contextLost}`,
    `canvas    ${d.canvasW}×${d.canvasH} px  (css ${d.cssW}×${d.cssH})`,
    `frames    ${d.frames}`,
  ]
  if (d.error) lines.push(`error     ${d.error}`)
  if (d.degraded.length) lines.push(`degraded  ${d.degraded.join('; ')}`)
  return lines.join('\n')
}

export default function StageDebug({ rt }: { rt: MarkRuntime }) {
  const [text, setText] = useState(() => readout(rt))
  useEffect(() => {
    console.info('[v8 stage] debug readout on (?debug=stage)')
    let driven = rt.driven
    console.info(`[v8 stage] driven: ${driven}`)
    const id = window.setInterval(() => {
      if (rt.driven !== driven) {
        console.info(`[v8 stage] driven: ${driven} → ${rt.driven}`)
        driven = rt.driven
      }
      setText(readout(rt))
    }, 250)
    return () => window.clearInterval(id)
  }, [rt])
  return createPortal(
    <pre
      aria-hidden="true"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 2147483000,
        margin: 0,
        padding: '8px 10px',
        maxWidth: 'calc(100vw - 16px)',
        whiteSpace: 'pre-wrap',
        font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#bff6ff',
        background: 'rgba(0, 0, 0, 0.78)',
        border: '1px solid rgba(69, 230, 255, 0.35)',
        borderRadius: 4,
        pointerEvents: 'none',
      }}
    >
      {text}
    </pre>,
    document.body,
  )
}
