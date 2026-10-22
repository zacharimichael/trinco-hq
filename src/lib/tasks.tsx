import type { ReactNode } from "react";
import type { AppState, Athlete, Profile } from "./model";
import { fmt, RULES, section, startOfToday, approvalId, hoursAfterSigning, renewDue, status, submitId, type StateRules, type Step } from "./rules";

/** Every to-do is a short guided flow done on the site: fill, review, sign, done. */
export type FormData = Record<string, string | string[]>;
export type Field = { key: string; label: string; value: string; type?: string; options?: string[] };
export type Screen =
  | { type: "fields"; title: string; fields: Field[] }
  | { type: "doc"; title: string; body: (d: FormData) => ReactNode }
  | { type: "pick"; title: string; note?: string; options: string[] }
  | { type: "multi"; title: string; options: string[] }
  | { type: "pay"; title: string; lines: [string, number][] }
  | { type: "confirm"; title: string; items: string[]; button?: string }
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

/** Hand-written flows for steps that need more than the generic one. */
function customLicenseTasks(p: Profile): Record<string, TaskDef> {
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

const money = (n: number) => `$${n.toLocaleString()}`;

/** A guided flow for any state's "Get licensed" step, built from its type. */
function genericLicenseTask(R: StateRules, st: Step, p: Profile): TaskDef | null {
  const base = { id: st.id, title: st.text };
  const what = st.form ? `Form ${st.form}` : st.text.replace(/^optional:\s*/i, "");
  const review = (h: string, lines: ReactNode): Screen => ({ type: "doc", title: "Review", body: () => (<><h4>{h}</h4>{lines}</>) });
  const contact = <p><b>Agent:</b> {p.name}<br /><b>Address:</b> {p.address}<br /><b>Email:</b> {p.email} · <b>Phone:</b> {p.phone}</p>;
  const sub = submitId(R.state);

  if (st.id === sub) {
    const prior = (section(R.state, "get_licensed")?.steps ?? []).filter((x) => x.id !== st.id && !["info", "rule", "optional"].includes(x.type));
    return { ...base, cta: "Send", needs: prior.map((x) => x.id),
      screens: () => [{ type: "confirm", title: "Ready to send", items: prior.map((x) => x.text) }],
      done: () => ({ msg: `Sent to ${R.name}. We'll tell you the moment it's approved.`, doc: `${R.name} submission confirmation` }) };
  }
  switch (st.type) {
    case "form":
      return { ...base, cta: "Fill & sign",
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
            <h4>{R.name}: {what}</h4>
            <p><b>Applicant:</b> {str(d.name)}<br /><b>Date of birth:</b> {str(d.dob)}<br /><b>Address:</b> {str(d.address)}<br />
              <b>Email:</b> {str(d.email)} · <b>Phone:</b> {str(d.phone)}<br /><b>Criminal convictions:</b> {str(d.crime)}</p>
            <p>We fill in the official state form for you.</p></>) },
          sign(`your ${R.name} ${st.form ? "form" : "application"}`),
        ],
        done: () => ({ msg: "Signed.", doc: `${R.name}: ${what}` }) };
    case "payment": {
      const amt = st.amount_usd ?? 0;
      return { ...base, cta: amt ? `Pay ${money(amt)}` : "Pay",
        screens: () => [{ type: "pay", title: amt ? `Pay ${money(amt)}` : "Pay the fee", lines: [[`${R.name} fee`, amt]] }],
        done: () => ({ msg: `Paid ${money(amt)}. Receipt saved.`, doc: `Receipt: ${R.name} fees ${money(amt)}` }) };
    }
    case "notice":
    case "contract":
    case "optional":
      return { ...base, cta: "Sign & send", optional: st.type === "optional",
        screens: () => [review(`${R.name}: ${what}`, <>{contact}{st.detail && <p>{st.detail}</p>}</>), sign(what.toLowerCase())],
        done: () => ({ msg: "Signed and sent.", doc: `${R.name}: ${what}` }) };
    case "info":
    case "rule":
      return null;
    default:
      if (/fingerprint/i.test(st.text))
        return { ...base, cta: "Book",
          screens: () => [{ type: "pick", title: "Pick a time near you", note: "Fingerprints are taken in person. Bring a photo ID.",
            options: ["Thu, 10:00 AM · IdentoGO (1.2 mi)", "Fri, 2:30 PM · IdentoGO (1.2 mi)", "Mon, 9:00 AM · Fieldprint (3.4 mi)"] }],
          done: (d) => ({ msg: `Booked: ${str(d.pick)}. We'll remind you the day before.`, doc: `Fingerprint appointment: ${R.name}` }) };
      if (/school/i.test(st.text))
        return { ...base, cta: "Fill & sign",
          screens: () => [
            { type: "fields", title: "Which schools do you recruit at?", fields: [{ key: "schools", label: "Schools (separate with commas)", value: "" }] },
            { type: "doc", title: "Review", body: (d) => (<><h4>Agent Registration</h4>{contact}<p><b>Sent to the compliance office at:</b> {str(d.schools) || "—"}</p></>) },
            sign("your school registrations"),
          ],
          done: () => ({ msg: "Sent to your schools.", doc: `School agent registrations: ${R.name}` }) };
      return { ...base, cta: "Start",
        screens: () => [{ type: "confirm", title: st.text, items: [st.detail || st.text], button: "Done" }],
        done: () => ({ msg: "Done.", doc: undefined }) };
  }
}

/** The click-through flow for each "Get licensed" step in one state, by step id. */
export function stateTasks(code: string, p: Profile): Record<string, TaskDef> {
  const R = RULES[code], custom = customLicenseTasks(p), out: Record<string, TaskDef> = {};
  for (const st of section(code, "get_licensed")?.steps ?? []) {
    const def = custom[st.id] ?? genericLicenseTask(R, st, p);
    if (def) out[st.id] = def;
  }
  return out;
}

export const WARNING: Record<string, string> = {
  FL: "Warning to student athlete. If you sign this contract: (1) you may lose your eligibility to compete as a student athlete in your sport; (2) if you have an athletic director, within 72 hours after entering into this contract, both you and your athlete agent must notify your athletic director; and (3) you may cancel this contract within 14 days after signing it. Cancellation of this contract may not reinstate your eligibility.",
  MA: "Warning to student athlete. Signing this contract may cause you to lose your eligibility to compete as a student athlete in your sport. You may cancel this contract within 14 days after signing it.",
};

const GENERIC_WARNING = "Warning to student athlete. Signing this contract may cause you to lose your eligibility to compete as a student athlete in your sport. You may cancel this contract within 14 days after signing it.";
const contractWarning = (code: string) => RULES[code]?.contract_warning ?? WARNING[code] ?? GENERIC_WARNING;

export function athleteTasks(a: Athlete, p: Profile): TaskDef[] {
  const steps = (RULES[a.state] && section(a.state, "every_athlete")?.steps) || [];
  const before = steps.filter((st) => st.type === "notice");
  const after = steps.filter((st) => st.type === "deadline" && hoursAfterSigning(st.due_rule) !== null);
  const notice = (st: Step, title: string, h: string, body: ReactNode, due?: Date | null, needs?: string[]): TaskDef => ({
    id: st.id, title, cta: "Sign & send", due, needs,
    screens: () => [{ type: "doc", title: "Review the notice", body: () => (<><h4>{h}</h4><p>To: Athletic Director, {a.school}</p>{body}</>) }, sign("the notice")],
    done: () => ({ msg: `Sent to the athletic director at ${a.school}.`, doc: `${h}: ${a.name}` }),
  });

  const t: TaskDef[] = before.map((st) => notice(st,
    st.id === "fl_nil_notice" ? `Tell ${a.school}'s athletic director before you contact ${first(a.name)}` : `${st.text} (${first(a.name)})`,
    "Notice to Athletic Director",
    <p>{p.name}, an athlete agent, intends to contact {a.name} ({a.sport}) about name, image and likeness representation.</p>));
  t.push({
    id: "contract", title: `Send ${first(a.name)} the NIL contract to sign`, cta: "Create & sign", needs: before.map((st) => st.id),
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
        <div className="warnbox">{contractWarning(a.state)}</div></>) },
      sign("the contract"),
    ],
    done: () => ({ msg: `You signed. We emailed it to ${a.name} to sign. Both of you get a signed copy automatically.`, doc: `NIL contract: ${a.name}`, sendsTo: a.name }),
  });
  for (const st of after) {
    const h = hoursAfterSigning(st.due_rule)!;
    t.push(notice(st,
      st.id === "fl_72h" ? `Tell the athletic director ${first(a.name)} signed` : `${st.text} (${first(a.name)})`,
      "Notice of Agent Contract",
      <p>{a.name} and athlete agent {p.name} entered into an agent contract on {a.signed ? fmt(a.signed) : "—"}.</p>,
      a.signed ? new Date(new Date(a.signed).getTime() + h * 36e5) : null, ["contract"]));
  }
  return t;
}

export function agencyAgreementTask(s: AppState): TaskDef {
  return {
    id: "agency_agreement", title: `Sign the ${s.agency.name} agency agreement`, cta: "Sign",
    screens: () => [
      { type: "doc", title: "Review the agency agreement", body: () => (<>
        <h4>Independent Agent Agreement</h4>
        <p><b>Agency:</b> {s.agency.name}<br /><b>Agent:</b> {s.profile.name} · {s.profile.email}</p>
        <p>The agent represents athletes for NIL on behalf of the agency and keeps {s.agency.split}% of commissions on deals they close. The agency keeps the rest.</p>
        <p>The agent must hold every required state license or registration, use the agency&apos;s contracts and follow every rule in this app. The agency can end this agreement if the agent falls out of compliance.</p>
      </>) },
      sign("the agency agreement"),
    ],
    done: () => ({ msg: "Signed. Your licensing checklist is ready on your map.", doc: `${s.agency.name} agency agreement` }),
  };
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

/** A state is "started" once any of its steps is done or the agent has an athlete there. */
const started = (code: string, s: AppState) =>
  s.athletes.some((a) => a.state === code) || Object.keys(stateTasks(code, s.profile)).some((id) => s.done[id]);

export function todos(s: AppState): Todo[] {
  const out: Todo[] = [];
  if (s.me?.role === "agent" && s.me.stage <= 1)
    out.push({ key: "agency_agreement", title: `Sign the ${s.agency.name} agency agreement`, where: s.agency.name, due: null, task: agencyAgreementTask(s) });
  for (const code of Object.keys(RULES)) {
    // Only states the agent has started show up here; the map is where they start a new one.
    if (!started(code, s)) continue;
    const lt = stateTasks(code, s.profile);
    for (const st of section(code, "get_licensed")?.steps ?? []) {
      const def = lt[st.id];
      if (!def || def.optional || s.done[st.id]) continue;
      if ((def.needs ?? []).some((n) => !s.done[n])) continue;
      out.push({ key: st.id, title: def.title, where: RULES[code].name, due: null, task: def });
    }
    const sub = submitId(code);
    if (sub && s.done[sub] && !s.done[approvalId(code)])
      out.push({ key: `wait_${code}`, title: `Waiting for ${RULES[code].name} to approve your license`, where: RULES[code].name, due: null, wait: code });
  }
  for (const a of s.athletes)
    for (const t of athleteTasks(a, s.profile)) {
      if (a.done[t.id] || (t.needs ?? []).some((n) => !a.done[n])) continue;
      out.push({ key: a.id + t.id, title: t.title, where: `${a.name} · ${a.school}`, due: t.due ?? null, task: t, athleteId: a.id });
    }
  for (const code of Object.keys(RULES)) {
    if (!RULES[code].license_required || status(code, s.done).key !== "go") continue;
    for (const st of section(code, "renew")?.steps ?? [])
      out.push({ key: `renew_${st.id}`, title: `Renew your ${RULES[code].name} license`, where: `${RULES[code].name}${st.amount_usd ? ` · ${money(st.amount_usd)}` : ""}`, due: renewDue(st.due_rule), later: true });
  }
  const t = (d: Date | null) => (d ? d.getTime() : Infinity);
  return out.sort((x, y) => Number(!!x.wait) - Number(!!y.wait) || t(x.due) - t(y.due));
}
