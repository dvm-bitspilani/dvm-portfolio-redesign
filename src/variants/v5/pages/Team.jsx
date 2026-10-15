// Reel 5: Team. One contact sheet per batch, newest first; crew filter in the title card.
import { useSearchParams } from "react-router-dom";
import { Frame, Reel } from "../reel/Reel";
import { Chips, NextReel, TitleCard } from "../frames/ends";
import { VERTICAL_LABEL, batches, team, verticals } from "../lib/data";
import { P } from "../lib/paths";
import i from "./inner.module.css";

const SOCIAL_LABEL = { github: "GitHub", linkedin: "LinkedIn", instagram: "Instagram", twitter: "X", dribbble: "Dribbble", behance: "Behance", facebook: "Facebook" };

export default function Team() {
  const [params] = useSearchParams();
  const crew = verticals.some((v) => v.id === params.get("crew")) ? params.get("crew") : "all";
  const chips = [{ id: "all", label: "All", count: team.length, to: P("/team") }].concat(
    verticals.map((v) => ({ id: v.id, label: v.label, count: team.filter((m) => m.vertical === v.id).length, to: `${P("/team")}?crew=${v.id}` })),
  );
  const people = crew === "all" ? team : team.filter((m) => m.vertical === crew);
  return (
    <Reel label="Team" key={crew}>
      <TitleCard n={5} title="Team" line={`${team.length} members on record since 2017, batch by batch.`}>
        <Chips items={chips} active={crew} label="Filter by crew" />
      </TitleCard>
      {batches.map((b) => {
        const list = people.filter((m) => m.batch === b).sort((x, y) => Number(!!y.designation) - Number(!!x.designation) || x.name.localeCompare(y.name));
        if (!list.length) return null;
        return (
          <Frame key={b} id={`batch-${b}`} chapter={`Batch ${b}`} label={`Batch of ${b}`} w="auto" edge={`BATCH ${b}`}>
            <div className={i.sheet}>
              <div className={i.sheetHead}>
                <h2 className={i.sheetYear}>{b}</h2>
                <p className={i.mono}>{list.length} joined</p>
              </div>
              <ul className={i.sheetGrid}>
                {list.map((m) => (
                  <li key={m.slug} className={i.member}>
                    <img src={m.photo} alt="" loading="lazy" draggable={false} className={i.memberPhoto} />
                    <div className={i.memberText}>
                      <p className={i.memberName}>{m.name}</p>
                      <p className={i.memberRole}>{m.designation || VERTICAL_LABEL[m.vertical]}</p>
                      <p className={i.memberLinks}>
                        {Object.entries(m.socials)
                          .filter(([, url]) => url)
                          .slice(0, 3)
                          .map(([k, url]) => (
                            <a key={k} href={url} target="_blank" rel="noreferrer" aria-label={`${m.name} on ${SOCIAL_LABEL[k] || k}`}>
                              {SOCIAL_LABEL[k] || k}
                            </a>
                          ))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Frame>
        );
      })}
      <NextReel n={6} />
    </Reel>
  );
}
