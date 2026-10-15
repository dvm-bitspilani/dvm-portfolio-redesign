import type { ReactNode } from 'react'

/** A paper flap that unfolds downward from its crease (native <details>). */
export default function Fold({ title, meta, children, index = 0 }: { title: string; meta?: string; children: ReactNode; index?: number }) {
  return (
    <details className="fold-flap" style={{ ['--i' as string]: index }}>
      <summary>
        <span className="fold-flap__title">{title}</span>
        {meta && <span className="fold-flap__meta">{meta}</span>}
        <span className="fold-flap__corner" aria-hidden />
      </summary>
      <div className="fold-flap__body">{children}</div>
    </details>
  )
}
