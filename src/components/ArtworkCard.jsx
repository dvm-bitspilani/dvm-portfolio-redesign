import "./ArtworkCard.css";

/* Social icons are inline SVG rather than background-image PNGs.
   Two reasons:
     1. The PNGs were rendering as opaque squares - a 26x26 box with no
        background-size/repeat crops the file at its natural size, and any
        non-transparent pixels sit on the dark stage as a white block.
     2. Inline SVG inherits `currentColor`, so the icons can be dimmed at rest
        and lit to the same blue as the nav arrows on hover, with no extra art. */
const ICONS = {
  insta: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  ),
  linkedIn: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="7.4" cy="7.6" r="1.15" fill="currentColor" stroke="none" />
      <path d="M7.4 10.7v6.4" />
      <path d="M11.3 17.1v-6.4" />
      <path d="M11.3 13.6a2.6 2.6 0 0 1 5.2 0v3.5" />
    </svg>
  ),
  dribble: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.1 6.3c3.6 3.7 8.9 5.1 14.2 4.2" />
      <path d="M3.3 13.4c5-1.7 10.2-.4 13.5 3.7" />
      <path d="M8.9 3.5c4.1 4.7 6.1 10.3 5.8 16.4" />
    </svg>
  ),
  behance: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 7h4.3a2.3 2.3 0 0 1 0 4.6H3z" />
      <path d="M3 11.6h4.9a2.5 2.5 0 0 1 0 5H3z" />
      <path d="M14.6 7.6h5.6" />
      <path d="M13.9 13.4h6.6a3.3 3.3 0 1 0-.8 2.6" />
    </svg>
  ),
  gitHub: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        stroke="none"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49l-.01-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"
      />
    </svg>
  ),
};

const SOCIALS = [
  ["insta", "Instagram"],
  ["linkedIn", "LinkedIn"],
  ["dribble", "Dribbble"],
  ["behance", "Behance"],
  ["gitHub", "GitHub"],
];

export default function ArtworkCard({
  title,
  image,
  creatorName,
  insta,
  linkedIn,
  dribble,
  behance,
  gitHub,
}) {
  const links = { insta, linkedIn, dribble, behance, gitHub };

  return (
    <div className="full-details-card">
      <h2 className="artwork-title">{title}</h2>

      <article>
        <div className="image-container">
          <img src={image} alt={title} loading="lazy" draggable="false" />
        </div>

        <section className="creator-section">
          <h3>By {creatorName}</h3>

          <div className="socials">
            {/* only render an icon when that profile actually has a URL, so a
                creator with no Behance doesn't get a dead icon that opens
                about:blank */}
            {SOCIALS.filter(([key]) => links[key]).map(([key, label]) => (
              <a
                key={key}
                className={`social ${key}`}
                href={links[key]}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={`${creatorName} on ${label}`}
              >
                {ICONS[key]}
              </a>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}