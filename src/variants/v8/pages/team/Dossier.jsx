// The detail panel every version shares (research/v8-team-page.md §5.5, the Figma's person
// pop-out): a HUD line (pinned / preview, the member's number), the portrait in the projector
// (two layers that crossfade, a teal re-scan line sweeping down on each change, corner brackets
// when pinned), the name, role(s) and tenure, team and batch, socials as glyphs with the handle,
// and others from the same batch (each pins). Never blank: with no one shown it is the department
// card, or the team's card when the page is lit for one team.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { P } from "../../lib/paths";
import ui from "../../ui.module.css";
import { INDEX, STATS, TEAMS, TEAM_LABEL, batchMates, isAlum, rolesOf, teamCard } from "./data";
import Portrait from "./Portrait";
import Socials from "./Socials";
import sh from "./shared.module.css";

const pad = (n) => String(n).padStart(3, "0");

/** The portrait: two stacked images so a change crossfades (instant under reduced motion). */
function Projector({ member, pinned, reduced }) {
  const seq = useRef(0);
  const [layers, setLayers] = useState(() => [{ id: ++seq.current, m: member, ready: true, failed: !member.photo }]);

  useEffect(() => {
    setLayers((ls) => {
      if (ls.at(-1)?.m.slug === member.slug) return ls;
      const under = ls.filter((l) => l.ready).slice(-1);
      return [...under, { id: ++seq.current, m: member, ready: !member.photo, failed: !member.photo }];
    });
  }, [member]);

  const settle = useCallback((id) => setLayers((ls) => ls.slice(Math.max(0, ls.findIndex((l) => l.id === id)))), []);
  const onReady = (id, failed = false) => {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ready: true, failed: l.failed || failed } : l)));
    if (reduced) settle(id);
  };

  return (
    <div className={`${ui.frame} ${sh.projector}`} data-pinned={pinned ? "" : undefined} data-dossier-frame="">
      {layers.map((l) =>
        l.failed ? (
          <span
            key={l.id}
            className={`${sh.layer} ${l.ready ? sh.isReady : ""}`}
            onTransitionEnd={(e) => e.target === e.currentTarget && settle(l.id)}
            aria-hidden="true"
          >
            <span className={ui.initial}>{l.m.name.charAt(0)}</span>
          </span>
        ) : (
          <img
            key={l.id}
            className={`${sh.layer} ${l.ready ? sh.isReady : ""}`}
            src={l.m.photo}
            alt={l === layers.at(-1) ? `Portrait of ${l.m.name}` : ""}
            decoding="async"
            onLoad={() => onReady(l.id)}
            onError={() => onReady(l.id, true)}
            onTransitionEnd={(e) => e.propertyName === "opacity" && settle(l.id)}
          />
        ),
      )}
      <span className={sh.scan} aria-hidden="true" />
      {!reduced && <span key={member.slug} className={sh.sweep} aria-hidden="true" />}
      <span className={sh.brackets} aria-hidden="true" />
    </div>
  );
}

function Person({ member: m, pinned, reduced, onPin, headingId, Heading }) {
  const roles = rolesOf(m.designation);
  const mates = batchMates(m, 8);
  return (
    <>
      <Projector member={m} pinned={pinned} reduced={reduced} />
      <div className={sh.dText}>
        <Heading id={headingId} className={sh.dName}>
          {m.name}
        </Heading>
        {roles.length > 0 && (
          <ul className={sh.dRoles}>
            {roles.map((r) => (
              <li key={r.role + r.tenure}>
                <span className={sh.dRole}>{r.role}</span>
                {r.tenure && <span className={sh.dTenure}>{r.tenure}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className={sh.dMeta}>
          <span>{TEAM_LABEL[m.vertical]}</span>
          <span aria-hidden="true">·</span>
          <span>Batch of {m.batch}</span>
        </p>
        <Socials key={m.slug} member={m} className={sh.dSocials} />
      </div>
      {mates.length > 0 && (
        <div className={sh.mates}>
          <p className={sh.matesHead}>
            <span>Same batch · {m.batch}</span>
            {isAlum(m) && (
              <Link to={P("/alumni")} className={sh.matesLink}>
                Where they went →
              </Link>
            )}
          </p>
          <ul className={sh.matesList}>
            {mates.map((x) => (
              <li key={x.slug}>
                <button type="button" className={sh.mate} data-lights="" aria-label={`${x.name}, ${TEAM_LABEL[x.vertical]}`} title={x.name} onClick={() => onPin(x.slug)}>
                  <Portrait member={x} duo />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Idle({ team, onTeam, hint, headingId, Heading }) {
  const card = team ? teamCard(team) : null;
  if (card)
    return (
      <>
        <div className={`${ui.frame} ${sh.still}`}>
          <img src={card.still.src} alt={card.still.alt} decoding="async" />
          <span className={sh.scan} aria-hidden="true" />
        </div>
        <div className={sh.dText}>
          <Heading id={headingId} className={sh.dName}>
            {card.name}
          </Heading>
          <p className={sh.dMeta}>
            <span>{card.members} people</span>
            <span aria-hidden="true">·</span>
            <span>{card.projects} projects</span>
          </p>
          <p className={sh.dBlurb}>{card.description}</p>
          {hint && <p className={sh.dHint}>{hint}</p>}
          <button type="button" className={ui.link} onClick={() => onTeam(null)}>
            Light everyone →
          </button>
        </div>
      </>
    );
  return (
    <div className={sh.dText}>
      <Heading id={headingId} className={sh.dName}>
        Department of Visual Media
      </Heading>
      <dl className={sh.dStats}>
        <div>
          <dt>people</dt>
          <dd>{STATS.people}</dd>
        </div>
        <div>
          <dt>batches</dt>
          <dd>{STATS.batches}</dd>
        </div>
        <div>
          <dt>teams</dt>
          <dd>{STATS.teams}</dd>
        </div>
        <div>
          <dt>held a post</dt>
          <dd>{STATS.roles}</dd>
        </div>
      </dl>
      {hint && <p className={sh.dHint}>{hint}</p>}
      <ul className={sh.dTeams} aria-label="Light one team">
        {TEAMS.map((t) => (
          <li key={t.id}>
            <button type="button" className={ui.link} onClick={() => onTeam(t.id)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{ member: object | null, pinned: boolean, team: string | null, onPin: (slug: string) => void,
 *   onClose: () => void, onTeam: (id: string | null) => void, reduced: boolean, hint: string,
 *   headingId?: string, level?: "h2" | "p", className?: string }} props
 */
export default function Dossier({ member, pinned, team, onPin, onClose, onTeam, reduced, hint, headingId, level = "p", className = "" }) {
  const Heading = level;
  return (
    <div className={`${sh.dossier} ${className}`} data-state={member ? (pinned ? "pinned" : "preview") : "idle"}>
      <div className={sh.hud}>
        <span className={sh.hudState}>{member ? (pinned ? "Pinned" : "Preview") : team ? "Team" : "Dossier"}</span>
        <span className={sh.hudNum}>{member ? `${pad(INDEX.get(member.slug))} / ${STATS.people}` : `${STATS.first}–${STATS.last}`}</span>
        {pinned && (
          <button type="button" className={sh.hudClose} onClick={onClose} aria-label={`Unpin ${member.name}`} data-cursor="lock">
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {member ? (
        <Person member={member} pinned={pinned} reduced={reduced} onPin={onPin} headingId={headingId} Heading={Heading} />
      ) : (
        <Idle team={team} onTeam={onTeam} hint={hint} headingId={headingId} Heading={Heading} />
      )}
    </div>
  );
}
