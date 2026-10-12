// Timeline glue: the kit's internal hrefs point at the original site; keep them inside the variant.
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildArchiveStops, redesignProjectHref } from "../../../immersive/kit/timeline";
import { P } from "./paths";

export { buildMilestoneStops } from "../../../immersive/kit/timeline";

export function useScopedSelect() {
  const navigate = useNavigate();
  return useCallback(
    (entry, _stop, event) => {
      const href = entry.href;
      if (href && href.startsWith("/") && !href.startsWith("/v/")) {
        event?.preventDefault?.();
        navigate(P(href));
      }
    },
    [navigate],
  );
}

export const scopedArchiveStops = () =>
  buildArchiveStops({
    projectHref: (p) => {
      const h = redesignProjectHref(p);
      return h && h.startsWith("/") ? P(h) : h;
    },
  });
