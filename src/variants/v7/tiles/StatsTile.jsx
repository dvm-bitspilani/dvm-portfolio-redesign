// The numbers, counted up once. Every few seconds one counter takes a "refresh" spark.
import { useEffect, useState } from "react";
import Head from "./Head";
import { STATS } from "../lib/data";
import { useCountUp } from "./useCountUp";
import t from "./tiles.module.css";

function Counter({ stat, i, spark }) {
  const v = useCountUp(stat.value, { delay: 300 + i * 140 });
  return (
    <li className={t.stat} data-spark={spark ? "" : undefined}>
      <span className={t.statNum}>
        {v.toLocaleString("en-IN")}
        {stat.suffix}
      </span>
      <span className={t.statLabel}>{stat.label}</span>
      <span className={t.statShort} aria-hidden="true">
        {stat.short}
      </span>
    </li>
  );
}

export default function StatsTile({ role, label }) {
  const [spark, setSpark] = useState(-1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setSpark(i++ % STATS.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <Head id="stats" label={label} led="idle">
        bits-dvm.org
      </Head>
      <ul className={t.stats} data-role={role}>
        {STATS.map((st, i) => (
          <Counter key={st.id} stat={st} i={i} spark={spark === i} />
        ))}
      </ul>
    </>
  );
}
