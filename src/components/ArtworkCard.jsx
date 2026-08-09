import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

/* Shared by the card and the modal so the two icon rows can never drift apart.
   Only renders an icon when that profile actually has a URL, so a creator with
   no Behance doesn't get a dead icon that opens about:blank. */
function SocialLinks({ links, creatorName }) {
  return (
    <div className="socials">
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
  );
}

/* The modal is portalled to document.body rather than rendered in place.
   ArtworkPage.css styles by descendant of #stage - most importantly
   `#stage svg { position: absolute; width: 100%; height: 100% }` - and #stage
   itself is position:fixed with overflow:hidden and a clip-path on its
   children. Anything rendered inside the card would inherit all of that and
   have to fight it (the socials already carry !important overrides for exactly
   this reason). Outside #stage, none of those selectors reach the modal, and
   the stage's `cursor: none` doesn't apply either, so the pointer behaves
   normally over the dialog. */
function ArtworkModal({
  title,
  image,
  description,
  creatorName,
  links,
  isClosing,
  onClose,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    // the page behind shouldn't scroll while the overlay is up
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      // keep Tab inside the dialog: without this the focus ring walks off into
      // the nav arrows and social links sitting behind the overlay
      const focusable = dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // capture phase so Escape is handled before anything else on the page
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className={`artwork-modal-backdrop${isClosing ? " is-closing" : ""}`}
      // mousedown, not click: a click that starts on the image and ends on the
      // backdrop (a stray drag) shouldn't close the dialog
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`artwork-modal${isClosing ? " is-closing" : ""}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-modal-title"
      >
        <button
          type="button"
          className="artwork-modal-close"
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 className="artwork-modal-title" id="artwork-modal-title">
          {title}
        </h2>

        {/* one scroll container for the whole dialog. The title, close button
            and creator row sit outside it and stay put; only this region moves
            when the description runs long, so a long description can't hand a
            scrollbar to every block in the modal. */}
        <div className="artwork-modal-body">
          <figure className="artwork-modal-figure">
            <img src={image} alt={title} draggable="false" />
          </figure>

          {description && (
            <p className="artwork-modal-description">{description}</p>
          )}
        </div>

        <div className="artwork-modal-creator">
          <h3>By {creatorName}</h3>
          <SocialLinks links={links} creatorName={creatorName} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ArtworkCard({
  title,
  image,
  description,
  creatorName,
  insta,
  linkedIn,
  dribble,
  behance,
  gitHub,
}) {
  const links = { insta, linkedIn, dribble, behance, gitHub };
  const [isOpen, setIsOpen] = useState(false);
  // Mounted for one more beat after the user asks to close, so the
  // artwork-modal-fade-out/artwork-modal-sink animations (ArtworkCard.css)
  // have time to play before the modal actually leaves the DOM - unmounting
  // immediately, as `isOpen && <ArtworkModal .../>` alone would do, cuts the
  // exit off with nothing to animate.
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef(null);

  const handleOpen = useCallback(() => {
    // reopening while the exit animation is still running would otherwise
    // leave the earlier close timeout armed, closing the reopened modal out
    // from under the user a moment later
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Matches the 180ms is-closing animations in ArtworkCard.css; skipped
    // entirely under reduced motion, where those animations are disabled.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    closeTimeoutRef.current = setTimeout(
      () => {
        setIsOpen(false);
        setIsClosing(false);
      },
      prefersReducedMotion ? 0 : 180
    );
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <div className="full-details-card">
      <h2 className="artwork-title">{title}</h2>

      <article>
        {/* a real <button>, not a div with onClick, so the artwork opens from
            the keyboard and announces itself to screen readers. It keeps the
            .image-container class, so the existing layout rules still size it */}
        <button
          type="button"
          className="image-container"
          onClick={handleOpen}
          aria-haspopup="dialog"
          aria-label={`Open ${title}`}
        >
          <img src={image} alt={title} loading="lazy" draggable="false" />
        </button>

        <section className="creator-section">
          <h3>By {creatorName}</h3>
          <SocialLinks links={links} creatorName={creatorName} />
        </section>
      </article>

      {isOpen && (
        <ArtworkModal
          title={title}
          image={image}
          description={description}
          creatorName={creatorName}
          links={links}
          isClosing={isClosing}
          onClose={handleClose}
        />
      )}
    </div>
  );
}