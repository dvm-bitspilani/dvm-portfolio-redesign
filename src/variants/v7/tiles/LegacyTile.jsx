// Projects per year as a sparkline. Expands into Our Legacy.
import Head from "./Head";
import LegacyPage from "../pages/LegacyPage";
import { years } from "../lib/data";
import t from "./tiles.module.css";

const W = 300;
const H = 100;
const max = Math.max(...years.map((y) => y.count));
const pts = years.map((y, i) => [(i / (years.length - 1)) * W, H - 8 - (y.count / max) * (H - 22)]);
const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
const area = `${line} L${W} ${H} L0 ${H} Z`;
const peak = years.reduce((a, b) => (b.count > a.count ? b : a));
const peakI = years.indexOf(peak);

export default function LegacyTile({ role, label }) {
  if (role === "primary") return <LegacyPage />;
  return (
    <>
      <Head id="legacy" label={label} led="idle">
        {years[0].year}–{years[years.length - 1].year}
      </Head>
      <div className={t.legacy} data-role={role}>
        <div className={t.sparkBox} aria-hidden="true">
          <svg className={t.spark} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="v7-spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(69,230,255,.32)" />
                <stop offset="1" stopColor="rgba(69,230,255,0)" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#v7-spark)" />
            <path className={t.sparkLine} d={line} pathLength="1" />
          </svg>
          {pts.map(([x, y], i) => (
            <span key={years[i].year} className={i === peakI ? t.sparkPeak : t.sparkDot} style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }} />
          ))}
        </div>
        <p className={t.legacyNote}>
          <b>{peak.count}</b> projects in {peak.year}, the busiest year on record
        </p>
        <span className={t.srOnly}>
          Projects per year: {years.map((y) => `${y.year}: ${y.count}`).join(", ")}
        </span>
      </div>
    </>
  );
}
