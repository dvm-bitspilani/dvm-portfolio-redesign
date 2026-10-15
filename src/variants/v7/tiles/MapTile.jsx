// A schematic of the BITS Pilani campus (not to scale): the landmarks the fests use, with a
// slow radar sweep and pins on each fest's home ground. The next fest's pin carries the tally.
import Head from "./Head";
import { useNow } from "../lib/hooks";
import { nextFest } from "../lib/data";
import t from "./tiles.module.css";

const BLOCKS = [
  // [x, y, w, h, label, kind]
  [150, 128, 100, 40, "Main Building", "main"],
  [84, 132, 48, 32, "Auditorium", "b"],
  [270, 104, 46, 24, "FD I", "b"],
  [276, 138, 46, 24, "FD II", "b"],
  [270, 172, 46, 24, "FD III", "b"],
  [186, 206, 28, 28, "Saraswati Temple", "temple"],
  [312, 228, 54, 30, "Connaught Place", "b"],
];
const HOSTELS = [70, 106, 142, 178, 214, 250, 286, 322];
const PINS = {
  BOSM: { x: 92, y: 246, label: "BOSM, sports grounds" },
  Oasis: { x: 108, y: 148, label: "Oasis, the auditorium and lawns" },
  APOGEE: { x: 296, y: 150, label: "APOGEE, the faculty divisions" },
};

export default function MapTile({ role, label }) {
  const now = useNow(60000);
  const next = nextFest(now).id;
  return (
    <>
      <Head id="map" label={label} led="idle">
        28.36°N 75.59°E
      </Head>
      <div className={t.map} data-role={role}>
        <svg className={t.mapSvg} viewBox="0 0 400 300" role="img" aria-label="Schematic map of the BITS Pilani campus with the venues of BOSM, Oasis and APOGEE">
          <defs>
            <pattern id="v7-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(95,212,230,.22)" strokeWidth="1" />
            </pattern>
          </defs>
          <path className={t.mapEdge} d="M28 40 L372 34 L380 276 L24 282 Z" />
          {/* roads */}
          <path className={t.mapRoad} d="M200 292 L200 236 M200 206 L200 168 M50 190 L350 190 M50 96 L350 96 M50 96 L50 280 M350 96 L350 280 M250 148 L270 148" />
          {HOSTELS.map((x) => (
            <rect key={x} className={t.mapHostel} x={x} y={52} width={26} height={30} rx={2} />
          ))}
          <text className={t.mapLabel} x={200} y={46} textAnchor="middle">
            Hostels
          </text>
          <rect className={t.mapGround} x={56} y={214} width={84} height={58} rx={26} />
          <text className={t.mapLabel} x={98} y={209} textAnchor="middle">
            Grounds
          </text>
          {BLOCKS.map(([x, y, w, h, name, kind]) => (
            <g key={name}>
              <rect className={kind === "main" ? t.mapMain : kind === "temple" ? t.mapTemple : t.mapBlock} x={x} y={y} width={w} height={h} rx={kind === "temple" ? 0 : 2} />
              <text className={t.mapLabel} x={x + w / 2} y={kind === "temple" ? y + h + 11 : y - 4} textAnchor="middle">
                {name}
              </text>
            </g>
          ))}
          <rect className={t.mapTower} x={194} y={118} width={12} height={12} />
          {Object.entries(PINS).map(([id, p]) => (
            <g key={id} className={t.mapPin} data-next={id === next ? "" : undefined} transform={`translate(${p.x} ${p.y})`}>
              <title>{p.label}</title>
              <circle className={t.mapPing} r="9" />
              <circle r="3" />
              <text className={t.mapPinLabel} x="7" y="-6">
                {id}
              </text>
            </g>
          ))}
          <text className={t.mapGate} x={200} y={298} textAnchor="middle">
            Gate
          </text>
        </svg>
        <div className={t.radar} aria-hidden="true" />
        <ul className={t.mapLegend}>
          {Object.entries(PINS).map(([id, p]) => (
            <li key={id} data-next={id === next ? "" : undefined}>
              <b>{id}</b>
              <span>{p.label.split(", ")[1].replace(/^./, (c) => c.toUpperCase())}</span>
            </li>
          ))}
          <li>
            <b>Address</b>
            <span>BITS Pilani, Pilani, Rajasthan 333031</span>
          </li>
        </ul>
        <p className={t.mapNote}>Schematic, not to scale</p>
      </div>
    </>
  );
}
