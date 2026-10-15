import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useVTNavigate } from '../lib/vt'

type VTLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; children: ReactNode }

/** An <a> that navigates through useVTNavigate (modifier-clicks keep native behaviour). */
export default function VTLink({ to, children, onClick, ...rest }: VTLinkProps) {
  const go = useVTNavigate()
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const el = e.currentTarget
    go(to, el.querySelector<HTMLElement>('[data-vt-source]') ?? el)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
