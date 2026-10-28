// Checks every state file before a build, so a broken or incomplete state can't go live.
// Usage: npm run check-states   (also runs before every build)
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("../src/data/states/", import.meta.url).pathname;
const errors = [];
const seen = new Map();
const COUNTS = (t) => !["info", "rule", "optional"].includes(t);
const url = (u) => typeof u === "string" && /^https?:\/\/\S+$/.test(u);

for (const f of readdirSync(dir).filter((f) => /^[A-Z]{2}\.json$/.test(f)).sort()) {
  const code = f.slice(0, 2);
  const bad = (msg) => errors.push(`${code}: ${msg}`);
  let s;
  try { s = JSON.parse(readFileSync(dir + f, "utf8")); } catch (e) { bad(`not valid JSON (${e.message})`); continue; }
  if (s.state !== code) bad(`"state" is ${s.state}, should be ${code}`);
  for (const k of ["name", "summary", "covers_nil_agents"]) if (!s[k]) bad(`missing ${k}`);
  if (typeof s.license_required !== "boolean") bad("license_required must be true or false");
  if (typeof s.attorney_reviewed !== "boolean") bad("attorney_reviewed must be true or false");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.last_researched ?? "")) bad("last_researched must be a YYYY-MM-DD date");
  if (!s.law?.name || !["RUAAA", "UAAA", "own", "none"].includes(s.law?.type)) bad("law needs a name and a type of RUAAA, UAAA, own or none");
  if (s.law?.type !== "none" && !url(s.law?.source)) bad("law needs a source link");
  if (s.license_required && !s.regulator?.name) bad("a state that requires a license needs its regulator");
  if (!Array.isArray(s.sections)) { bad("missing sections"); continue; }
  const ids = s.sections.map((x) => x.id);
  for (const need of ["get_licensed", "every_athlete", "stay_compliant"]) if (!ids.includes(need)) bad(`missing the ${need} section`);
  if (s.license_required && !s.sections.find((x) => x.id === "get_licensed")?.steps?.some((st) => COUNTS(st.type)))
    bad("get_licensed has no step that counts toward the license");
  for (const se of s.sections)
    for (const st of se.steps ?? []) {
      const where = `step ${st.id ?? "(no id)"}`;
      if (!st.id || !st.text || !st.type) bad(`${where} needs an id, text and type`);
      if (!url(st.source)) bad(`${where} has no source link`);
      if (st.type === "payment" && typeof st.amount_usd !== "number") bad(`${where} is a payment with no amount`);
      // Step ids are saved per agent across every state, so two states can never share one.
      if (st.id && seen.has(st.id)) bad(`${where} is also used in ${seen.get(st.id)}`);
      else if (st.id) seen.set(st.id, code);
    }
}

if (errors.length) {
  console.error(`State rules check failed:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`State rules check passed: ${seen.size} steps across ${new Set(seen.values()).size} states.`);
