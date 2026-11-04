import type { School } from "@/data/schools";
import { allSchools, newId, overall, yearsLeft, type Match, type Player, type Pos, type Scouting } from "./players";

/**
 * The Moves board: who is leaving where, which schools that leaves without a
 * player at a position (an open spot), and who could fill it.
 */

export const spotKey = (school: string, pos: Pos) => `${school}|${pos}`;

/** The school a player has committed to: set on the Moves board, or typed as "Committed to Auburn" (by hand or from a call note). */
export function committedTo(p: Player, schools: School[]): string | null {
  if (p.transferTo) return p.transferTo;
  const m = p.transfer?.match(/^\s*(?:committed|transferring|going|signed)\s+(?:to|with)\s+(.+?)\s*$/i);
  if (!m) return null;
  const name = m[1].toLowerCase();
  return schools.find((s) => s.name.toLowerCase() === name)?.id ?? null;
}

/** Why a player won't be at their school next season, or null if they're staying. */
export function leavingWhy(p: Player, schools: School[]): string | null {
  if (nflBound(p)) return NFL_BOUND;
  const to = committedTo(p, schools);
  if (to && to !== p.school) return `Going to ${schools.find((s) => s.id === to)?.name ?? "another school"}`;
  if (p.transfer) return p.transfer;
  return null;
}

/** Players with 0 years of eligibility left are NFL bound: they leave their spot open but never go into the transfer portal moves. */
export const NFL_BOUND = "NFL bound";
export const nflBound = (p: Player) => yearsLeft(p) === 0;

export type SpotKind = "open" | "starter" | "none";
export const SPOT_LABEL: Record<SpotKind, string> = { open: "Open spot", starter: "Starter leaving", none: "Nobody on file" };

export interface Spot {
  school: School;
  pos: Pos;
  /** open: nobody left for next season. starter: the starter is leaving but a backup stays. none: no player on file at all. */
  kind: SpotKind;
  leaving: { p: Player; why: string }[];
  staying: Player[];
  /** Players committed here. */
  incoming: Player[];
  /** Players who already moved away from here. */
  movedOut: { p: Player | undefined; to: string; date: string }[];
  matches: Match[];
  markedOpen: boolean;
}

/** Every school with a hole at this position, worst first. */
export function openSpots(sc: Scouting, pos: Pos): Spot[] {
  const schools = allSchools(sc);
  const byId = new Map(schools.map((s) => [s.id, s]));
  const players = sc.players.filter((p) => p.name && p.pos === pos);
  const here = new Map<string, Player[]>();
  const incoming = new Map<string, Player[]>();
  for (const p of players) {
    (here.get(p.school) ?? here.set(p.school, []).get(p.school)!).push(p);
    const to = committedTo(p, schools);
    if (to && to !== p.school && !nflBound(p)) (incoming.get(to) ?? incoming.set(to, []).get(to)!).push(p);
  }
  const playerById = new Map(sc.players.map((p) => [p.id, p]));
  const moves = (sc.moves ?? []).filter((m) => m.pos === pos);
  const matches = (sc.matches ?? []).filter((m) => playerById.get(m.player)?.pos === pos);
  const marks = sc.spots ?? {};

  // Schools worth checking: any with a player at this position, any someone moved away from, any marked by hand, and every FBS/FCS school.
  const ids = new Set<string>([...here.keys(), ...moves.map((m) => m.from)]);
  for (const k of Object.keys(marks)) if (k.endsWith(`|${pos}`)) ids.add(k.slice(0, -pos.length - 1));
  for (const s of schools) if (s.division === "FBS" || s.division === "FCS") ids.add(s.id);

  const out: Spot[] = [];
  for (const id of ids) {
    const school = byId.get(id);
    if (!school) continue;
    const mark = marks[spotKey(id, pos)];
    const at = here.get(id) ?? [];
    const leaving = at.flatMap((p) => { const why = leavingWhy(p, schools); return why ? [{ p, why }] : []; });
    const staying = at.filter((p) => !leaving.some((l) => l.p.id === p.id));
    const inc = incoming.get(id) ?? [];
    const movedOut = moves.filter((m) => m.from === id).map((m) => ({ p: playerById.get(m.player), to: byId.get(m.to)?.name ?? "another school", date: m.date }));
    let kind: SpotKind | null = null;
    if (mark === "open") kind = "open";
    else if (mark === "filled" || inc.length) kind = null;
    else if (!staying.length && (leaving.length || movedOut.length)) kind = "open";
    else if (!at.length) kind = "none";
    else if (leaving.some((l) => l.p.depth === "Starter")) kind = "starter";
    if (!kind) continue;
    out.push({ school, pos, kind, leaving, staying, incoming: inc, movedOut, matches: matches.filter((m) => m.school === id), markedOpen: mark === "open" });
  }
  const order: Record<SpotKind, number> = { open: 0, starter: 1, none: 2 };
  const div: Record<string, number> = { FBS: 0, FCS: 1, D2: 2, D3: 3, Other: 4 };
  return out.sort((a, b) => order[a.kind] - order[b.kind] || div[a.school.division] - div[b.school.division] || a.school.name.localeCompare(b.school.name));
}

/** Players at this position who could fill a spot: moving (open to it or in the portal), not committed anywhere yet, with eligibility left. */
export function available(sc: Scouting, pos: Pos): Player[] {
  const schools = allSchools(sc);
  return sc.players
    .filter((p) => p.name && p.pos === pos && p.transfer && !committedTo(p, schools) && !nflBound(p))
    .sort(byBest);
}

/** Best first: rating, then years left, then All-American, then starter. */
export function byBest(a: Player, b: Player) {
  return (overall(b) ?? -1) - (overall(a) ?? -1) || (yearsLeft(b) ?? -1) - (yearsLeft(a) ?? -1)
    || Number(b.allAmerican) - Number(a.allAmerican) || Number(b.depth === "Starter") - Number(a.depth === "Starter");
}

/** The best few available players for a spot that aren't already paired with it. Same state and same division count a little. */
export function ideasFor(spot: Spot, pool: Player[], sc: Scouting, n = 3): Player[] {
  const schools = allSchools(sc);
  const from = (p: Player) => schools.find((s) => s.id === p.school);
  const taken = new Set(spot.matches.map((m) => m.player));
  const score = (p: Player) => (overall(p) ?? 50) + (yearsLeft(p) ?? 0) * 4
    + (from(p)?.state === spot.school.state ? 8 : 0) + (from(p)?.division === spot.school.division ? 5 : 0);
  return pool.filter((p) => !taken.has(p.id) && p.school !== spot.school.id).sort((a, b) => score(b) - score(a)).slice(0, n);
}

const today = () => new Date().toISOString().slice(0, 10);

// Edits. Each takes the scouting draft from useScouting().edit.

export function pair(s: Scouting, player: string, school: string) {
  s.matches ??= [];
  if (!s.matches.some((m) => m.player === player && m.school === school)) s.matches.push({ id: newId("m"), player, school, stage: "Pitched", date: today() });
}
export function setStage(s: Scouting, id: string, stage: Match["stage"]) {
  const m = s.matches?.find((x) => x.id === id);
  if (m) m.stage = stage;
}
export function unpair(s: Scouting, id: string) {
  s.matches = (s.matches ?? []).filter((m) => m.id !== id);
}
/** They've committed: the spot there fills, and their other pairings are cleared. */
export function commit(s: Scouting, player: string, school: string, schoolName: string) {
  const p = s.players.find((x) => x.id === player);
  if (!p) return;
  p.transferTo = school;
  p.transfer = `Committed to ${schoolName}`;
  s.matches = (s.matches ?? []).filter((m) => m.player !== player);
}
/** Move a player for real: new school, old one into past schools, and a line in the history. Their old spot opens if nobody's left. */
export function finishMove(s: Scouting, player: string, to: string) {
  const p = s.players.find((x) => x.id === player);
  if (!p || !to || p.school === to) return;
  const from = p.school;
  if (from) p.priorSchools = [from, ...p.priorSchools.filter((x) => x !== from)];
  p.school = to;
  p.transfer = null;
  p.transferTo = null;
  p.depth = null;
  s.matches = (s.matches ?? []).filter((m) => m.player !== player);
  (s.moves ??= []).unshift({ id: newId("mv"), player, pos: p.pos, from, to, date: today() });
}
/** Take a finished move back: they're back at the old school, still committed to the new one. */
export function undoMove(s: Scouting, id: string) {
  const m = s.moves?.find((x) => x.id === id);
  if (!m) return;
  const p = s.players.find((x) => x.id === m.player);
  if (p && p.school === m.to) {
    p.school = m.from;
    p.priorSchools = p.priorSchools.filter((x) => x !== m.from);
    p.transferTo = m.to;
    p.transfer = `Committed to ${allSchools(s).find((x) => x.id === m.to)?.name ?? "new school"}`;
  }
  s.moves = (s.moves ?? []).filter((x) => x.id !== id);
}
export function markSpot(s: Scouting, school: string, pos: Pos, mark: "open" | "filled" | null) {
  s.spots ??= {};
  if (mark) s.spots[spotKey(school, pos)] = mark;
  else delete s.spots[spotKey(school, pos)];
}
