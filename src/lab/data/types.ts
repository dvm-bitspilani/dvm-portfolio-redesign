// Shared content model for all DVM portfolio concepts.
// Image paths are public URLs under /assets/... (served from public/assets).

export type VerticalId = "frontend" | "backend" | "app" | "design" | "video";

export interface Vertical {
  id: VerticalId;
  /** Display name as used on the live team page, e.g. "Front-End Team". */
  name: string;
  /** Short label for chips/filters, e.g. "Frontend". */
  label: string;
  /** Verbatim description from the live team page ("About our Teams"). */
  description: string;
}

export type Fest = "APOGEE" | "BOSM" | "Oasis" | "Campus";

export interface FestInfo {
  id: Fest;
  name: string;
  /** Verbatim blurb from project pages. */
  blurb: string;
  website?: string;
}

export type ProjectKind = "website" | "app" | "portal" | "video";

export interface ProjectLinks {
  live?: string;
  playStore?: string;
  youtube?: string;
}

export interface Project {
  slug: string;
  title: string;
  /** Expanded name where the title is an acronym (e.g. AIC). */
  subtitle?: string;
  fest: Fest;
  kind: ProjectKind;
  year?: number;
  /** Human date string from source, e.g. "March 2021". */
  date?: string;
  verticals: VerticalId[];
  tags: string[];
  /** One-liner (first project-specific sentence of the description). */
  summary?: string;
  /** Project-specific long description. */
  description?: string;
  /** Generic fest blurb that accompanied the project in the source. */
  festContext?: string;
  /** Fest theme name, e.g. "A Celestial Epiphany". */
  theme?: string;
  /** Hero / landing screenshot (or YouTube thumbnail for videos). */
  cover?: string;
  /** Device mockup render (often transparent .webp). */
  mockup?: string;
  /** Full-page desktop screenshots, 960px wide (tall). */
  gallery?: string[];
  /** Full-page mobile screenshots, ~390px wide (tall). */
  mobileGallery?: string[];
  youtubeId?: string;
  /** Not present in source data. Reserved; currently never populated. */
  tech?: string[];
  links: ProjectLinks;
  /** Shown in "Selected Projects / Selected Videos" on the live landing page. */
  featured?: boolean;
}

export interface Socials {
  github?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  dribbble?: string;
  behance?: string;
  facebook?: string;
}

export interface Member {
  name: string;
  slug: string;
  vertical: VerticalId;
  /** Joining year (batch), 2017–2024. */
  batch: number;
  /** Position of responsibility, e.g. "Creative Head 2024-25". */
  designation?: string;
  isPorHolder?: boolean;
  photo: string;
  socials: Socials;
}

export type BlogPlatform = "Medium" | "BITS ACM Blog";

export interface Blog {
  slug: string;
  title: string;
  /** Shorter title used on the landing page, when different. */
  shortTitle?: string;
  authors: string[];
  /** Date string as published on the site, e.g. "31st Dec 2023". */
  date: string;
  /** ISO date derived from `date`. */
  isoDate: string;
  readMinutes: number;
  excerpt: string;
  url: string;
  platform: BlogPlatform;
  cover: string;
  tags: string[];
  featured?: boolean;
}

export interface Artwork {
  slug: string;
  title: string;
  artist: string;
  /** ISO date the piece was published to the portfolio CMS. */
  date: string;
  year: number;
  platform?: "ArtStation" | "Dribbble" | "Behance";
  description?: string;
  image: string;
  links: { artwork?: string; portfolio?: string };
  artistSocials: Socials;
}

export interface Stat {
  /** Numeric value for count-up animations. */
  value: number;
  /** Display string, e.g. "5000+". */
  display: string;
  label: string;
  /** Where the number comes from: "copy" = stated on the live site, "derived" = counted from this data layer. */
  source: "copy" | "derived";
}

export interface SocialLink {
  id: "facebook" | "instagram" | "github" | "linkedin" | "youtube";
  label: string;
  url: string;
}
