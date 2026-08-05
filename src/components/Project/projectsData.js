import rawProjects from "./projects.json";

const monthMap = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

const getDate = (date) => {
  if (!date) return 0;

  const timestamp = Date.parse(`1 ${date}`);

  return isNaN(timestamp) ? 0 : timestamp;
};

const projects = rawProjects
  .map((item) => {
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
  })
  .sort((a, b) => getDate(b.date) - getDate(a.date));

export default projects;