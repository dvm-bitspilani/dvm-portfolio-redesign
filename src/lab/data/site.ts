// Site-wide copy, brand tokens, verticals, fests, stats and contact.
// Sources: bits-dvm.org index.html / team.html / CSS (live == DVM-Portfolio clone), project API blurbs,
// and taglines from the abandoned dvm-portfolio-redesign branches (marked as such).
import type { FestInfo, SocialLink, Stat, Vertical } from "./types";
import { projects } from "./projects";
import { team } from "./team";
import { artworks } from "./artworks";
import { blogs } from "./blogs";

export const site = {
  name: "DVM",
  fullName: "Department of Visual Media",
  institution: "BITS Pilani",
  url: "https://bits-dvm.org",
  logo: "/assets/logo.svg",
  favicon: "/assets/favicon.png",

  /** Headline on the landing About section; the team page hero renders it uppercase ("WE ARE DVM"). */
  headline: "We are DVM",

  taglines: {
    /** Easter-egg strip under the hero on the live site (Harry Potter reference, shown with a gif). */
    mischief: "We solemnly swear that we are upto no good",
    footer: "Made with ❤️ by DVM",
    /** From the redesign branch hero (feat/projects-page / ujaas), not the live site. */
    redesignHero: "CODE. DESIGN. ANIMATE.",
    /** From the redesign branch hamburger menu, not the live site. */
    redesignMenu: "DESIGN. EDIT. CODE.",
  },

  /** Verbatim About paragraphs from the live landing page. */
  about: [
    "The Department of Visual Media plays an instrumental role in building the software that is the backbone of all the three fests of BITS Pilani - BOSM, Oasis and APOGEE.",
    "DVM is responsible for creating and maintaining the Websites, Applications (iOS & Android), Teasers, Trailers & Promotional Videos of the three fests.",
    "Despite generating traffic of over 5000 users on our apps and websites, we handle everything with ease.",
    "We work in 5 teams to ensure that everyone has a hassle free and memorable experience during the fests.",
  ],

  /** Section titles as used on the live landing page, in order. */
  sections: ["About Us", "Selected Projects", "Selected Videos", "Blogs", "Artworks", "Contact Us"],

  contact: {
    /** Appears in the live contact form's error fallback ("Please send a mail directly to ..."). */
    email: "admin@bits-dvm.org",
    /** Contact form fields on the live site. */
    formFields: ["Name", "Email", "Phone Number", "Message"],
    // No postal address is published on the live site or in the repo.
  },
} as const;

export const socials: SocialLink[] = [
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/DVMBITSPilani" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/dvmbitspilani/" },
  { id: "github", label: "Github", url: "https://github.com/dvm-bitspilani" },
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/company/dvm-bitspilani/" },
];

/** Order and copy from team.html "About our Teams". */
export const verticals: Vertical[] = [
  {
    id: "frontend",
    name: "Front-End Team",
    label: "Frontend",
    description:
      "Responsible for creating and maintaining the fests’ main and sub-websites. We also build and handle various event management portals and web applications like e-wallets.",
  },
  {
    id: "app",
    name: "App Development Team",
    label: "AppDev",
    description:
      "The app team builds and deploys the apps, Android and iOS, to keep the fest experience smooth and hassle-free. We provide platforms for cashless payment, event registration, and everything that keeps the fest going.",
  },
  {
    id: "backend",
    name: "Back-End Team",
    label: "Backend",
    description:
      "The backend team provides the server-side infrastructure behind every app/website for the fest. Right from registration of participants to managing wallet transactions, everything that involves servers is handled by us.",
  },
  {
    id: "video",
    name: "Video Team",
    label: "Video",
    description:
      "The video team works with motion graphics, 3D modeling, animation, and editing software to create teasers, promos, trailers, and curtain raisers for the fests.",
  },
  {
    id: "design",
    name: "Design Team",
    label: "Design",
    description:
      "The design team is responsible for creating website and mobile user interfaces for the fests. It is also responsible for creating the accompanying graphics.",
  },
];

/** Fest blurbs verbatim from project descriptions in the portfolio API. */
export const fests: FestInfo[] = [
  {
    id: "APOGEE",
    name: "APOGEE",
    website: "https://www.bits-apogee.org/",
    blurb:
      "APOGEE (A Professions Oriented Gathering over Educational Experiences) - is BITS Pilani's annual technical extravaganza. From presenting papers and projects at the oldest-of-its-kind events in the country, developing amazing solutions to real-life cases and problems, exhibitions of the best contraptions that man has made, guest lectures that tell stories never heard before, to the college’s own literature festival, APOGEE challenges the intellect of the participants and piques the minds of the audience.",
  },
  {
    id: "BOSM",
    name: "BOSM",
    website: "https://www.bits-bosm.org/",
    blurb:
      "The BITS Open Sports Meet (BOSM) is the annual sports festival of BITS Pilani, Pilani Campus. This much awaited sporting extravaganza is a platform for college teams to exhibit their exceptional sporting talents and compete for superiority! Since its first edition way back in 1986, it has grown to be one of the largest and most competitive college sports fests in the country.",
  },
  {
    id: "Oasis",
    name: "Oasis",
    website: "https://bits-oasis.org/",
    blurb:
      "Oasis—the cultural fest of BITS Pilani—is nothing but 96 hours of unadulterated thrills comprising music, dance, drama, art, quizzes, fashion, and humour. With a footfall of around 5000+ every year, it is the second-largest cultural festival of India.",
  },
];

const batches = [...new Set(team.map((m) => m.batch))].sort((a, b) => a - b);

export const stats: Stat[] = [
  { value: 5000, display: "5000+", label: "users on our apps and websites", source: "copy" },
  { value: 3, display: "3", label: "fests: BOSM, Oasis & APOGEE", source: "copy" },
  { value: 5, display: "5", label: "teams", source: "copy" },
  { value: projects.filter((p) => p.kind !== "video").length, display: String(projects.filter((p) => p.kind !== "video").length), label: "websites, apps & portals in the archive", source: "derived" },
  { value: projects.filter((p) => p.kind === "video").length, display: String(projects.filter((p) => p.kind === "video").length), label: "teasers, promos & curtain raisers", source: "derived" },
  { value: team.length, display: String(team.length), label: "members on record", source: "derived" },
  { value: batches.length, display: `${batches[0]}–${batches[batches.length - 1]}`, label: "batches", source: "derived" },
  { value: artworks.length, display: String(artworks.length), label: "artworks", source: "derived" },
  { value: blogs.length, display: String(blogs.length), label: "blog posts", source: "derived" },
];

/**
 * Brand tokens extracted from the live CSS + DVM-Logo.svg.
 * The live site is near-black + white with a single electric-violet accent (hero circuit strip / loader).
 */
export const brand = {
  colors: {
    bg: "#050505", // dominant page background (index.css, most-used colour)
    bgDeep: "#000000",
    surface: "#0d0d0d", // inputs / contact form
    surface2: "#1a1a1a",
    surface3: "#2c2c2c", // all-projects / team panels
    line: "#3c3c3c",
    text: "#ffffff",
    textMuted: "#cccccc",
    textDim: "#707070",
    violet: "#4400cc", // loader gradient start; matches the hero "purple circuit" strip
    violetDeep: "#3800a9", // loader gradient end
    teamBlue: "#2196f3", // selected department tab on team.html
    lilac: "#a18cd1", // project page diagonal split bg
    pink: "#fbc2eb", // project page diagonal split bg
  },
  fonts: {
    wordmark: { family: "Jaapokki Subtract", src: "/assets/fonts/jaapokki-subtract.otf", usage: "'DVM' nav wordmark, letter-spacing ~9.6px" },
    display: { family: "Gilroy", usage: "Heavy/Bold for big headlines (88px, letter-spacing 13.2px)" },
    body: { family: "Poppins", usage: "Section headings (600) and body copy; most-used font" },
    secondary: ["Ropa Sans", "Open Sans"],
  },
  logo: {
    src: "/assets/logo.svg",
    viewBox: "0 0 375.62 375.62",
    description:
      "Monochrome white geometric shield/chevron monogram: two interlocking angular strokes forming a stylised 'V' cradling an 'M'-like notch, with a tall right-side blade — reads as D-V-M in one mark. Two SVG paths, fill #FFFFFF.",
  },
} as const;
