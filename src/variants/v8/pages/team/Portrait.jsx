// A member's photo in the one frame (ui.frame, 3:4), lazy, with the initial letter while it loads
// and if it fails. `duo`: the wall's rest treatment (grey with a breath of teal, "print on the
// floor"); the photo comes up to full colour when an ancestor marked [data-lights] is hovered,
// focused or [data-lit] (shared.module.css). Children are drawn on the frame (a role plate).
import { useState } from "react";
import ui from "../../ui.module.css";
import sh from "./shared.module.css";

export default function Portrait({ member, duo = false, eager = false, className = "", children }) {
  const [state, setState] = useState(member.photo ? "loading" : "failed");
  return (
    <span className={`${ui.frame} ${sh.portrait} ${duo ? sh.duo : ""} ${className}`} data-state={state}>
      {state !== "loaded" && (
        <span className={`${ui.initial} ${sh.initial}`} aria-hidden="true">
          {member.name.charAt(0)}
        </span>
      )}
      {state !== "failed" && (
        <img
          src={member.photo}
          alt=""
          width="300"
          height="400"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
      <span className={sh.tint} aria-hidden="true" />
      {children}
    </span>
  );
}
