// Detail panel for whichever node is focused: project, fest, team, member, post, artwork, year.
import { useEffect, useRef, useState } from "react";
import { KIND_NAMES } from "../graph/model";
import { useShell } from "../lib/hooks";
import Panel, { NodeLink, Section, panelStyles as s } from "./Panel";

const ext = { target: "_blank", rel: "noreferrer noopener" };
const SOCIAL_LABEL = { github: "GitHub", linkedin: "LinkedIn", instagram: "Instagram", twitter: "Twitter", dribbble: "Dribbble", behance: "Behance", facebook: "Facebook" };
const KIND = { website: "Website", app: "App", portal: "Portal", video: "Film" };

function useGraph() {
  return useShell().graph;
}

function neighbours(graph, node, kind) {
  const out = [];
  for (const k of graph.edgesOf[node.i]) {
    const e = graph.edges[k];
    const o = graph.nodes[e.a === node.i ? e.b : e.a];
    if (!kind || o.kind === kind) out.push(o);
  }
  return out;
}

function Lightbox({ src, alt, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className={s.lightbox} role="dialog" aria-modal="true" aria-label={alt} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <button ref={closeRef} type="button" className={s.lightboxClose} onClick={onClose} aria-label="Close image">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
      </button>
      <div className={s.lightboxScroll}>
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}

function Gallery({ images, title }) {
  const [open, setOpen] = useState(null);
  if (!images.length) return null;
  return (
    <>
      <ul className={s.gallery}>
        {images.map((g, k) => (
          <li key={g.src}>
            <button type="button" className={`${s.shot} ${g.mobile ? s.shotMobile : ""}`} onClick={() => setOpen(g)} aria-label={`Open ${g.mobile ? "mobile" : "desktop"} screenshot ${k + 1} of ${title}`}>
              <img src={g.src} alt="" loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>
      {open && <Lightbox src={open.src} alt={`${title}, ${open.mobile ? "mobile" : "desktop"} screenshot`} onClose={() => setOpen(null)} />}
    </>
  );
}

function ProjectDetail({ node }) {
  const graph = useGraph();
  const p = node.project;
  const fest = graph.nodes[node.parent];
  const verts = neighbours(graph, node, "vertical");
  const siblings = graph.nodes.filter((n) => n.parent === fest.i && n !== node).sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 6);
  const year = p.year ? graph.byId.get(`year:${p.year}`) : null;
  const shots = [...(p.gallery || []).map((src) => ({ src })), ...(p.mobileGallery || []).map((src) => ({ src, mobile: true }))];
  const hero = p.mockup || p.cover;
  return (
    <Panel kicker={`${KIND[p.kind]}, ${fest.label}`} title={p.title}>
      {p.subtitle && <p className={s.subtitle}>{p.subtitle}</p>}
      <div className={s.meta}>
        <NodeLink node={fest} className={s.chip} />
        {year && <NodeLink node={year} className={`${s.chip} ${s.chipYear}`}>{p.date || p.year}</NodeLink>}
        <span className={s.chipPlain}>{KIND[p.kind]}</span>
      </div>
      {p.youtubeId ? (
        <a className={s.video} href={p.links.youtube || `https://www.youtube.com/watch?v=${p.youtubeId}`} {...ext}>
          <img src={p.cover || `https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className={s.play}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            Watch on YouTube
          </span>
        </a>
      ) : hero ? (
        <figure className={`${s.hero} ${p.mockup ? s.heroMock : ""}`}>
          <img src={hero} alt={`${p.title}${p.mockup ? " on devices" : ""}`} loading="lazy" decoding="async" />
        </figure>
      ) : null}
      {p.theme && (
        <p className={s.theme}>
          Theme <span>{p.theme}</span>
        </p>
      )}
      {(p.description || p.summary) && <p className={s.body}>{p.description || p.summary}</p>}
      <div className={s.links}>
        {p.links.live && <a href={p.links.live} {...ext} className={s.btn}>Visit the site</a>}
        {p.links.playStore && <a href={p.links.playStore} {...ext} className={s.btn}>Google Play</a>}
        {p.links.youtube && !p.youtubeId && <a href={p.links.youtube} {...ext} className={s.btn}>YouTube</a>}
      </div>
      {shots.length > 0 && (
        <Section title="Screens" count={shots.length}>
          <Gallery images={shots} title={p.title} />
        </Section>
      )}
      {verts.length > 0 && (
        <Section title="Built by">
          <ul className={s.tags}>
            {verts.map((v) => (
              <li key={v.id}><NodeLink node={v} className={s.chip} /></li>
            ))}
          </ul>
        </Section>
      )}
      {siblings.length > 0 && (
        <Section title={`More from ${fest.label}`}>
          <ul className={s.list}>
            {siblings.map((n) => (
              <li key={n.id}>
                <NodeLink node={n} className={s.row}>
                  <span className={s.rowTitle}>{n.label}</span>
                  <span className={s.rowMeta}>{n.project.year || ""}</span>
                </NodeLink>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Panel>
  );
}

function FestDetail({ node }) {
  const graph = useGraph();
  const f = node.fest;
  const projects = graph.nodes.filter((n) => n.parent === node.i).sort((a, b) => (b.year || 0) - (a.year || 0) || a.label.localeCompare(b.label));
  return (
    <Panel kicker="Fest" title={node.label}>
      <p className={s.body}>{f.blurb}</p>
      {f.website && (
        <div className={s.links}>
          <a href={f.website} {...ext} className={s.btn}>{f.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>
        </div>
      )}
      <Section title="What we built for it" count={projects.length}>
        <ProjectRows nodes={projects} />
      </Section>
    </Panel>
  );
}

export function ProjectRows({ nodes }) {
  return (
    <ul className={s.list}>
      {nodes.map((n) => (
        <li key={n.id}>
          <NodeLink node={n} className={s.rowThumb}>
            <span className={s.thumb}>{n.project.cover ? <img src={n.project.cover} alt="" loading="lazy" decoding="async" /> : <span className={s.thumbEmpty} />}</span>
            <span className={s.rowText}>
              <span className={s.rowTitle}>{n.label}</span>
              <span className={s.rowMeta}>
                {KIND[n.project.kind]}
                {n.project.year ? `, ${n.project.year}` : ""}
              </span>
            </span>
          </NodeLink>
        </li>
      ))}
    </ul>
  );
}

function VerticalDetail({ node }) {
  const graph = useGraph();
  const members = graph.nodes.filter((n) => n.parent === node.i);
  const batches = [...new Set(members.map((m) => m.member.batch))].sort((a, b) => b - a);
  const projects = neighbours(graph, node, "project");
  return (
    <Panel kicker="Team" title={node.label}>
      <p className={s.body}>{node.vertical.description}</p>
      <p className={s.note}>
        Each ring around the {node.vertical.label} node in the graph is one batch, newest closest in.
      </p>
      {batches.map((b) => {
        const ring = members.filter((m) => m.member.batch === b);
        return (
          <Section key={b} title={`Batch of ${b}`} count={ring.length}>
            <ul className={s.people}>
              {ring.map((m) => (
                <li key={m.id}>
                  <NodeLink node={m} className={s.person}>
                    <img src={m.member.photo} alt="" loading="lazy" decoding="async" />
                    <span>{m.label}</span>
                  </NodeLink>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
      <Section title="Projects it worked on" count={projects.length}>
        <ul className={s.tags}>
          {projects.map((p) => (
            <li key={p.id}><NodeLink node={p} className={s.chip} /></li>
          ))}
        </ul>
      </Section>
    </Panel>
  );
}

function MemberDetail({ node }) {
  const graph = useGraph();
  const m = node.member;
  const vert = graph.nodes[node.parent];
  const year = graph.byId.get(`year:${m.batch}`);
  const posts = neighbours(graph, node, "blog");
  const art = neighbours(graph, node, "art");
  const mates = graph.nodes.filter((n) => n.parent === node.parent && n !== node && n.member.batch === m.batch);
  const socials = Object.entries(m.socials || {}).filter(([, v]) => v);
  return (
    <Panel kicker={`${vert.vertical.label}, batch of ${m.batch}`} title={m.name}>
      <div className={s.profile}>
        <img src={m.photo} alt={`Portrait of ${m.name}`} loading="lazy" decoding="async" />
        <div>
          {m.designation && <p className={s.designation}>{m.designation}</p>}
          <div className={s.meta}>
            <NodeLink node={vert} className={s.chip} />
            {year && <NodeLink node={year} className={`${s.chip} ${s.chipYear}`}>Joined {m.batch}</NodeLink>}
          </div>
        </div>
      </div>
      {socials.length > 0 && (
        <div className={s.links}>
          {socials.map(([k, v]) => (
            <a key={k} href={v} {...ext} className={s.btn}>{SOCIAL_LABEL[k] || k}</a>
          ))}
        </div>
      )}
      {posts.length > 0 && (
        <Section title="Wrote">
          <ul className={s.list}>
            {posts.map((b) => (
              <li key={b.id}><NodeLink node={b} className={s.row}><span className={s.rowTitle}>{b.label}</span><span className={s.rowMeta}>{b.blog.date}</span></NodeLink></li>
            ))}
          </ul>
        </Section>
      )}
      {art.length > 0 && (
        <Section title="Artwork" count={art.length}>
          <ArtGrid nodes={art} />
        </Section>
      )}
      {mates.length > 0 && (
        <Section title={`Same ring: ${vert.vertical.label}, ${m.batch}`} count={mates.length}>
          <ul className={s.people}>
            {mates.map((n) => (
              <li key={n.id}>
                <NodeLink node={n} className={s.person}>
                  <img src={n.member.photo} alt="" loading="lazy" decoding="async" />
                  <span>{n.label}</span>
                </NodeLink>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Panel>
  );
}

function BlogDetail({ node }) {
  const graph = useGraph();
  const b = node.blog;
  const authors = b.authors.map((a) => ({ name: a, node: neighbours(graph, node, "member").find((n) => n.label.toLowerCase() === a.toLowerCase()) }));
  return (
    <Panel kicker={`Blog post, ${b.platform}`} title={b.title}>
      <figure className={s.hero}>
        <img src={b.cover} alt="" loading="lazy" decoding="async" />
      </figure>
      <div className={s.meta}>
        {authors.map((a) => (a.node ? <NodeLink key={a.name} node={a.node} className={s.chip}>{a.name}</NodeLink> : <span key={a.name} className={s.chipPlain}>{a.name}</span>))}
        <span className={s.chipPlain}>{b.date}</span>
        <span className={s.chipPlain}>{b.readMinutes} min read</span>
      </div>
      <p className={s.body}>{b.excerpt}</p>
      <div className={s.links}>
        <a href={b.url} {...ext} className={s.btn}>Read it on {b.platform}</a>
      </div>
    </Panel>
  );
}

export function ArtGrid({ nodes }) {
  return (
    <ul className={s.artGrid}>
      {nodes.map((n) => (
        <li key={n.id}>
          <NodeLink node={n} className={s.artTile} aria-label={`${n.label} by ${n.art.artist}`}>
            <img src={n.art.image} alt="" loading="lazy" decoding="async" />
          </NodeLink>
        </li>
      ))}
    </ul>
  );
}

function ArtDetail({ node }) {
  const graph = useGraph();
  const a = node.art;
  const artist = neighbours(graph, node, "member")[0];
  const more = artist ? neighbours(graph, artist, "art").filter((n) => n !== node) : [];
  const [open, setOpen] = useState(false);
  return (
    <Panel kicker={`Artwork${a.platform ? `, ${a.platform}` : ""}`} title={a.title}>
      <button type="button" className={s.artHero} onClick={() => setOpen(true)} aria-label={`Open ${a.title} full size`}>
        <img src={a.image} alt="" decoding="async" />
      </button>
      {open && <Lightbox src={a.image} alt={a.title} onClose={() => setOpen(false)} />}
      <div className={s.meta}>
        {artist ? <NodeLink node={artist} className={s.chip}>{a.artist}</NodeLink> : <span className={s.chipPlain}>{a.artist}</span>}
        <span className={s.chipPlain}>{a.year}</span>
      </div>
      {a.description && <p className={s.body}>{a.description}</p>}
      <div className={s.links}>
        {a.links.artwork && <a href={a.links.artwork} {...ext} className={s.btn}>View on {a.platform || "the web"}</a>}
        {a.links.portfolio && <a href={a.links.portfolio} {...ext} className={s.btn}>Artist’s portfolio</a>}
      </div>
      {more.length > 0 && (
        <Section title={`More by ${a.artist}`} count={more.length}>
          <ArtGrid nodes={more} />
        </Section>
      )}
    </Panel>
  );
}

function YearDetail({ node }) {
  const graph = useGraph();
  const items = graph.nodes.filter((n) => n.year === node.year && n.kind !== "year");
  const projects = items.filter((n) => n.kind === "project");
  const members = items.filter((n) => n.kind === "member");
  const posts = items.filter((n) => n.kind === "blog");
  const art = items.filter((n) => n.kind === "art");
  return (
    <Panel kicker="Year on the spiral" title={String(node.year)} titleClass={s.titleYear}>
      <p className={s.body}>
        {[
          projects.length && `${projects.length} project${projects.length > 1 ? "s" : ""} shipped`,
          members.length && `${members.length} members joined`,
          posts.length && `${posts.length} post${posts.length > 1 ? "s" : ""} written`,
          art.length && `${art.length} artworks added`,
        ]
          .filter(Boolean)
          .join(", ")}
        .
      </p>
      {projects.length > 0 && (
        <Section title="Shipped" count={projects.length}>
          <ProjectRows nodes={projects} />
        </Section>
      )}
      {posts.length > 0 && (
        <Section title="Written">
          <ul className={s.list}>
            {posts.map((b) => (
              <li key={b.id}><NodeLink node={b} className={s.row}><span className={s.rowTitle}>{b.label}</span><span className={s.rowMeta}>{b.blog.authors.join(", ")}</span></NodeLink></li>
            ))}
          </ul>
        </Section>
      )}
      {art.length > 0 && (
        <Section title="Drawn" count={art.length}>
          <ArtGrid nodes={art} />
        </Section>
      )}
      {members.length > 0 && (
        <Section title="Joined" count={members.length}>
          <ul className={s.tags}>
            {members.map((m) => (
              <li key={m.id}><NodeLink node={m} className={s.chip} /></li>
            ))}
          </ul>
        </Section>
      )}
    </Panel>
  );
}

export default function NodeDetail({ node }) {
  switch (node.kind) {
    case "project":
      return <ProjectDetail node={node} />;
    case "fest":
      return <FestDetail node={node} />;
    case "vertical":
      return <VerticalDetail node={node} />;
    case "member":
      return <MemberDetail node={node} />;
    case "blog":
      return <BlogDetail node={node} />;
    case "art":
      return <ArtDetail node={node} />;
    case "year":
      return <YearDetail node={node} />;
    default:
      return (
        <Panel kicker={KIND_NAMES[node.kind]} title={node.label}>
          <p className={s.body}>{node.sub}</p>
        </Panel>
      );
  }
}
