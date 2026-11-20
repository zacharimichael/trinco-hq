import type { School } from "@/data/schools";

export type SchoolHit = { start: number; end: number; school: School };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cache = new WeakMap<School[], { re: RegExp; byName: Map<string, School> }>();

/**
 * Finds school names typed in a note, e.g. "Talked to Auburn's ST coach" finds Auburn.
 * Matching is case-sensitive and whole-word so "rice" or "navy blue" don't count, and the
 * longest name wins ("Texas A&M" beats "Texas"). "Miami (OH)" also matches plain "Miami (OH)";
 * a bare name like "Lincoln University" counts only when just one school has it.
 */
function matcher(schools: School[]) {
  const hit = cache.get(schools);
  if (hit) return hit;
  const byName = new Map<string, School>();
  const base = new Map<string, School[]>();
  for (const s of schools) {
    byName.set(s.name, s);
    const b = s.name.replace(/\s*\([^)]*\)$/, "");
    if (b !== s.name) base.set(b, [...(base.get(b) ?? []), s]);
  }
  for (const [b, list] of base) if (list.length === 1 && !byName.has(b)) byName.set(b, list[0]);
  const names = [...byName.keys()].filter((n) => n.length >= 3).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![A-Za-z0-9])(?:${names.map(esc).join("|")})(?![A-Za-z0-9])`, "g");
  const m = { re, byName };
  cache.set(schools, m);
  return m;
}

/** Every school named in the text, in order. */
export function findSchoolsIn(text: string, schools: School[]): SchoolHit[] {
  if (!text || !schools.length) return [];
  const { re, byName } = matcher(schools);
  return [...text.matchAll(re)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, school: byName.get(m[0])! }));
}

/** Schools named across several notes, each once, most mentioned first. */
export function schoolsMentioned(texts: string[], schools: School[]): School[] {
  const count = new Map<string, { s: School; n: number }>();
  for (const t of texts) for (const h of findSchoolsIn(t, schools)) {
    const c = count.get(h.school.id) ?? { s: h.school, n: 0 };
    c.n++; count.set(h.school.id, c);
  }
  return [...count.values()].sort((a, b) => b.n - a.n).map((c) => c.s);
}

export const schoolHref = (s: School) => `/schools?s=${s.state}&school=${encodeURIComponent(s.id)}`;
