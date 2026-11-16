import { SCHOOLS, slug, type School } from "@/data/schools";
import { HEAD_COACHES } from "@/data/head-coaches";
import { ST_COACHES } from "@/data/special-teams-coaches";
import { GENERAL_MANAGERS } from "@/data/general-managers";
import { ROSTER_CHECKED_DATE, ROSTER_PLAYERS, ROSTER_SOURCE } from "@/data/roster-specialists";
import { HS_LONG_SNAPPERS } from "@/data/hs-long-snappers";
import { JUCO_LONG_SNAPPERS } from "@/data/juco-long-snappers";

/** Specialist positions. K+P is no longer offered, but players saved as K+P keep both kicker and punter ratings. */
export type Pos = "LS" | "K" | "P" | "KP";
/**
 * The positions the app shows. Kickers and punters are hidden for now (z, 2026-11-04): saved K, P and K+P players stay in the
 * database untouched, they just don't show anywhere and no new ones are added. To bring them back, put "K" and "P" back here.
 */
export const POSITIONS: Pos[] = ["LS"];
/** True when this player's position is one the app shows right now. */
export const shownPos = (p: { pos: Pos }) => POSITIONS.includes(p.pos);
/** The positions to show for these players: the ones offered, plus K+P only if it's offered and someone is still saved as K+P. */
export const positionsFor = (ps: { pos: Pos }[]): Pos[] =>
  POSITIONS.includes("K") && POSITIONS.includes("P") && ps.some((p) => p.pos === "KP") ? [...POSITIONS, "KP"] : POSITIONS;
export const POS_LABEL: Record<Pos, string> = { LS: "Long snapper", K: "Kicker", P: "Punter", KP: "K+P" };
export const POS_SHORT: Record<Pos, string> = { LS: "LS", K: "K", P: "P", KP: "K+P" };
export const kicks = (p: Pos) => p === "K" || p === "KP";
export const punts = (p: Pos) => p === "P" || p === "KP";

export const HS_POSITIONS = ["QB", "RB", "WR", "TE", "OL", "S", "CB", "LB", "DL"] as const;
export const NIL_YEARS = 6;

export const SCHOOL_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Redshirt Freshman", "Redshirt Sophomore", "Redshirt Junior", "Redshirt Senior"] as const;
export type SchoolYear = (typeof SCHOOL_YEARS)[number];
const YEAR_SHORT: Record<SchoolYear, string> = {
  Freshman: "Fr", Sophomore: "So", Junior: "Jr", Senior: "Sr",
  "Redshirt Freshman": "RS Fr", "Redshirt Sophomore": "RS So", "Redshirt Junior": "RS Jr", "Redshirt Senior": "RS Sr",
};
export const yearShort = (y: SchoolYear | null | undefined) => (y ? YEAR_SHORT[y] : "");

/** Years of eligibility left after this season, guessed from year in school. A redshirting freshman has 4; set that by hand. */
const LEFT_BY_YEAR: Record<SchoolYear, number> = {
  Senior: 0, "Redshirt Senior": 0, Junior: 1, "Redshirt Junior": 1,
  Sophomore: 2, "Redshirt Sophomore": 2, Freshman: 3, "Redshirt Freshman": 3,
};
export const YEARS_LEFT = [0, 1, 2, 3, 4] as const;
/** Years left after this season: what was typed, or a guess from year in school. Null when neither is known. */
export const yearsLeft = (p: { yearsLeft?: number | null; year?: SchoolYear | null }): number | null =>
  p.yearsLeft ?? (p.year ? LEFT_BY_YEAR[p.year] : null);
/** High school classes shown on Classes, next to the college years-left groups. */
export const HS_CLASS_YEARS = [2027, 2028] as const;
/** A high school player: has a graduating class and no college school yet. */
export const isHs = (p: { hsClass?: number | null }) => p.hsClass != null;
/** A junior college player. Shown in the JUCO group on Classes, not in the years-left groups. */
export const isJuco = (p: { jucoSchool?: string | null }) => !!p.jucoSchool?.trim();
export const hsClassText = (y: number) => `HS Class of ${y}`;
export const yearsLeftText = (n: number) => (n === 0 ? "Graduating" : `${n} year${n === 1 ? "" : "s"} left`);

export interface Contact { name: string; phone: string; email: string }
/** Quick picks for a player's transfer status. Anything else can be typed, e.g. "Committed to Auburn". */
export const TRANSFER_PICKS = ["Open to transferring", "In the portal"] as const;

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const blankContact = (): Contact => ({ name: "", phone: "", email: "" });

export type CoachRole = "HC" | "GM" | "ST";
export const COACH_LABEL: Record<CoachRole, string> = { HC: "Head coach", GM: "General manager", ST: "Special teams coach" };
export interface SchoolStaff { HC: Contact; GM: Contact; ST: Contact; decider: CoachRole | null }
export const blankStaff = (): SchoolStaff => ({ HC: blankContact(), GM: blankContact(), ST: blankContact(), decider: null });
/** A school's saved contacts, with the 2026 head coach's, GM's and special teams coordinator's names filled in when none has been typed. */
export function staffFor(staff: Record<string, SchoolStaff>, schoolId: string): SchoolStaff {
  let s = staff[schoolId] ?? blankStaff();
  const hc = HEAD_COACHES[schoolId], st = ST_COACHES[schoolId]?.name, gm = GENERAL_MANAGERS[schoolId]?.name;
  if (hc && !s.HC.name.trim()) s = { ...s, HC: { ...s.HC, name: hc } };
  if (st && !s.ST.name.trim()) s = { ...s, ST: { ...s.ST, name: st } };
  if (gm && !s.GM.name.trim()) s = { ...s, GM: { ...s.GM, name: gm } };
  return s;
}
/** A web search for a school's coach, for when we don't have the name. */
export const coachSearchUrl = (school: string, role: CoachRole) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${school} football ${role === "HC" ? "head coach" : role === "ST" ? "special teams coordinator" : "general manager"} 2026`)}`;

export interface Film {
  kind: "Hudl" | "OnForm" | "Video" | "Link";
  url: string;
  name?: string;
  /** Uploaded video: a storage path once signed in. In demo mode the video only lasts until refresh. */
  path?: string;
}

/** One entry in a player's call log. */
export interface Talk { date: string; who: CoachRole | "Player" | "Parent" | "HSC" | "Other"; note: string }

/** Something learned about a player that has no box of its own, e.g. "Visiting Auburn" or "Wants $20k". */
export interface Fact { id: string; label: string; value: string; date: string; from: string }

export interface Player {
  id: string;
  pos: Pos;
  name: string;
  age: number | null;
  /** Year in school. */
  year?: SchoolYear | null;
  /** Total inches. */
  height: number | null;
  weight: number | null;
  /** School id from SCHOOLS (or a school you added). */
  school: string;
  priorSchools: string[];
  hs: string;
  hsState: string;
  hsCoach: Contact;
  playedOther?: boolean | null;
  otherPos: string[];
  otherSportsYes?: boolean | null;
  otherSports: string;

  /** The player's own overall ratings, 1-99 (self-assessed). */
  lsRating?: number | null;
  kRating?: number | null;
  pRating?: number | null;
  /** Coaches rating, 1-99: what a coach (or we) rate them, kept apart from the player's own number. */
  coachRating?: number | null;

  // Long snapper
  system?: "Pro style" | "Free release" | "Hybrid" | null;
  forty?: number | null;
  bench?: number | null;
  snapAcc?: number | null;
  /** Snap time in seconds, 0.80 (slow) to 0.60 (fast). Old saves used a 1-20 rating; see snapTime(). */
  snapSpeed?: number | null;
  spiral?: "Loose" | "Wobble" | "Clean" | null;

  // Kicker
  kPower?: number | null;
  kAcc?: number | null;
  foot?: "Right" | "Left" | null;

  // Kicker and punter
  kicksOff?: boolean | null;

  // Punter
  pPower?: number | null;
  pAcc?: number | null;
  getOff?: number | null;
  puntType?: "Wobbly" | "Spiral" | "End over end" | null;
  holds?: boolean | null;
  spot?: "Sideline" | "Middle of field" | "Numbers" | null;

  /** NIL paid each college year (year 1 to year 6). */
  nil: (number | null)[];
  film: Film[];
  talks: Talk[];
  /** Notes pulled out of calls that don't fit a box above. */
  facts?: Fact[];
  /** e.g. "In the portal" or "Transferring to Auburn". Empty when staying put. */
  transfer?: string | null;
  /** School id they've committed to. Set from the Moves board; cleared once they've moved. */
  transferTo?: string | null;
  /** Schools the player is interested in transferring to, as typed (school names). */
  wantSchools?: string[];
  /** Years of eligibility left after this season (0-4), when typed. Otherwise guessed from year in school; see yearsLeft(). */
  yearsLeft?: number | null;

  depth: "Starter" | "Backup" | null;
  allAmerican: boolean;
  allConference: boolean;
  /** Signed with the agency. Clients count toward "my athletes" on the map. */
  client: boolean;
  /** Where a player added from a public roster came from. Players added by hand have none. */
  source?: { label: string; url: string; date: string } | null;

  // High school prospects (no college school yet)
  /** High school graduating class, e.g. 2027. Set only for high school players. */
  hsClass?: number | null;
  /** Number on Kohl's Kicking's national list for the class, when ranked there. */
  kohlsRank?: number | null;
  /** Commitment or offers, e.g. "Committed: Notre Dame" or "Offered: Air Force". */
  recruiting?: string | null;
  /** Public lists the player is on, e.g. ["Kohl's", "Rubio"]. */
  lists?: string[];
  /** Junior college (JUCO) they play at now, typed as text, e.g. "Iowa Western CC (IA)". Set only for JUCO players. */
  jucoSchool?: string | null;
}

/** Scouting data the agency shares: players, school staff contacts and any schools added by hand. */
export interface Scouting {
  players: Player[];
  staff: Record<string, SchoolStaff>;
  extraSchools: School[];
  /** Players the agency is pairing with open spots (Moves board). */
  matches?: Match[];
  /** Finished moves, newest first: who went from where to where. */
  moves?: Move[];
  /** Hand-picked top ten per class, best first, keyed "pos|yearsLeft" (e.g. "LS|0"). */
  top10?: Record<string, string[]>;
  /** Spots marked open or filled by hand, keyed "schoolId|pos". */
  spots?: Record<string, "open" | "filled">;
}

/** A player the agency is pitching to a school with an open spot. Committing moves them onto the player as transferTo. */
export interface Match { id: string; player: string; school: string; stage: "Idea" | "Pitched" | "Connected" | "Interested"; date: string }
/** A finished move from one school to another. */
export interface Move { id: string; player: string; pos: Pos; from: string; to: string; date: string }

export function newPlayer(pos: Pos, school = ""): Player {
  return {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    pos, name: "", age: null, height: null, weight: null, school, priorSchools: [],
    hs: "", hsState: "", hsCoach: blankContact(), otherPos: [], otherSports: "",
    nil: Array(NIL_YEARS).fill(null), film: [], talks: [],
    depth: null, allAmerican: false, allConference: false, client: false,
  };
}

export const allSchools = (s: Scouting) => [...SCHOOLS, ...s.extraSchools];
export const schoolById = (s: Scouting) => {
  const map = new Map(allSchools(s).map((x) => [x.id, x]));
  return (id: string) => map.get(id);
};
export const customSchool = (name: string, division: School["division"], conference: string, state: string): School =>
  ({ id: slug(`${division}-${name}`), name, division, conference, state });

/** Most recent year with an amount. That's what they're getting paid now. */
export const nilNow = (p: Player) => [...p.nil].reverse().find((n) => n != null) ?? 0;
export const nilTotal = (p: Player) => p.nil.reduce<number>((a, n) => a + (n ?? 0), 0);
export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
export const heightText = (h: number | null) => (h ? `${Math.floor(h / 12)}'${h % 12}"` : "—");

/** The coaches rating, 1-99, or null. */
export const coachRating = (p: Player): number | null => p.coachRating ?? null;
/** Ratings are off (z, 2026-11-15): the app doesn't show, ask for or rank by them. Saved ratings stay in the data. Set true to bring them back. */
export const SHOW_RATINGS = false;
/** Best number we have for ranking: the coaches rating when there is one, otherwise the player's own. Null while ratings are off. */
export const bestRating = (p: Player): number | null => (SHOW_RATINGS ? coachRating(p) ?? overall(p) : null);
/** Both ratings in a few words, e.g. "Player 82 · Coach 88". Empty when neither is set or ratings are off. */
export const ratingsText = (p: Player) => (SHOW_RATINGS ? [overall(p) != null && `Player ${overall(p)}`, coachRating(p) != null && `Coach ${coachRating(p)}`].filter(Boolean).join(" · ") : "");

/** The player's own (self-assessed) 1-99 rating for their position (K+P averages both). */
export function overall(p: Player): number | null {
  if (p.pos === "LS") return p.lsRating ?? null;
  if (p.pos === "K") return p.kRating ?? null;
  if (p.pos === "P") return p.pRating ?? null;
  const both = [p.kRating, p.pRating].filter((n): n is number => n != null);
  return both.length ? Math.round(both.reduce((a, b) => a + b, 0) / both.length) : null;
}

/** My athletes per state: athletes on the to-do list plus signed players, by their school's state. */
export function athletesByState(athletes: { name: string; state: string }[], s: Scouting) {
  const school = schoolById(s);
  const out: Record<string, { name: string; href?: string; school?: string }[]> = {};
  const add = (code: string | undefined, a: { name: string; href?: string; school?: string }) => { if (code) (out[code] ??= []).push(a); };
  athletes.forEach((a) => add(a.state, { name: a.name }));
  s.players.filter((p) => p.client && shownPos(p)).forEach((p) => { const sch = school(p.school); add(sch?.state, { name: p.name || "New player", href: `/players/${p.id}`, school: sch?.name }); });
  return out;
}

export const emptyScouting = (): Scouting => ({ players: [], staff: {}, extraSchools: [], matches: [], moves: [], spots: {} });

// Ids and the one school of example contacts the app used to ship as demo data.
const OLD_DEMO_PLAYERS = ["ls-tyler-brandt", "k-marco-velez", "p-ben-whitaker", "k-owen-park", "ls-caleb-moore", "kp-luke-harmon", "k-grant-ellison", "p-henry-cole", "ls-drew-sutton", "k-isaiah-grant"];

const MOVED: Record<string, string> = { "fcs-north-dakota-state": "fbs-north-dakota-state" };

/** Removes the old made-up example players from saved data, keeping everything added by hand. */
/** Snap time slider: 0.80 s on the left, 0.60 s on the right. */
export const SNAP_SLOW = 0.8;
export const SNAP_FAST = 0.6;
/** Seconds as saved now. A value of 1 or more is an old 1-20 rating: 1 becomes 0.80 s and 20 becomes 0.60 s. */
export function snapTime(v: number): number {
  const sec = v >= 1 ? SNAP_SLOW - ((Math.min(20, v) - 1) / 19) * (SNAP_SLOW - SNAP_FAST) : v;
  return Math.round(Math.min(SNAP_SLOW, Math.max(SNAP_FAST, sec)) * 100) / 100;
}

export function withoutDemoPlayers(s: Scouting | undefined): Scouting {
  if (!s) return emptyScouting();
  const staff = { ...s.staff };
  const fl = staff[slug("FBS-Florida")];
  if (fl && fl.HC.name === "Head coach (example)") delete staff[slug("FBS-Florida")];
  // Schools that moved between FCS and FBS get a new id; point saved players and contacts at it.
  for (const [from, to] of Object.entries(MOVED)) if (staff[from] && !staff[to]) { staff[to] = staff[from]; delete staff[from]; }
  const players = (s.players ?? []).filter((p) => !OLD_DEMO_PLAYERS.includes(p.id))
    .map((p) => (MOVED[p.school] ? { ...p, school: MOVED[p.school] } : p))
    .map((p) => (p.snapSpeed != null && p.snapSpeed >= 1 ? { ...p, snapSpeed: snapTime(p.snapSpeed) } : p));
  return { ...emptyScouting(), ...s, players, staff };
}

/** Real players at the shown positions from 2026 FBS and FCS rosters that aren't on the depth charts yet (same id, or same name at the same school). */
export function missingRosterPlayers(s: Scouting, pos?: "LS" | "P" | "K"): Player[] {
  const have = new Set(s.players.flatMap((p) => [p.id, `${p.school}|${p.name.trim().toLowerCase()}`]));
  return ROSTER_PLAYERS.filter((r) => (pos ? r.pos === pos : POSITIONS.includes(r.pos)) && !have.has(r.id) && !have.has(`${r.school}|${r.name.toLowerCase()}`)).map((r) => ({
    ...newPlayer(r.pos, r.school),
    id: r.id, name: r.name, year: r.year, height: r.height, weight: r.weight, priorSchools: r.priorSchools,
    source: r.checked
      ? { label: "School roster", url: r.checked, date: ROSTER_CHECKED_DATE }
      : { label: ROSTER_SOURCE.label, url: r.espn ? `https://www.espn.com/college-football/player/_/id/${r.espn}` : ROSTER_SOURCE.url, date: ROSTER_SOURCE.date },
  }));
}

/** High school long snappers (classes of 2027 and 2028) from Kohl's Kicking and Rubio lists that aren't saved yet (same id, or same name in the same class). */
export function missingHsPlayers(s: Scouting): Player[] {
  const have = new Set(s.players.flatMap((p) => [p.id, `${p.hsClass ?? ""}|${p.name.trim().toLowerCase()}`]));
  return HS_LONG_SNAPPERS.filter((r) => POSITIONS.includes("LS") && !have.has(r.id) && !have.has(`${r.hsClass}|${r.name.toLowerCase()}`)).map((r) => ({
    ...newPlayer("LS"),
    id: r.id, name: r.name, hsState: r.hsState, hsClass: r.hsClass, kohlsRank: r.kohlsRank, recruiting: r.recruiting || null,
    lists: [r.kohlsGroup != null && "Kohl's", r.rubio && "Rubio"].filter((x): x is string => !!x),
    source: r.sources[0],
  }));
}

/** JUCO long snappers from the public lists that aren't saved yet (same id, or same name at a JUCO). */
export function missingJucoPlayers(s: Scouting): Player[] {
  const have = new Set(s.players.flatMap((p) => [p.id, isJuco(p) ? `juco|${p.name.trim().toLowerCase()}` : ""]));
  return JUCO_LONG_SNAPPERS.filter((r) => POSITIONS.includes("LS") && !have.has(r.id) && !have.has(`juco|${r.name.toLowerCase()}`)).map((r) => ({
    ...newPlayer("LS"),
    id: r.id, name: r.name, hsState: r.hsState, jucoSchool: r.school, kohlsRank: null,
    recruiting: `Kohl's ${r.hsClass} HS list${r.kohlsRank != null ? ` #${r.kohlsRank}` : ""}: committed to ${r.school.replace(/ \(..\)$/, "")}`,
    lists: ["Kohl's"],
    source: { label: `Kohl's Kicking ${r.hsClass} national long snapper ratings`, url: r.url, date: "2026-11-04" },
  }));
}
