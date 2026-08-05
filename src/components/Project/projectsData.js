import rawProjects from "./projects.json";

const projects = rawProjects.map((item) => {
  const f = item.fields;

  const categories = f.teamsInvolved
    .split(",")
    .map((x) => x.trim())
    .map((x) => {
      switch (x) {
        case "Front":
          return "Frontend";
        case "Back":
          return "Backend";
        case "App":
          return "AppDev";
        default:
          return x;
      }
    });

  return {
    id: String(item.pk),

    name: f.name,

    categories,

    type: categories.includes("Video") ? "video" : "website",

    date: f.date === "-" ? null : f.date,

    websiteLink:
      f.website_link === "http://null.com"
        ? null
        : f.website_link,

    heroImage:
      f.heroSectionImageLink === "-"
        ? null
        : f.heroSectionImageLink,

    text1: f.text_1 === "-" ? null : f.text_1,

    text2: f.text_2 === "-" ? null : f.text_2,

    gallery:
      f.long_images_link === "-"
        ? []
        : f.long_images_link.split(",").map((img) => img.trim()),

    mockup:
      f.mockups_link === "-"
        ? null
        : f.mockups_link,

    youtubeId: categories.includes("Video")
      ? f.heroSectionImageLink
      : null,
  };
});

export default projects;