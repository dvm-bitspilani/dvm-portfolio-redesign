// /alumni page: the small pieces the branch, the sheet and the people share: the 3:4 photo with its
// initial fallback, the Intern tag (the page's only status mark: full-time is the unmarked default)
// and the sheet's person row (a company's people on touch screens and phones).
import { useState } from "react";
import ui from "../../ui.module.css";
import { personName, roleText } from "./format";
import s from "./legacyPage.module.css";

/** 3:4 photo in the site's frame; the initial when there is no photo or it fails. */
export function Photo({ person, width = 32, className = "" }) {
  const [failed, setFailed] = useState(!person.photo);
  return (
    <span className={`${ui.frame} ${s.photo} ${className}`} style={{ width }}>
      {failed ? (
        <span className={`${ui.initial} ${s.photoInitial}`}>{person.name[0]}</span>
      ) : (
        <img src={person.photo} alt="" width={width} height={Math.round((width * 4) / 3)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/** "Intern", as a word. */
export function Tag() {
  return <span className={s.tag}>Intern</span>;
}

/**
 * One person in the sheet: the whole row is a button that shows them in People (`onFind`).
 * Photo, name, batch · team, the role there and the Intern tag after it.
 * @param {{ row: import("../alumniData").CompanyPerson, i?: number, onFind: (slug: string) => void }} props
 */
export function PersonRow({ row, i = 0, onFind }) {
  const p = row.person;
  const intern = row.kind === "intern";
  const role = [roleText(row.role, row.kind), row.unit].filter(Boolean).join(" · ");
  const name = personName(p.name);
  return (
    <li className={s.person} style={{ "--i": Math.min(i, 12) }}>
      <button type="button" className={s.personBtn} onClick={() => onFind(p.slug)} aria-label={`${name}, ${p.batch} ${p.team}${intern ? ", intern" : ""}. Show in People`}>
        <Photo person={p} />
        <span className={s.who}>
          <span className={`${ui.strong} ${s.personName}`}>{name}</span>
          <span className={`${ui.meta} ${s.oneLine}`}>
            {p.batch} · {p.team}
          </span>
          {(role || intern) && (
            <span className={`${ui.small} ${s.role}`}>
              {role && <span className={s.roleText}>{role}</span>}
              {intern && <Tag />}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
