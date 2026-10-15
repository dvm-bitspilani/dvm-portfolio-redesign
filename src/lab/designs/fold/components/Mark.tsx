import { LOGO_PATHS, LOGO_TRANSFORM } from '../../../shared/logo'

/** The DVM mark as inline SVG, cropped tight. */
export default function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      className={className}
      viewBox="62.69 23.8 250.53 326.78"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}
