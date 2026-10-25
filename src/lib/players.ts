import { SCHOOLS, slug, type School } from "@/data/schools";

/** The four specialist positions. K+P players get both kicker and punter ratings. */
export type Pos = "LS" | "K" | "P" | "KP";
export const POSITIONS: Pos[] = ["LS", "K", "P", "KP"];
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

export interface Contact { name: string; phone: string; email: string }
export const blankContact = (): Contact => ({ name: "", phone: "", email: "" });

export type CoachRole = "HC" | "GM" | "ST";
export const COACH_LABEL: Record<CoachRole, string> = { HC: "Head coach", GM: "General manager", ST: "Special teams coach" };
export interface SchoolStaff { HC: Contact; GM: Contact; ST: Contact; decider: CoachRole | null }
export const blankStaff = (): SchoolStaff => ({ HC: blankContact(), GM: blankContact(), ST: blankContact(), decider: null });

export interface Film {
  kind: "Hudl" | "OnForm" | "Video" | "Link";
  url: string;
  name?: string;
  /** Uploaded video: a storage path once signed in. In demo mode the video only lasts until refresh. */
  path?: string;
}

export interface Talk { date: string; who: CoachRole | "Other"; note: string }

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
  hsStats: string;
  playedOther?: boolean | null;
  otherPos: string[];
  otherSportsYes?: boolean | null;
  otherSports: string;

  /** Overall ratings, 1-99. */
  lsRating?: number | null;
  kRating?: number | null;
  pRating?: number | null;

  // Long snapper
  system?: "Pro style" | "Free release" | null;
  forty?: number | null;
  bench?: number | null;
  snapAcc?: number | null;
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

  depth: "Starter" | "Backup" | null;
  allAmerican: boolean;
  allConference: boolean;
  /** Signed with the agency. Clients count toward "my athletes" on the map. */
  client: boolean;
}

/** Scouting data the agency shares: players, school staff contacts and any schools added by hand. */
export interface Scouting {
  players: Player[];
  staff: Record<string, SchoolStaff>;
  extraSchools: School[];
}

export function newPlayer(pos: Pos, school = ""): Player {
  return {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    pos, name: "", age: null, height: null, weight: null, school, priorSchools: [],
    hs: "", hsState: "", hsCoach: blankContact(), hsStats: "", otherPos: [], otherSports: "",
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

/** One headline number for sorting: the position's 1-99 rating (K+P averages both). */
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
  s.players.filter((p) => p.client).forEach((p) => { const sch = school(p.school); add(sch?.state, { name: p.name || "New player", href: `/players/${p.id}`, school: sch?.name }); });
  return out;
}

export const emptyScouting = (): Scouting => ({ players: [], staff: {}, extraSchools: [] });

// Ids and the one school of example contacts the app used to ship as demo data.
const OLD_DEMO_PLAYERS = ["ls-tyler-brandt", "k-marco-velez", "p-ben-whitaker", "k-owen-park", "ls-caleb-moore", "kp-luke-harmon", "k-grant-ellison", "p-henry-cole", "ls-drew-sutton", "k-isaiah-grant"];

/** Removes the old made-up example players from saved data, keeping everything added by hand. */
export function withoutDemoPlayers(s: Scouting | undefined): Scouting {
  if (!s) return emptyScouting();
  const staff = { ...s.staff };
  const fl = staff[slug("FBS-Florida")];
  if (fl && fl.HC.name === "Head coach (example)") delete staff[slug("FBS-Florida")];
  return { ...emptyScouting(), ...s, players: (s.players ?? []).filter((p) => !OLD_DEMO_PLAYERS.includes(p.id)), staff };
}
