import { useContext, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import '@fontsource-variable/manrope'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './archive.css'
import Shell, { RouteContext, type DetailKind } from './Shell'
import type { Filter } from './engine/layout'
import { designBase } from '../registry'

/** Each route is a state of the same wall; the Shell (and its WebGL canvas) never unmounts. */
function Sync({ filter, detail }: { filter: Filter; detail?: DetailKind }) {
  const sync = useContext(RouteContext)
  const { slug } = useParams()
  const loc = useLocation()
  const tile = (loc.state as { tile?: string } | null)?.tile
  useEffect(() => {
    sync({ filter, detail, slug, tile, key: loc.key })
  }, [sync, filter, detail, slug, tile, loc.key])
  return null
}

export default function ArchiveDesign() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Sync filter="all" />} />
        <Route path="work" element={<Sync filter="work" />} />
        <Route path="work/:slug" element={<Sync filter="work" detail="project" />} />
        <Route path="team" element={<Sync filter="team" />} />
        <Route path="team/:slug" element={<Sync filter="team" detail="member" />} />
        <Route path="journal" element={<Sync filter="journal" />} />
        <Route path="journal/:slug" element={<Sync filter="journal" detail="journal" />} />
        <Route path="about" element={<Sync filter="all" detail="about" />} />
        <Route path="contact" element={<Sync filter="contact" detail="contact" />} />
        <Route path="*" element={<Navigate to={designBase('archive')} replace />} />
      </Route>
    </Routes>
  )
}
