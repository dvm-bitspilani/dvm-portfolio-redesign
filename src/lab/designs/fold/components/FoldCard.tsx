import { Link } from 'react-router-dom'
import type { Project } from '../../../data'
import { designBase } from '../../registry'
import Mark from './Mark'

const KIND: Record<string, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }
const PANELS = 4

/**
 * A project as an accordion-folded print. At rest the cover image is pleated
 * into four panels; hover or focus unfolds it flat.
 */
export default function FoldCard({ project, tall = false }: { project: Project; tall?: boolean }) {
  const img = project.cover ?? project.mockup
  const panel = (i: number) => (
    <div className={`fc__p fc__p--${i % 2 ? 'odd' : 'even'}`}>
      <div className="fc__face">
        <div className="fc__slice" style={{ left: `${-i * 100}%` }}>
          {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <Mark className="fc__blank" />}
        </div>
      </div>
      {i < PANELS - 1 && panel(i + 1)}
    </div>
  )
  return (
    <Link to={`${designBase('fold')}/work/${project.slug}`} className={`fc${tall ? ' fc--tall' : ''}`}>
      <div className="fc__frame">
        <div className="fc__sheet">{panel(0)}</div>
      </div>
      <div className="fc__text">
        <h3 className="fc__title">{project.title}</h3>
        <p className="fc__meta">
          {KIND[project.kind]}, {project.fest}
          {project.year ? `, ${project.year}` : ''}
        </p>
      </div>
    </Link>
  )
}
