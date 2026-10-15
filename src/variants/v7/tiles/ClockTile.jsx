// Pilani local time (IST) and the countdown to the next fest (dates are estimates; see lib/data.js).
import Head from "./Head";
import { useNow } from "../lib/hooks";
import { istParts, nextFest, splitDuration } from "../lib/data";
import t from "./tiles.module.css";

const p2 = (n) => String(n).padStart(2, "0");

export default function ClockTile({ role, label }) {
  const now = useNow(1000);
  const { hh, mm, ss, date, hourFrac } = istParts(now);
  const f = nextFest(now);
  const d = splitDuration(f.start - now);
  const day = Math.floor((now - f.start) / 86400e3) + 1;
  return (
    <>
      <Head id="clock" label={label} led="live">
        UTC+5:30
      </Head>
      <div className={t.clock} data-role={role}>
        <p className={t.time} aria-label={`${hh}:${mm} IST`}>
          <span>{hh}</span>
          <i>:</i>
          <span>{mm}</span>
          <i className={t.secColon}>:</i>
          <span className={t.sec}>{ss}</span>
        </p>
        <p className={t.date}>{date}, Pilani</p>
        <div className={t.count}>
          <span className={t.led} data-led="tally" aria-hidden="true" />
          {f.live ? (
            <p>
              <b>{f.id}</b> is live, day {day} of {f.days}
            </p>
          ) : (
            <p>
              <b>{f.id}</b> <span className={t.countIn}>in </span>
              <span className={t.countNum}>
                {d.d}d {p2(d.h)}h<span className={t.countMin}> {p2(d.m)}m</span>
              </span>{" "}
              <small title="Fest dates are estimated from recent editions">est.</small>
            </p>
          )}
        </div>
        <div className={t.bar} role="img" aria-label={`${Math.round(f.progress * 100)}% of the way from the last fest to ${f.id}`}>
          <span style={{ transform: `scaleX(${f.progress})` }} />
        </div>
        <div className={t.dayline} aria-hidden="true">
          <span style={{ left: `${hourFrac * 100}%` }} />
        </div>
      </div>
    </>
  );
}
