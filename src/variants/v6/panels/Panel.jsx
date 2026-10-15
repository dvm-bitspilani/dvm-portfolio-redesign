// The detail panel: right-hand glass column on desktop, the page body on phones.
import { Link, useLocation } from "react-router-dom";
import { routeFor } from "../graph/model";
import { P } from "../lib/paths";
import { useShell } from "../lib/hooks";
import s from "./panel.module.css";

export default function Panel({ kicker, title, children, titleClass }) {
  const { closeTarget } = useShell();
  const loc = useLocation();
  return (
    <aside className={s.panel} aria-labelledby="v6-panel-title">
      <div className={s.scroll}>
        <div className={s.inner} key={loc.pathname + loc.search}>
          <div className={s.head}>
            <span className={s.kicker}>{kicker}</span>
            {closeTarget && (
              <Link to={closeTarget} className={s.close} aria-label="Close and step back (Esc)">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                </svg>
              </Link>
            )}
          </div>
          <h1 id="v6-panel-title" className={`${s.title} ${typeof title === "string" && title.length > 34 ? s.titleLong : ""} ${titleClass || ""}`}>
            {title}
          </h1>
          {children}
        </div>
      </div>
    </aside>
  );
}

/** Where a node link goes from the current route (legacy keeps the spiral). */
export function useNodeHref() {
  const { state } = useShell();
  return (node) => {
    if (state.route === "legacy" && node.kind !== "hub" && node.kind !== "core") return P(`/legacy?n=${encodeURIComponent(node.id)}`);
    return P(routeFor(node));
  };
}

/** A link to a node that lights its neighbourhood in the graph while hovered or focused. */
export function NodeLink({ node, children, className, to, ...rest }) {
  const { preview } = useShell();
  const href = useNodeHref();
  if (!node) return <span className={className}>{children}</span>;
  const on = () => preview(node.id);
  const off = () => preview(null);
  return (
    <Link
      to={to || href(node)}
      className={className}
      onPointerEnter={on}
      onPointerLeave={off}
      onFocus={on}
      onBlur={off}
      onClick={off}
      {...rest}
    >
      {children ?? node.label}
    </Link>
  );
}

export function Section({ title, children, count }) {
  return (
    <section className={s.section}>
      <h2 className={s.h2}>
        {title}
        {count != null && <span className={s.count}>{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export const panelStyles = s;
