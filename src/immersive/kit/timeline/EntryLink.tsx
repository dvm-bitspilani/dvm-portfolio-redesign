import { Link, useInRouterContext } from 'react-router-dom'
import { isExternal } from './data'
import type { FoldTimelineEntry, FoldTimelineProps, FoldTimelineStop } from './types'

/** A timeline entry as a link (router Link for internal paths), or a button when it has no href. */
export default function EntryLink({
  entry,
  stop,
  onSelect,
  className,
}: {
  entry: FoldTimelineEntry
  stop: FoldTimelineStop
  onSelect?: FoldTimelineProps['onSelect']
  className?: string
}) {
  const inRouter = useInRouterContext()
  const click = (e: React.MouseEvent) => onSelect?.(entry, stop, e)
  if (!entry.href) {
    return (
      <button type="button" className={className} onClick={click}>
        {entry.label}
      </button>
    )
  }
  if (isExternal(entry)) {
    return (
      <a className={className} href={entry.href} target="_blank" rel="noreferrer" onClick={click}>
        {entry.label}
      </a>
    )
  }
  if (inRouter && entry.href.startsWith('/')) {
    return (
      <Link className={className} to={entry.href} onClick={click}>
        {entry.label}
      </Link>
    )
  }
  return (
    <a className={className} href={entry.href} onClick={click}>
      {entry.label}
    </a>
  )
}
