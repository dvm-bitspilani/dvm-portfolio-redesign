// The department's social links, labelled the way V8 writes them everywhere (menu, footer, the
// roster's aria-labels): the shared data spells GitHub "Github".
const LABELS = { github: "GitHub", linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };

/** @param {{ id: string, label: string }} x */
export const socialLabel = (x) => LABELS[x.id] ?? x.label;
