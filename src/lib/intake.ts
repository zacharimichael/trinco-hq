import type { Change } from "./intakeSchema";
import type { AppState, CalEvent, CallItem } from "./model";
import {
  blankStaff, newId, newPlayer, NIL_YEARS, SCHOOL_YEARS, schoolById, allSchools,
  type CoachRole, type Player, type Pos, type Scouting, type Talk,
} from "./players";

export type { Change };

/**
 * AI call notes: z types what was said on a call, the AI reads it and suggests
 * changes (this player's profile, other players, depth charts, NIL pay, coach
 * contacts, people to call back, calendar dates). z ticks what's right and saves.
 */

type Kind = "text" | "int" | "num" | "bool" | "pick" | "school" | "list";
/** Profile boxes the AI can fill: key, what it is, and how to read the value. */
export const FIELDS: Record<string, { label: string; kind: Kind; options?: readonly string[]; min?: number; max?: number; hint?: string }> = {
  name: { label: "Name", kind: "text" },
  pos: { label: "Position", kind: "pick", options: ["LS", "K", "P"] },
  school: { label: "School now", kind: "school" },
  year: { label: "Year in school", kind: "pick", options: SCHOOL_YEARS },
  priorSchools: { label: "Add a past school", kind: "list" },
  height: { label: "Height", kind: "int", min: 48, max: 90, hint: "total inches" },
  weight: { label: "Weight", kind: "int", min: 100, max: 400, hint: "lbs" },
  depth: { label: "Depth chart role", kind: "pick", options: ["Starter", "Backup", "None"] },
  allAmerican: { label: "All-American", kind: "bool" },
  allConference: { label: "All-Conference", kind: "bool" },
  client: { label: "Signed with us", kind: "bool" },
  transfer: { label: "Transferring", kind: "text", hint: "\"Open to transferring\" if willing to move, \"In the portal\" once entered, or e.g. \"Committed to Auburn\"; \"\" if staying" },
  lsRating: { label: "Long snapper rating", kind: "int", min: 1, max: 99 },
  kRating: { label: "Kicker rating", kind: "int", min: 1, max: 99 },
  pRating: { label: "Punter rating", kind: "int", min: 1, max: 99 },
  system: { label: "Snapping system", kind: "pick", options: ["Pro style", "Free release", "Hybrid"] },
  forty: { label: "40-yard dash", kind: "num", min: 3.5, max: 7, hint: "seconds" },
  bench: { label: "225 lb bench reps", kind: "int", min: 0, max: 60 },
  snapAcc: { label: "Snap accuracy", kind: "int", min: 1, max: 20 },
  snapSpeed: { label: "Snap speed", kind: "int", min: 1, max: 20 },
  kPower: { label: "Kick power", kind: "int", min: 1, max: 20 },
  kAcc: { label: "Kick accuracy", kind: "int", min: 1, max: 20 },
  foot: { label: "Kicking foot", kind: "pick", options: ["Right", "Left"] },
  kicksOff: { label: "Kicks off", kind: "bool" },
  pPower: { label: "Punt power", kind: "int", min: 1, max: 20 },
  pAcc: { label: "Punt accuracy", kind: "int", min: 1, max: 20 },
  getOff: { label: "Punt get-off time", kind: "int", min: 1, max: 20 },
  puntType: { label: "Punt type", kind: "pick", options: ["Wobbly", "Spiral", "End over end"] },
  holds: { label: "Holds", kind: "bool" },
  spot: { label: "Punts from", kind: "pick", options: ["Sideline", "Middle of field", "Numbers"] },
};

export const WHO_LABEL: Record<Talk["who"], string> = {
  Player: "Player", Parent: "Parent", HC: "Head coach", GM: "GM", ST: "Special teams coach", HSC: "HS coach", Other: "Other",
};

/** What the AI needs to know to file a note: this player in full, everyone else in brief, and what's already on the call list. */
export function buildContext(s: AppState, playerId: string) {
  const sc = s.scouting;
  const school = schoolById(sc);
  const p = sc.players.find((x) => x.id === playerId);
  const brief = (x: Player) => ({
    id: x.id, name: x.name, pos: x.pos, school: school(x.school)?.name ?? "", year: x.year ?? null, depth: x.depth,
    nil: x.nil, transfer: x.transfer ?? null,
  });
  const full = p && (({ film, talks, hsCoach, ...rest }) => ({ ...rest, school: school(rest.school)?.name ?? "", recentCalls: talks.slice(0, 5) }))(p); // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    player: full ?? null,
    schoolCoaches: p ? sc.staff[p.school] ?? null : null,
    otherPlayers: sc.players.filter((x) => x.id !== playerId && x.name).map(brief),
    openCalls: (s.calls ?? []).filter((c) => !c.done).map(({ name, why, due }) => ({ name, why, due })),
    addedSchools: sc.extraSchools.map((x) => x.name),
    upcomingEvents: (s.events ?? []).map(({ date, title }) => ({ date, title })),
  };
}
export type IntakeContext = ReturnType<typeof buildContext>;

/** Reads a value the AI gave for a profile box. Undefined means it couldn't be read, so the change is skipped. */
export function readValue(field: string, raw: string | null, sc: Scouting): unknown {
  const f = FIELDS[field];
  if (!f || raw == null) return undefined;
  const v = raw.trim();
  switch (f.kind) {
    case "text": return v || null;
    case "int": case "num": {
      const n = Number(v.replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) return undefined;
      return f.kind === "int" ? Math.round(n) : n;
    }
    case "bool": return /^(true|yes|y)$/i.test(v) ? true : /^(false|no|n)$/i.test(v) ? false : undefined;
    case "pick": {
      if (field === "depth" && /^none$/i.test(v)) return null;
      const hit = f.options!.find((o) => o.toLowerCase() === v.toLowerCase());
      return hit === undefined ? undefined : field === "pos" ? (hit as Pos) : hit;
    }
    case "school": return findSchool(sc, v)?.id;
    case "list": return v || undefined;
  }
}

export function findSchool(sc: Scouting, name: string | null) {
  if (!name) return undefined;
  const n = name.trim().toLowerCase().replace(/^the\s+/, "").replace(/^university of\s+/, "");
  const all = allSchools(sc);
  return all.find((x) => x.name.toLowerCase() === n) ?? all.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
}

/** A change is usable when it points somewhere real. The review list only shows usable ones. */
export function usable(c: Change, sc: Scouting, newRefs: Set<string>): boolean {
  const known = (id: string) => sc.players.some((p) => p.id === id) || newRefs.has(id);
  switch (c.kind) {
    case "set": return known(c.player) && !!c.field && readValue(c.field, c.value, sc) !== undefined;
    case "nil": return known(c.player) && c.amount != null && c.amount >= 0 && c.year != null && c.year >= 1 && c.year <= NIL_YEARS;
    case "fact": return known(c.player) && !!(c.label || c.value);
    case "new_player": return !!c.player && !!c.name?.trim();
    case "call": return !!(c.name || c.label);
    case "event": return !!(c.label || c.text) && /^\d{4}-\d{2}-\d{2}$/.test(c.date ?? "");
    case "coach": return !!c.role && !!(c.name || c.phone || c.email) && !!findSchool(sc, c.school);
  }
}

/**
 * Files the ticked changes. The note itself always goes into this player's call log;
 * players it mentions get it as a fact so their profiles show where the news came from.
 */
export function applyChanges(d: AppState, opts: { playerId: string; who: Talk["who"]; when: string; note: string; changes: Change[] }) {
  const sc = d.scouting;
  const me = sc.players.find((p) => p.id === opts.playerId);
  const from = `Call with ${me?.name || "a player"} (${WHO_LABEL[opts.who].toLowerCase()})`;
  const ids = new Map<string, string>();
  const idOf = (ref: string) => ids.get(ref) ?? ref;
  const player = (ref: string) => sc.players.find((p) => p.id === idOf(ref));

  for (const c of opts.changes.filter((x) => x.kind === "new_player")) {
    const pos = (c.pos ?? "LS") as Pos;
    const p = newPlayer(pos, findSchool(sc, c.school)?.id ?? "");
    p.name = c.name!.trim();
    sc.players.push(p);
    ids.set(c.player, p.id);
  }
  for (const c of opts.changes) {
    const p = c.player ? player(c.player) : undefined;
    switch (c.kind) {
      case "set": {
        if (!p || !c.field) break;
        const v = readValue(c.field, c.value, sc);
        if (v === undefined) break;
        if (c.field === "priorSchools") { if (!p.priorSchools.includes(v as string)) p.priorSchools.push(v as string); }
        else (p as unknown as Record<string, unknown>)[c.field] = v;
        break;
      }
      case "nil":
        if (p && c.year && c.amount != null) p.nil = p.nil.map((n, i) => (i === c.year! - 1 ? Math.round(c.amount!) : n));
        break;
      case "fact":
        if (p) (p.facts ??= []).unshift({ id: newId("f"), label: c.label ?? "", value: c.value ?? "", date: opts.when, from: p.id === opts.playerId ? WHO_LABEL[opts.who] : from });
        break;
      case "call": {
        const item: CallItem = { id: newId("c"), name: c.name ?? "", phone: c.phone ?? "", why: c.label ?? c.text, due: c.date && /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? c.date : null, player: p?.id ?? null, done: false };
        (d.calls ??= []).push(item);
        break;
      }
      case "event": {
        const ev: CalEvent = { id: newId("e"), date: c.date!, time: c.time && /^\d{2}:\d{2}$/.test(c.time) ? c.time : null, title: c.label ?? c.text, player: p?.id ?? null };
        (d.events ??= []).push(ev);
        break;
      }
      case "coach": {
        const sch = findSchool(sc, c.school);
        if (!sch || !c.role) break;
        const staff = sc.staff[sch.id] ?? blankStaff();
        const role = c.role as CoachRole;
        const was = staff[role];
        staff[role] = { name: c.name ?? was.name, phone: c.phone ?? was.phone, email: c.email ?? was.email };
        if (c.value && /decision|decider/i.test(c.value)) staff.decider = role;
        sc.staff[sch.id] = staff;
        break;
      }
    }
  }
  // Players the note mentions get a pointer back to it, unless a fact already says where it came from.
  const touched = new Set(opts.changes.map((c) => idOf(c.player)).filter((id) => id && id !== opts.playerId));
  for (const id of touched) {
    const p = sc.players.find((x) => x.id === id);
    if (p && !opts.changes.some((c) => c.kind === "fact" && idOf(c.player) === id))
      (p.facts ??= []).unshift({ id: newId("f"), label: "Heard on a call", value: opts.changes.filter((c) => idOf(c.player) === id).map((c) => c.text).join(". "), date: opts.when, from });
  }
  if (me) me.talks = [...me.talks, { date: opts.when, who: opts.who, note: opts.note.trim() }].sort((a, b) => b.date.localeCompare(a.date));
}
