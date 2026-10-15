// The three fests in calendar order from now; the next one carries the tally light.
import { Link } from "react-router-dom";
import Head from "./Head";
import { useNow } from "../lib/hooks";
import { festWindows, festProjectCount } from "../lib/data";
import { P } from "../lib/paths";
import t from "./tiles.module.css";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function FestsTile({ role, view, label }) {
  const now = useNow(60000);
  const list = festWindows(now);
  const linkable = view.key === "about"; // on the board the whole tile is one link
  return (
    <>
      <Head id="fests" label={label} led="idle">
        BOSM, Oasis, APOGEE
      </Head>
      <ol className={t.fests} data-role={role}>
        {list.map((f, i) => {
          const days = Math.ceil((f.start - now) / 86400e3);
          const status = f.live ? "Live now" : i === 0 ? `In ${days} days` : `${MONTH[f.month - 1]}, est.`;
          const inner = (
            <>
              <span className={t.festName}>{f.id}</span>
              <span className={t.festKind}>{f.kind}</span>
              <span className={t.festCount}>{festProjectCount(f.id)} projects</span>
              <span className={t.festStatus}>
                {i === 0 && <span className={t.led} data-led={f.live ? "live" : "tally"} aria-hidden="true" />}
                {status}
              </span>
            </>
          );
          return (
            <li key={f.id} className={t.fest} data-next={i === 0 ? "" : undefined}>
              {linkable ? (
                <Link className={t.festLink} to={`${P("/projects")}?fest=${f.id}`} aria-label={`${f.id}: ${f.kind.toLowerCase()} fest, ${status}. See its projects`}>
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
