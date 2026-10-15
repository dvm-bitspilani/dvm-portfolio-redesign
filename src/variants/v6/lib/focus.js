// Routes are focus states of the one graph. resolveFocus(location) → what the camera frames,
// which node is selected, which cluster stays lit, which layout the nodes take, and which
// panel the shell shows. The breadcrumb label comes from here too.
import { BASE } from "./paths";

const NONE = { people: 0, work: 0, spiral: 0 };

const ids = (graph, kinds) => graph.nodes.filter((n) => kinds.includes(n.kind)).map((n) => n.id);
const childrenOf = (graph, node) => graph.nodes.filter((n) => n.parent === node.i).map((n) => n.id);

function neighbourIds(graph, node, kinds) {
  const out = [];
  for (const k of graph.edgesOf[node.i]) {
    const e = graph.edges[k];
    const o = graph.nodes[e.a === node.i ? e.b : e.a];
    if (!kinds || kinds.includes(o.kind)) out.push(o.id);
  }
  return out;
}

/** How to frame one selected node so it reads with its context. */
function frameForNode(graph, node) {
  switch (node.kind) {
    case "fest":
    case "vertical":
      return { frame: [node.id, ...childrenOf(graph, node)], frameMin: 260 };
    case "hub":
      return { frame: [node.id, ...childrenOf(graph, node)], frameMin: 360 };
    case "project":
      return { frame: [node.id, graph.nodes[node.parent].id], frameMin: 300 };
    case "member":
      return { frame: [node.id, graph.nodes[node.parent].id], frameMin: 230 };
    case "blog":
    case "art":
      return { frame: [node.id, ...neighbourIds(graph, node, ["member", "hub"])], frameMin: 260 };
    case "year":
      return { frame: [node.id, ...graph.nodes.filter((n) => n.year === node.year && n.kind !== "year").map((n) => n.id)], frameMin: 240 };
    default:
      return { frame: [node.id], frameMin: 420 };
  }
}

export function resolveFocus(pathname, search, graph) {
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length).replace(/\/$/, "") || "/" : "/";
  const parts = rel.split("/").filter(Boolean);
  const params = new URLSearchParams(search);
  const nParam = params.get("n");
  let route = parts[0] || "home";
  const known = ["home", "about", "projects", "legacy", "team", "blog", "artwork", "archive", "contactus"];
  if (!known.includes(route)) route = "home";

  let selected = nParam && graph.byId.has(nParam) ? graph.byId.get(nParam) : null;
  if (route === "projects" && parts[1]) {
    selected = graph.byId.get(`project:${parts[1]}`) || null;
  }

  const layout = route === "legacy" ? "legacy" : "constellation";
  let focus = { layout, frame: "all", selected: null, emphasis: null, guides: NONE };
  let label = "DVM";

  const select = (node) => {
    focus = { ...focus, selected: node.id, emphasis: null, ...frameForNode(graph, node) };
    label = node.label;
  };

  switch (route) {
    case "home":
      if (selected) select(selected);
      break;
    case "about":
      focus = { ...focus, selected: "about", frame: ["core", "about", "archive", "contact"], frameMin: 560 };
      label = "About";
      if (selected) select(selected);
      break;
    case "projects": {
      const cluster = ids(graph, ["fest", "project"]);
      focus = { ...focus, frame: cluster, emphasis: [...cluster], guides: { ...NONE, work: 1 } };
      label = "Projects";
      if (selected) {
        select(selected);
        focus.guides = { ...NONE, work: 0.6 };
      }
      break;
    }
    case "team": {
      const cluster = ids(graph, ["vertical", "member"]);
      focus = { ...focus, frame: cluster, emphasis: cluster, guides: { ...NONE, people: 1 } };
      label = "Team";
      if (selected) {
        select(selected);
        focus.guides = { ...NONE, people: 0.7 };
      }
      break;
    }
    case "blog": {
      const j = graph.byId.get("journal");
      const cluster = ["journal", ...childrenOf(graph, j)];
      const authors = cluster.flatMap((id) => neighbourIds(graph, graph.byId.get(id), ["member"]));
      focus = { ...focus, selected: "journal", frame: cluster, frameMin: 300, emphasis: [...cluster, ...authors] };
      label = "Blogs";
      if (selected) select(selected);
      break;
    }
    case "artwork": {
      const g = graph.byId.get("gallery");
      const cluster = ["gallery", ...childrenOf(graph, g)];
      const artists = cluster.flatMap((id) => neighbourIds(graph, graph.byId.get(id), ["member"]));
      focus = { ...focus, selected: "gallery", frame: cluster, frameMin: 300, emphasis: [...cluster, ...artists] };
      label = "Artwork";
      if (selected) select(selected);
      break;
    }
    case "legacy":
      focus = { ...focus, guides: { ...NONE, spiral: 1 } };
      label = "Legacy";
      if (selected) {
        select(selected);
        focus.guides = { ...NONE, spiral: 1 };
      }
      break;
    case "contactus":
      focus = { ...focus, selected: "contact", frame: ["contact", "core", "about", "archive"], frameMin: 720 };
      label = "Contact";
      break;
    case "archive":
      focus = { ...focus, layout: "grid", frame: "all" };
      label = "Archive";
      break;
  }

  return { route, focus, selectedNode: focus.selected && selected && focus.selected === selected.id ? selected : null, label, key: `${pathname}${search}` };
}
