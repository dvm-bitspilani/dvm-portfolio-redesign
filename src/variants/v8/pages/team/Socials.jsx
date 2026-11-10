// A member's social links as brand glyphs (the user's choice: icons, always). Every glyph sits in
// the same round box, so the cursor locks onto each alike; its accessible name is the network and
// the handle. Under the row, the handle of the glyph under the pointer / focus in mono (the first
// one at rest), so the data reads without a wrapping word list.
import { useState } from "react";
import SocialIcon from "../../chrome/SocialIcon";
import { linksOf } from "./data";
import sh from "./shared.module.css";

export default function Socials({ member, size = 18, handle = true, className = "" }) {
  const links = linksOf(member);
  const [cur, setCur] = useState(0);
  if (!links.length) return <p className={`${sh.noLinks} ${className}`}>No links on record</p>;
  const shown = links[Math.min(cur, links.length - 1)];
  return (
    <div className={`${sh.socials} ${className}`}>
      <ul className={sh.icons} aria-label={`${member.name}, elsewhere`}>
        {links.map((x, i) => (
          <li key={x.key}>
            <a
              href={x.url}
              target="_blank"
              rel="noreferrer"
              className={sh.icon}
              aria-label={`${x.label}: ${x.handle}`}
              data-cursor="lock"
              data-on={i === cur ? "" : undefined}
              onPointerEnter={() => setCur(i)}
              onFocus={() => setCur(i)}
            >
              <SocialIcon name={x.key} size={size} />
            </a>
          </li>
        ))}
      </ul>
      {handle && (
        <p className={sh.handle} aria-hidden="true">
          <span className={sh.handleNet}>{shown.label}</span> {shown.handle}
        </p>
      )}
    </div>
  );
}
