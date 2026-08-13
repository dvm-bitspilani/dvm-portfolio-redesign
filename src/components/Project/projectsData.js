import rawProjects from "../../projects.json";

const assetModules = import.meta.glob("../../assests/**/*", {
  eager: true,
  query: "?url",
  import: "default",
});

const getDate = (date) => {
  if (!date || typeof date !== "string") return 0;
  const timestamp = Date.parse(`1 ${date}`);
  return isNaN(timestamp) ? 0 : timestamp;
};

const cleanValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  return trimmed;
};

const getAsset = (value) => {
  const path = cleanValue(value);
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const filename = path.replace(/\\/g, "/").split("/").pop();
  if (!filename) return null;

  const assetKey = Object.keys(assetModules).find((key) => {
    const keyFilename = key.replace(/\\/g, "/").split("/").pop();
    return keyFilename === filename;
  });

  return assetKey ? assetModules[assetKey] : null;
};

const projects = rawProjects
  .map((item) => {
    const f = item.fields;

    const categories = (f.teamsInvolved || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
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
      date: cleanValue(f.date),
      websiteLink:
        f.website_link === "http://null.com"
          ? null
          : cleanValue(f.website_link),
      heroImage: getAsset(f.heroSectionImageLink),
      text1: cleanValue(f.text_1),
      text2: cleanValue(f.text_2),
      gallery: f.long_images_link
        ? f.long_images_link.split(",").map((img) => getAsset(img)).filter(Boolean)
        : [],
      mockup: getAsset(f.mockups_link),
      youtubeId: categories.includes("Video")
        ? cleanValue(f.heroSectionImageLink)
        : null,
    };
  })
  .sort((a, b) => getDate(b.date) - getDate(a.date));

export default projects;