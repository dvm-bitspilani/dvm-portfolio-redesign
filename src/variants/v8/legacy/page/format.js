// /alumni: how the page words a person and a step.

/**
 * A person's name as printed: names stored in capitals ("HARSHIT SARAF") in title case, the rest
 * as they are.
 * @param {string} name
 */
export function personName(name) {
  if (/[a-z]/.test(name) || name.length <= 3) return name;
  return name.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

/**
 * A role beside the Intern tag: the tag says "intern", so a role that ends in it drops the word
 * ("SDE Intern" → "SDE", "Intern" → ""). Full-time roles as they are.
 * @param {string | undefined} role
 * @param {"intern" | "full-time" | undefined} kind
 */
export function roleText(role, kind) {
  const r = (role ?? "").trim();
  if (kind !== "intern") return r;
  return r.replace(/[\s·,–-]*\binterns?(?:hip)?\s*$/i, "").trim();
}
