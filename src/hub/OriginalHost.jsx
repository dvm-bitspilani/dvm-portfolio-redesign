import { useContext } from "react";
import {
  Router,
  useLocation,
  useNavigationType,
  Navigate,
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
} from "react-router-dom";
import App from "../App";

export const ORIGINAL_BASE = "/original";

const ROOT_ROUTE = { outlet: null, matches: [], isDataRoute: false };

/**
 * Mounts the original redesign, unmodified, under /original.
 *
 * The original App owns absolute routes ("/", "/blog", "/projects/:name") and absolute links
 * ("/", "/#about", navigate("/projects/…")). Instead of rewriting them, it gets its own
 * react-router <Router basename="/original"> driven by the app's real location and history:
 * the inner router sees "/blog" while the address bar says "/original/blog", and every Link /
 * navigate() inside it is prefixed with /original. Contexts from the outer router are reset so
 * the nested Router and the App's absolute <Route path="/"> are valid.
 */
export default function OriginalHost() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { navigator } = useContext(NavigationContext);
  return (
    <LocationContext.Provider value={null}>
      <RouteContext.Provider value={ROOT_ROUTE}>
        <Router
          basename={ORIGINAL_BASE}
          location={location}
          navigationType={navigationType}
          navigator={navigator}
        >
          <App />
        </Router>
      </RouteContext.Provider>
    </LocationContext.Provider>
  );
}

/** Old root-level URLs of the original (/team, /projects/x, …) → their /original/… home. */
export function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${ORIGINAL_BASE}${pathname}${search}${hash}`} replace />;
}
