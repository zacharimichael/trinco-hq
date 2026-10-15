import type { ReactNode } from "react";
import type { AppState, Athlete, Profile } from "./model";
import { DAY, fmt, RULES, section, startOfToday, approvalId, nextEvenYearMay31, status } from "./rules";

/** Every to-do is a short guided flow done on the site: fill, review, sign, done. */
export type FormData = Record<string, string | string[]>;
export type Field = { key: string; label: string; value: string; type?: string; options?: string[] };
export type Screen =
  | { type: "fields"; title: string; fields: Field[] }
  | { type: "doc"; title: string; body: (d: FormData) => ReactNode }
  | { type: "pick"; title: string; note?: string; options: string[] }
  | { type: "multi"; title: string; options: string[] }
  | { type: "pay"; title: string; lines: [string, number][] }
  | { type: "confirm"; title: string; items: string[] }
  | { type: "sign"; title: string; what: string };

export interface TaskDef {
  id: string;
  title: string;
  cta: string;
  optional?: boolean;
  needs?: string[];
  due?: Date | null;
  screens: () => Screen[];
  done: (d: FormData) => { msg: string; doc?: string; sendsTo?: string };
}

const sign = (what: string): Screen => ({ type: "sign", title: "Sign", what });
const first = (name: string) => name.split(" ")[0];
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");

export function licenseTasks(p: Profile): Record<string, TaskDef> {
  return {
    fl_app: {
      id: "fl_app", title: "Fill out your Florida application", cta: "Fill & sign",
      screens: () => [
        { type: "fields", title: "Check your details", fields: [
          { key: "name", label: "Full legal name", value: p.name },
          { key: "dob", label: "Date of birth", value: p.dob, type: "date" },
          { key: "address", label: "Home address", value: p.address },
          { key: "email", label: "Email", value: p.email },
          { key: "phone", label: "Phone", value: p.phone },
          { key: "crime", label: "Any criminal convictions?", value: "No", options: ["No", "Yes"] },
        ] },
        { type: "doc", title: "Review", body: (d) => (<>
          <h4>Application for Licensure as an Athlete Agent (DBPR AA-4101)</h4>
          <p><b>Applicant:</b> {str(d.name)}<br /><b>Date of birth:</b> {str(d.dob)}<br /><b>Address:</b> {str(d.address)}<br />
            <b>Email:</b> {str(d.email)} · <b>Phone:</b> {str(d.phone)}<br /><b>Criminal convictions:</b> {str(d.crime)}</p>
          <p>We fill in the official state form for you.</p></>) },
        sign("your Florida application"),
      ],
      done: () => ({ msg: "Application signed.", doc: "Florida application AA-4101" }),
    },
    fl_prints: {
      id: "fl_prints", title: "Book your fingerprint appointment", cta: "Book",
      screens: () => [{ type: "pick", title: "Pick a time near you", note: "Fingerprints are taken in person. Bring a photo ID.",
        options: ["Thu, 10:00 AM · IdentoGO, Boston (1.2 mi)", "Fri, 2:30 PM · IdentoGO, Boston (1.2 mi)", "Mon, 9:00 AM · Fieldprint, Cambridge (3.4 mi)"] }],
      done: (d) => ({ msg: `Booked: ${str(d.pick)}. We'll remind you the day before.`, doc: "Fingerprint appointment" }),
    },
    fl_fee: {
      id: "fl_fee", title: "Pay the Florida fee", cta: "Pay $630",
      screens: () => [{ type: "pay", title: "Pay $630", lines: [["Application fee", 250], ["License fee", 375], ["Unlicensed activity fee", 5]] }],
      done: () => ({ msg: "Paid $630. Receipt saved.", doc: "Receipt: Florida fees $630" }),
    },
    fl_submit: {
      id: "fl_submit", title: "Send your application to Florida", cta: "Send", needs: ["fl_app", "fl_prints", "fl_fee"],
      screens: () => [{ type: "confirm", title: "Ready to send", items: ["Application, signed", "Fingerprint appointment, booked", "Fees, paid"] }],
      done: () => ({ msg: "Sent to Florida. We'll tell you the moment it's approved.", doc: "Florida submission confirmation" }),
    },
    fl_temp: {
      id: "fl_temp", title: "Ask for a 60-day temporary license", cta: "Sign & send", optional: true,
      screens: () => [
        { type: "doc", title: "Review", body: () => (<><h4>Request for Temporary Athlete Agent License</h4>
          <p>I, {p.name}, of {p.address}, request a temporary athlete agent license while my application is pending.</p></>) },
        sign("the temporary license request"),
      ],
      done: () => ({ msg: "Request sent to Florida.", doc: "Temporary license request" }),
    },
    ma_school: {
      id: "ma_school", title: "Register with your schools", cta: "Pick & sign",
      screens: () => [
        { type: "multi", title: "Which schools do you recruit at?", options: ["Boston College", "Boston University", "Harvard", "Northeastern", "UMass Amherst", "Holy Cross"] },
        { type: "doc", title: "Review", body: (d) => (<><h4>Agent Registration</h4>
          <p><b>Agent:</b> {p.name} · {p.email} · {p.phone}</p>
          <p><b>Sent to the compliance office at:</b> {str(d.multi)}</p></>) },
        sign("your school registrations"),
      ],
      done: (d) => { const n = (d.multi as string[] | undefined)?.length ?? 0; return { msg: `Sent to ${n} school${n === 1 ? "" : "s"}.`, doc: "School agent registrations" }; },
    },
  };
}

export const WARNING: Record<string, string> = {
  FL: "Warning to student athlete. If you sign this contract: (1) you may lose your eligibility to compete as a student athlete in your sport; (2) if you have an athletic director, within 72 hours after entering into this contract, both you and your athlete agent must notify your athletic director; and (3) you may cancel this contract within 14 days after signing it. Cancellation of this contract may not reinstate your eligibility.",
  MA: "Warning to student athlete. Signing this contract may cause you to lose your eligibility to compete as a student athlete in your sport. You may cancel this contract within 14 days after signing it.",
};

export function athleteTasks(a: Athlete, p: Profile): TaskDef[] {
  const t: TaskDef[] = [];
  if (a.state === "FL") t.push({
    id: "fl_nil_notice", title: `Tell ${a.school}'s athletic director before you contact ${first(a.name)}`, cta: "Sign & send",
    screens: () => [
      { type: "doc", title: "Review the notice", body: () => (<><h4>Notice to Athletic Director</h4><p>To: Athletic Director, {a.school}</p>
        <p>{p.name}, a Florida athlete agent, intends to contact {a.name} ({a.sport}) about name, image and likeness representation.</p></>) },
      sign("the notice"),
    ],
    done: () => ({ msg: `Sent to the athletic director at ${a.school}.`, doc: `Notice to athletic director: ${a.name}` }),
  });
  t.push({
    id: "contract", title: `Send ${first(a.name)} the NIL contract to sign`, cta: "Create & sign", needs: a.state === "FL" ? ["fl_nil_notice"] : [],
    screens: () => [
      { type: "fields", title: "Contract terms", fields: [
        { key: "fee", label: "Your fee (% of each deal)", value: "10" },
        { key: "months", label: "Length (months)", value: "12" },
        { key: "services", label: "Services", value: "Find and negotiate NIL deals" },
        { key: "email", label: `${a.name}'s email`, value: `${a.name.toLowerCase().replace(/\s+/g, ".")}@example.com` },
      ] },
      { type: "doc", title: "Review the contract", body: (d) => (<>
        <h4>NIL Representation Agreement</h4>
        <p><b>Agent:</b> {p.name}<br /><b>Athlete:</b> {a.name}, {a.school}</p>
        <p><b>Services:</b> {str(d.services)}<br /><b>Agent fee:</b> {str(d.fee)}% of each NIL deal, paid only when the athlete is paid. No other person is paid because of this contract.<br />
          <b>Expenses:</b> None charged to the athlete.<br /><b>Length:</b> {str(d.months)} months, ending early if college eligibility ends.<br /><b>Date:</b> {fmt(startOfToday())}</p>
        <p>This contract covers NIL only. It does not cover professional or athletic representation.</p>
        <div className="warnbox">{WARNING[a.state] ?? WARNING.MA}</div></>) },
      sign("the contract"),
    ],
    done: () => ({ msg: `You signed. We emailed it to ${a.name} to sign. Both of you get a signed copy automatically.`, doc: `NIL contract: ${a.name}`, sendsTo: a.name }),
  });
  if (a.state === "FL") t.push({
    id: "fl_72h", title: `Tell the athletic director ${first(a.name)} signed`, cta: "Sign & send", needs: ["contract"],
    due: a.signed ? new Date(new Date(a.signed).getTime() + 3 * DAY) : null,
    screens: () => [
      { type: "doc", title: "Review the notice", body: () => (<><h4>Notice of Agent Contract</h4><p>To: Athletic Director, {a.school}</p>
        <p>{a.name} and athlete agent {p.name} entered into an agent contract on {a.signed ? fmt(a.signed) : "—"}.</p></>) },
      sign("the notice"),
    ],
    done: () => ({ msg: `Sent to the athletic director at ${a.school}.`, doc: `Contract notice to athletic director: ${a.name}` }),
  });
  return t;
}

export interface Todo {
  key: string;
  title: string;
  where: string;
  due: Date | null;
  wait?: string; // state code awaiting approval
  later?: boolean;
  task?: TaskDef;
  athleteId?: string;
}

export function todos(s: AppState): Todo[] {
  const out: Todo[] = [];
  const lt = licenseTasks(s.profile);
  for (const code of Object.keys(RULES)) {
    for (const st of section(code, "get_licensed")?.steps ?? []) {
      const def = lt[st.id];
      if (!def || def.optional || s.done[st.id]) continue;
      if ((def.needs ?? []).some((n) => !s.done[n])) continue;
      out.push({ key: st.id, title: def.title, where: RULES[code].name, due: null, task: def });
    }
    if (RULES[code].license_required && s.done[`${code.toLowerCase()}_submit`] && !s.done[approvalId(code)])
      out.push({ key: `wait_${code}`, title: `Waiting for ${RULES[code].name} to approve your license`, where: RULES[code].name, due: null, wait: code });
  }
  for (const a of s.athletes)
    for (const t of athleteTasks(a, s.profile)) {
      if (a.done[t.id] || (t.needs ?? []).some((n) => !a.done[n])) continue;
      out.push({ key: a.id + t.id, title: t.title, where: `${a.name} · ${a.school}`, due: t.due ?? null, task: t, athleteId: a.id });
    }
  if (status("FL", s.done).key === "go")
    out.push({ key: "renew_FL", title: "Renew your Florida license", where: "Florida · $225", due: nextEvenYearMay31(), later: true });
  const t = (d: Date | null) => (d ? d.getTime() : Infinity);
  return out.sort((x, y) => Number(!!x.wait) - Number(!!y.wait) || t(x.due) - t(y.due));
}
