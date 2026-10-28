import { STATE_FILES } from "@/data/states";

export type StepType =
  | "form" | "payment" | "task" | "notice" | "contract"
  | "deadline" | "recurring" | "rule" | "optional" | "info";

export interface Step {
  id: string;
  text: string;
  detail?: string;
  type: StepType | string;
  form?: string;
  amount_usd?: number;
  due_rule?: string;
  source?: string;
  /** Leave out for steps every athlete needs. "sometimes": only in some cases (like a later enrollment), so it isn't made a to-do.
   *  "pro": only for professional sports contracts, never for NIL. */
  applies?: "sometimes" | "pro";
  /** Who a notice goes to, when it isn't the school's athletic director. */
  to?: string;
}

export interface Section {
  id: "get_licensed" | "every_athlete" | "stay_compliant" | "renew" | string;
  title: string;
  steps: Step[];
}

export interface StateRules {
  state: string;
  name: string;
  license_required: boolean;
  regulator: { name: string; phone?: string; website?: string } | null;
  last_researched: string;
  attorney_reviewed: boolean;
  sections: Section[];
  /** Optional exact warning text the state requires on athlete contracts. */
  contract_warning?: string;
  /** One plain sentence for the state card. */
  summary?: string;
  /** The law this state's rules come from. type: RUAAA or UAAA (the uniform acts), own (its own law) or none. */
  law?: { type: string; name: string; source?: string };
  /** Whether the law reaches NIL-only agents, in one sentence. */
  covers_nil_agents?: string;
  /** Pending laws that could change these rules. */
  watch_list?: { item: string; status: string; impact: string; source?: string }[];
  /** What still needs confirming before these rules are final. */
  review_notes?: string[];
}

/** Every researched state. Run `npm run sync-states` to pull in new state files. */
export const RULES = STATE_FILES as Record<string, StateRules>;
export const TRACKED = Object.keys(RULES).sort();

export type StatusKey = "go" | "wip" | "stop";
export const LABEL: Record<StatusKey, string> = { go: "Licensed", wip: "In progress", stop: "Not licensed" };

export type Done = Record<string, boolean>;

const counts = (s: Step) => !["info", "rule", "optional"].includes(s.type);

export function section(code: string, id: string) {
  return RULES[code].sections.find((s) => s.id === id);
}

/** The steps that decide a state's map color. Licensed states also need the state's approval. */
export function licenseSteps(code: string): string[] {
  const steps = (section(code, "get_licensed")?.steps ?? []).filter(counts).map((s) => s.id);
  if (RULES[code].license_required) steps.push(approvalId(code));
  return steps;
}
export const approvalId = (code: string) => `${code.toLowerCase()}_approved`;

/** The step that sends the application to the state, when the state has one ("xx_submit"). */
export function submitId(code: string): string | null {
  if (!RULES[code].license_required) return null;
  return (section(code, "get_licensed")?.steps ?? []).find((s) => counts(s) && s.id.endsWith("_submit"))?.id ?? null;
}

/** True once everything that goes to the state is done, so the agent is waiting on approval.
 *  School registrations don't go to the state, so they don't hold this up. */
export function applied(code: string, done: Done) {
  if (!RULES[code].license_required) return false;
  const sub = submitId(code);
  if (sub) return !!done[sub];
  const filed = (section(code, "get_licensed")?.steps ?? []).filter((s) => counts(s) && !/school/i.test(s.text));
  return filed.length > 0 && filed.every((s) => done[s.id]);
}

/** States an agent works in: any they've started, plus any where they have an athlete. */
export function myStates(done: Done, athleteStates: string[] = []) {
  return TRACKED.filter((c) => athleteStates.includes(c) || licenseSteps(c).some((id) => done[id]));
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** Reads a renewal rule like "May 31 of each even year", "June 30 each year" or
 *  "issued_at + 2y - 30d" (needs the approval date). Null if it can't. */
export function renewDue(rule: string | undefined, issuedAt?: string, from = startOfToday()): Date | null {
  const rel = rule?.match(/issued_at\s*\+\s*(\d+)y(?:\s*-\s*(\d+)d)?/);
  if (rel) {
    if (!issuedAt) return null;
    const d = new Date(issuedAt);
    d.setHours(0, 0, 0, 0);
    while (d < from) d.setFullYear(d.getFullYear() + Number(rel[1]));
    return new Date(d.getTime() - Number(rel[2] ?? 0) * DAY);
  }
  const m = rule?.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/);
  if (!m) return null;
  const mo = MONTHS.indexOf(m[1]), day = Number(m[2]);
  const step = /even year/.test(rule!) ? 2 : /odd year/.test(rule!) ? 2 : 1;
  let y = from.getFullYear();
  if (/even year/.test(rule!) && y % 2) y++;
  if (/odd year/.test(rule!) && !(y % 2)) y++;
  let d = new Date(y, mo, day);
  while (d < from) d = new Date(d.getFullYear() + step, mo, day);
  return d;
}

/** Hours after signing, from a due_rule like "min(signed_at + 72h, next_event)" or "signed_at + 5d". */
export function hoursAfterSigning(rule: string | undefined): number | null {
  const m = rule?.match(/signed_at\s*\+\s*(\d+)\s*([hd])/);
  return m ? Number(m[1]) * (m[2] === "d" ? 24 : 1) : null;
}

/** Every source link a state's rules rest on, without repeats. */
export function sources(code: string): string[] {
  const R = RULES[code];
  const all = [R.law?.source, R.regulator?.website, ...R.sections.flatMap((se) => se.steps.map((st) => st.source))];
  return [...new Set(all.filter((u): u is string => !!u && /^https?:\/\//.test(u)))];
}

/** What isn't confirmed yet in a state's rules, in plain words. Empty means nothing is known to be missing. */
export function gaps(code: string): string[] {
  const R = RULES[code], out: string[] = [];
  if (R.license_required) {
    const renew = section(code, "renew")?.steps ?? [];
    if (!renew.length) out.push("How often to renew isn't confirmed.");
    else {
      if (renew.some((st) => st.type === "deadline" && st.amount_usd == null)) out.push("The renewal fee isn't confirmed.");
      if (renew.some((st) => st.due_rule && !renewDue(st.due_rule, "2026-01-01"))) out.push("The renewal date isn't confirmed.");
    }
  }
  return [...out, ...(R.review_notes ?? [])];
}

export function status(code: string, done: Done) {
  const req = licenseSteps(code);
  const n = req.filter((id) => done[id]).length;
  const key: StatusKey = n === 0 ? "stop" : n === req.length ? "go" : "wip";
  return { n, total: req.length, key };
}

export const DAY = 864e5;
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const fmt = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function dueText(d: Date | null, today = startOfToday()) {
  if (!d) return "";
  const n = Math.round((d.getTime() - today.getTime()) / DAY);
  if (n < 0) return "Overdue";
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n < 60) return `Due in ${n} days`;
  return `Due ${fmt(d)}`;
}
