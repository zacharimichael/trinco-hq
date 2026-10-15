import FL from "@/data/states/FL.json";
import MA from "@/data/states/MA.json";

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
}

/** Add a state by dropping its JSON in src/data/states and listing it here. */
export const RULES: Record<string, StateRules> = {
  FL: FL as StateRules,
  MA: MA as StateRules,
};
export const TRACKED = Object.keys(RULES);

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

/** Florida renews May 31 of each even year. */
export function nextEvenYearMay31(from = startOfToday()) {
  const y = from.getFullYear();
  let d = new Date(y % 2 ? y + 1 : y, 4, 31);
  if (d < from) d = new Date(d.getFullYear() + 2, 4, 31);
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
