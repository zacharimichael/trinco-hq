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

/** Example players for demo mode. Made-up people at real schools. */
export function seedScouting(): Scouting {
  const p = (pos: Pos, school: string, x: Partial<Player>): Player => ({ ...newPlayer(pos, slug(`FBS-${school}`)), ...x, id: slug(`${pos}-${x.name}`) });
  const fcs = (name: string) => slug(`FCS-${name}`);
  return {
    players: [
      p("LS", "Florida", { name: "Tyler Brandt", age: 21, height: 74, weight: 235, hs: "Plant High", hsState: "FL", lsRating: 88, system: "Pro style", forty: 4.92, bench: 22, snapAcc: 18, snapSpeed: 17, spiral: "Clean", nil: [0, 5000, 12000, null, null, null], depth: "Starter", allConference: true, client: true, otherPos: ["TE"], otherSports: "Lacrosse" }),
      p("K", "Florida", { name: "Marco Velez", age: 20, height: 71, weight: 190, hs: "Miami Christian", hsState: "FL", kRating: 84, kPower: 17, kAcc: 16, foot: "Right", kicksOff: true, nil: [2500, 15000, null, null, null, null], depth: "Starter", client: true, otherSports: "Soccer" }),
      p("P", "Florida", { name: "Ben Whitaker", age: 22, height: 76, weight: 215, hs: "Brisbane Grammar", hsState: "", pRating: 79, pPower: 16, pAcc: 15, getOff: 15, puntType: "Spiral", holds: true, spot: "Numbers", kicksOff: false, nil: [0, 0, 4000, 8000, null, null], depth: "Starter" }),
      p("K", "Florida", { name: "Owen Park", age: 19, height: 70, weight: 180, hs: "Lake Mary", hsState: "FL", kRating: 70, kPower: 14, kAcc: 13, foot: "Left", kicksOff: false, nil: [1000, null, null, null, null, null], depth: "Backup" }),
      p("LS", "Texas", { name: "Caleb Moore", age: 22, height: 73, weight: 240, hs: "Allen High", hsState: "TX", lsRating: 92, system: "Free release", forty: 4.85, bench: 25, snapAcc: 19, snapSpeed: 18, spiral: "Clean", nil: [5000, 20000, 35000, 40000, null, null], depth: "Starter", allAmerican: true, allConference: true, otherPos: ["LB"] }),
      p("KP", "Texas", { name: "Luke Harmon", age: 21, height: 73, weight: 200, hs: "Westlake", hsState: "TX", kRating: 81, pRating: 83, kPower: 16, kAcc: 15, pPower: 17, pAcc: 16, getOff: 16, foot: "Right", puntType: "Spiral", kicksOff: true, holds: true, spot: "Middle of field", nil: [3000, 18000, 30000, null, null, null], depth: "Starter", allConference: true }),
      p("K", "Ohio State", { name: "Grant Ellison", age: 21, height: 72, weight: 195, hs: "St. Xavier", hsState: "OH", kRating: 91, kPower: 19, kAcc: 18, foot: "Right", kicksOff: true, nil: [10000, 40000, 65000, null, null, null], depth: "Starter", allAmerican: true, allConference: true, client: true }),
      p("P", "Georgia", { name: "Henry Cole", age: 23, height: 75, weight: 210, hs: "Melbourne High", hsState: "", pRating: 87, pPower: 18, pAcc: 17, getOff: 17, puntType: "Spiral", holds: true, spot: "Sideline", kicksOff: false, nil: [0, 12000, 25000, 30000, 30000, null], depth: "Starter", allAmerican: true, allConference: true }),
      { ...p("LS", "", { name: "Drew Sutton", age: 21, height: 72, weight: 230, hs: "Fargo South", hsState: "ND", lsRating: 85, system: "Pro style", forty: 5.01, bench: 20, snapAcc: 17, snapSpeed: 16, spiral: "Wobble", nil: [0, 2500, 6000, null, null, null], depth: "Starter", allConference: true }), school: fcs("North Dakota State") },
      { ...p("K", "", { name: "Isaiah Grant", age: 20, height: 69, weight: 175, hs: "Bozeman High", hsState: "MT", kRating: 80, kPower: 18, kAcc: 14, foot: "Left", kicksOff: true, nil: [0, 3000, null, null, null, null], depth: "Starter", client: true }), school: fcs("Montana State") },
    ],
    staff: {
      [slug("FBS-Florida")]: {
        HC: { name: "Head coach (example)", phone: "(352) 555-0100", email: "hc@example.com" },
        GM: { name: "GM (example)", phone: "(352) 555-0101", email: "gm@example.com" },
        ST: { name: "Special teams coach (example)", phone: "(352) 555-0102", email: "st@example.com" },
        decider: "GM",
      },
    },
    extraSchools: [],
  };
}
