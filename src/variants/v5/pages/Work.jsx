// Reel 3: Work. Every project newest first, a year marker between years; filter chips
// in the title card (?kind=films|sites|apps).
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Reel } from "../reel/Reel";
import { ProjectFrame } from "../frames/pieces";
import { Chips, NextReel, TitleCard, YearCard } from "../frames/ends";
import { projectsByDate } from "../lib/data";
import { P } from "../lib/paths";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "films", label: "Films", test: (p) => p.kind === "video" },
  { id: "sites", label: "Websites", test: (p) => p.kind === "website" },
  { id: "apps", label: "Apps and portals", test: (p) => p.kind === "app" || p.kind === "portal" },
];

export default function Work() {
  const [params] = useSearchParams();
  const active = FILTERS.find((x) => x.id === params.get("kind")) || FILTERS[0];
  const list = useMemo(() => projectsByDate.filter(active.test), [active]);
  const groups = useMemo(() => {
    const out = [];
    list.forEach((p) => {
      const y = p.year ?? "Undated";
      let g = out[out.length - 1];
      if (!g || g.year !== y) out.push((g = { year: y, items: [] }));
      g.items.push(p);
    });
    return out;
  }, [list]);
  const chips = FILTERS.map((x) => ({
    id: x.id,
    label: x.label,
    count: projectsByDate.filter(x.test).length,
    to: x.id === "all" ? P("/projects") : `${P("/projects")}?kind=${x.id}`,
  }));
  return (
    <Reel label="Work" key={active.id}>
      <TitleCard n={3} title="Work" line="Every website, app, portal and film we have shipped. Rest on a film to preview it.">
        <Chips items={chips} active={active.id} label="Filter the work" />
      </TitleCard>
      {groups.map((g) => [
        <YearCard key={`y${g.year}`} year={g.year} count={g.items.length} />,
        ...g.items.map((p) => <ProjectFrame key={p.slug} project={p} />),
      ])}
      <NextReel n={4} />
    </Reel>
  );
}
