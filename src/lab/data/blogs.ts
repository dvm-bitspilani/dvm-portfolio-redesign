// Source: bits-dvm.org/all-blogs.html (+ landing page "Blogs" section for `featured`/`shortTitle`).
// Titles, dates, read times and excerpts are verbatim. Posts are hosted externally.
import type { Blog } from "./types";

export const blogs: Blog[] = [
  {
    slug: "oasis-app-ui-ux-case-study",
    title: "UI/UX Case Study — Oasis App — Food Ordering and Ticket Booking",
    authors: ["Sunpreet Singh Brar"],
    date: "31st Dec 2023",
    isoDate: "2023-12-31",
    readMinutes: 5,
    excerpt:
      "Explore the inception and development of the design process of Oasis 2023 app.. Discover how we conceptualized and crafted each feature, from food ordering to ticket booking, ensuring a seamless user experience with a vibrant and unique design aesthetic in every aspect.",
    url: "https://medium.com/@thesunpreet/ui-ux-case-study-oasis-app-food-ordering-and-ticket-booking-8d4d72956ce5",
    platform: "Medium",
    cover: "/assets/blogs/oasis-app-ui-ux-case-study.jpg",
    tags: ["Design", "UI/UX", "Oasis"],
    featured: true,
  },
  {
    slug: "refreshable-offline-qr",
    title: "How we integrated a refreshable offline QR in our app?",
    shortTitle: "How we integrated a refreshable offline QR in our app",
    authors: ["Shashvat Singh"],
    date: "9th Nov 2023",
    isoDate: "2023-11-09",
    readMinutes: 3,
    excerpt:
      "Successful implementation of an offline refreshable QR system, which effectively alleviated the queuing issues experienced during concerts caused by poor connectivity.",
    url: "https://medium.com/@shashvat1965/how-we-integrated-a-refreshable-offline-qr-in-our-app-81cbf5c5cdb1",
    platform: "Medium",
    cover: "/assets/blogs/refreshable-offline-qr.jpg",
    tags: ["App", "QR"],
    featured: true,
  },
  {
    slug: "time-table-generator",
    title: "The Time Table Generator",
    authors: ["Nidheesh Jain", "Uday Singla"],
    date: "31st Aug 2020",
    isoDate: "2020-08-31",
    readMinutes: 6,
    excerpt:
      "The time-table fiasco is nothing new or particular to us. It is a problem that every student of BITS Pilani has faced at some time or the other, and especially as a fresher when there are just too many options and clashes.",
    url: "https://blog.bitsacm.in/the-time-table-generator/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/time-table-generator.jpg",
    tags: ["Web", "Campus"],
  },
  {
    slug: "how-i-got-into-hardware",
    title: "How I Got Into Hardware and Why You Should Give It a Try",
    authors: ["Pradyumna Bang"],
    date: "30th July 2020",
    isoDate: "2020-07-30",
    readMinutes: 4,
    excerpt:
      "I had been looking at problems from a very constrained point of view. Often, problems involved dealing with people or things physically – like sensing presence or providing venues for interaction. This led me into explore - what did it take to build devices that solve these problems?",
    url: "https://blog.bitsacm.in/how-i-got-into-hardware/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/how-i-got-into-hardware.jpg",
    tags: ["Hardware"],
  },
  {
    slug: "graphql-with-django-graphene",
    title: "Using Graphene to setup GraphQL queries with Django",
    authors: ["Anshal Shukla"],
    date: "8th June 2020",
    isoDate: "2020-06-08",
    readMinutes: 10,
    excerpt:
      "If you're here, you know what GraphQL is. In this tutorial, you'll see how you can use it with Django to set up a schema and a single endpoint for all your data, using graphene and graphene_django.",
    url: "https://blog.bitsacm.in/using-graphql-with-diango/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/graphql-with-django-graphene.jpg",
    tags: ["Backend", "Django", "GraphQL"],
  },
  {
    slug: "setting-up-vim",
    title: "Setting Up a Vim You Will Love To Use",
    authors: ["Tirth Jain"],
    date: "25th May 2020",
    isoDate: "2020-05-25",
    readMinutes: 11,
    excerpt:
      "So with a little bit of effort you have crossed the Vim learning curve. You have gotten used to Vim but you are not able to get it to match the same level of productivity you get with something like VSCode. Well, the great thing about Vim is that it is highly customisable.",
    url: "https://blog.bitsacm.in/setting-up-vim/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/setting-up-vim.jpg",
    tags: ["Tooling", "Vim"],
    featured: true,
  },
  {
    slug: "flutter-vs-react-native",
    title: "Flutter vs React Native. Which one should you choose?",
    shortTitle: "Flutter vs React Native",
    authors: ["Prarabdh Garg"],
    date: "7th May 2020",
    isoDate: "2020-05-07",
    readMinutes: 5,
    excerpt:
      "Thinking of developing a cross-platform app? Confused whether to choose React Native or Flutter? Which among the two would scale well? Which would deliver better performance? For answers to all these questions and many more, read this post!",
    url: "https://blog.bitsacm.in/flutter-vs-react-native/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/flutter-vs-react-native.jpg",
    tags: ["App", "Flutter", "React Native"],
    featured: true,
  },
  {
    slug: "django-on-docker",
    title: "How To Deploy Your Django App Using Docker",
    authors: ["Tirth Jain"],
    date: "30th April 2020",
    isoDate: "2020-04-30",
    readMinutes: 11,
    excerpt:
      "Getting your Django app on the internet is - pardon my language - a pain in the ass. You need to daemonize your app with something like Supervisor, then you need to setup a production ready database, then you need to setup a web-server using the likes of Nginx or Apache",
    url: "https://blog.bitsacm.in/django-on-docker/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/django-on-docker.jpg",
    tags: ["Backend", "Django", "Docker", "DevOps"],
    featured: true,
  },
  {
    slug: "writing-git-in-rust",
    title: "Writing Git in Rust",
    authors: ["Tirth Jain"],
    // Date as printed on the site (likely a typo for a later year, but kept verbatim).
    date: "5th Jan 2020",
    isoDate: "2020-01-05",
    readMinutes: 6,
    excerpt:
      "Git is an indispensable tool in every programmer's toolkit. Yet, most of us only know barely enough to make Git work. As part of the Codecrafters challenge, I took to writing an asynchronous implementation of the Git internals in Rust",
    url: "https://blog.bitsacm.in/writing-git-in-rust/",
    platform: "BITS ACM Blog",
    cover: "/assets/blogs/writing-git-in-rust.jpg",
    tags: ["Rust", "Git"],
  },
];

/** Order used on the live landing page. */
export const featuredBlogSlugs = [
  "refreshable-offline-qr",
  "oasis-app-ui-ux-case-study",
  "setting-up-vim",
  "flutter-vs-react-native",
  "django-on-docker",
] as const;

export const featuredBlogs = featuredBlogSlugs
  .map((s) => blogs.find((b) => b.slug === s)!)
  .filter(Boolean);
