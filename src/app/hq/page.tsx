"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTaskRunner } from "@/components/TaskRunner";
import { dealMoney } from "@/lib/agency";
import { STAGES, type AgentContact, type CoachContact, type TeamMember } from "@/lib/model";
import { COACH_LABEL } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";
import { DAY, dueText, myStates, RULES, startOfToday, status } from "@/lib/rules";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function HqPage() {
  const { state, update, mode, inviteAgent, email: myEmail } = useStore();
  const live = mode === "live";
  const owner = !live || state.me?.role === "owner";
  const canOnboard = owner || state.me?.role === "editor";
  const run = useTaskRunner();
  const { agency } = state;
  if (live && state.me?.role === "agent")
    return <section className="view"><h1>Agents &amp; deals</h1><p className="muted">Only the agency owner can see this.</p></section>;

  const me: TeamMember = {
    id: "me", name: "You", email: state.profile.email, stage: 3, split: 100, done: state.done,
    athletes: state.athletes.map((a) => ({ name: a.name, school: a.school, sport: a.sport, state: a.state, contract: a.done.contract ? "Signed" : "Not sent" })),
  };
  // An agent's states: the ones they've started or have athletes in.
  const statesOf = (t: TeamMember) => myStates(t.done, t.athletes.map((a) => a.state));
  // An agent who is getting licensed goes Active once every one of their states is green.
  const allGreen = (t: TeamMember) => { const c = statesOf(t); return c.length > 0 && c.every((x) => status(x, t.done).key === "go"); };
  const team = [me, ...state.team.map((t) => (t.stage === 2 && allGreen(t) ? { ...t, stage: 3 } : t))];

  const active = team.filter((t) => t.stage === 3).length;
  const athletes = team.flatMap((t) => t.athletes.map((a) => ({ ...a, agent: t.name })));
  const { cut, house, earned, toAgents, coming } = dealMoney(state);

  const today = startOfToday();
  const attention: string[] = [];
  team.forEach((t) => {
    if (t.stage === 3 && t.id !== "me") statesOf(t).forEach((c) => { if (status(c, t.done).key !== "go") attention.push(`${t.name}: not licensed in ${RULES[c].name}`); });
  });
  todos(state).filter((x) => x.due && !x.later && (x.due.getTime() - today.getTime()) / DAY <= 3)
    .forEach((x) => attention.push(`You: ${x.title} (${dueText(x.due).toLowerCase()})`));
  athletes.filter((a) => a.contract !== "Signed").forEach((a) => attention.push(`${a.agent}: contract not sent to ${a.name}`));

  const onboard = () =>
    run(
      {
        id: "onboard", title: "Add a new agent", cta: "Add",
        screens: () => [
          { type: "fields", title: "Who's joining?", fields: [
            { key: "name", label: "Agent's name", value: "" },
            { key: "email", label: "Agent's email (optional)", value: "", type: "email" },
            { key: "split", label: "Agent's share of commissions (%)", value: String(agency.split) },
          ] },
          { type: "doc", title: "Review the agency agreement", body: (d) => (<>
            <h4>Independent Agent Agreement</h4>
            <p><b>Agency:</b> {agency.name}<br /><b>Agent:</b> {String(d.name)}{d.email ? <> · {String(d.email)}</> : null}</p>
            <p>The agent represents athletes for NIL on behalf of the agency. The agent keeps {String(d.split)}% of commissions on deals they close, and the agency keeps the rest.</p>
            <p>The agent must hold every required state license or registration, use the agency&apos;s contracts and follow every rule in this app. The agency can end this agreement if the agent falls out of compliance.</p>
          </>) },
          { type: "sign", title: "Sign", what: "the agency agreement" },
        ],
        done: async (d) => {
          const name = String(d.name || "").trim();
          const email = String(d.email || "").trim().toLowerCase();
          if (!name) return { failed: true, title: "Not added", msg: "Type the agent's name, then try again." };
          if (email && !/^\S+@\S+\.\S+$/.test(email)) return { failed: true, title: "Not added", msg: `"${email}" isn't a full email. Fix it or leave it blank.` };
          // Everyone already in the agency, including you, can't be added again.
          const mine = [state.profile.email, myEmail].some((e) => e && e.toLowerCase() === email);
          const taken = [...state.team.map((t) => t.email), ...(state.shared ?? []).map((p) => p.email)].some((e) => e && e.toLowerCase() === email);
          if (email && mine) return { failed: true, title: "Not added", msg: "That's your own email. You're already in the Agents list as \"You\". Use the agent's email, or leave it blank." };
          if (email && taken) return { failed: true, title: "Not added", msg: "Someone with that email is already in your agency." };
          if (live) {
            const err = await inviteAgent(name, email, Number(d.split) || agency.split);
            if (err) return { failed: true, title: "Not added", msg: err };
          }
          return {
            title: `${name} is added`,
            msg: email
              ? `${name} is in your Agents list. When they sign in here with ${email}, they'll go straight to the agreement.`
              : `${name} is in your Agents list. Add their email later if you want them to sign in.`,
            note: "Nothing was sent to them.",
            doc: `Agency agreement: ${name}`,
          };
        },
      },
      (draft, d) => {
        if (live) return;
        draft.team.push({ id: `t${Date.now()}`, name: String(d.name).trim(), email: String(d.email || ""), stage: 0, split: Number(d.split) || agency.split, done: {}, athletes: [] });
      },
    );

  return (
    <section className="view">
      <div><h1>Agents &amp; deals</h1><p className="muted" style={{ margin: "6px 0 0" }}>Keep track of the agents and coaches you work with.</p></div>

      <AgentList />

      <CoachList />

      <details className="card fold" id="licensing-onboarding">
        <summary><h2>Agent licensing and onboarding</h2><span className="muted">For agents who sign in and get licensed here</span></summary>
        <div className="sec">
      <div className="tiles">
        <div className="tile2"><span className="big">{active}</span>Active agents</div>
        <div className="tile2"><span className="big">{team.length - active}</span>Onboarding</div>
        <div className="tile2"><span className="big">{athletes.length}</span>Athletes</div>
        <div className="tile2"><span className="big">{money(earned)}</span>{agency.name} earned</div>
      </div>

      <div className="card next">
        <h2>Needs your attention</h2>
        {attention.length ? attention.map((a) => <div className="todo" key={a}><span className="dot stop" /><span className="grow">{a}</span></div>)
          : <p className="muted" style={{ margin: 0 }}>Nothing. Your agency is fully compliant.</p>}
      </div>

      <div className="card sec">
        <div className="statehead" style={{ justifyContent: "space-between" }}>
          <h2>Onboard agents</h2>
          {canOnboard && <button className="btn" id="onboard" type="button" onClick={onboard}>+ Add a new agent</button>}
        </div>
        <p className="muted" style={{ margin: 0 }}>New agents sign your agency agreement here, then get licensed state by state. They go live when their map is all green.</p>
        <div className="pipe">
          {STAGES.map((stage, i) => {
            const here = team.filter((t) => t.stage === i);
            return (
              <div className="pcol" key={stage}>
                <div className="phead">{stage} <span className="muted">{here.length}</span></div>
                {here.map((t) => (
                  <div className="pcard" key={t.id}>
                    <b>{t.name}</b>
                    {i === 2 && <small>{statesOf(t).map((c) => <span key={c}><span className={`dot ${status(c, t.done).key}`} /> {c} </span>)}</small>}
                    {i < 2 && t.id !== "me" && !live && (
                      <button className="linkbtn" data-advance={t.id} onClick={() => update((d) => { d.team.find((m) => m.id === t.id)!.stage++; })}>
                        Demo: {i === 0 ? "they opened the invite" : "they signed"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card sec">
        <h2>Agents</h2>
        <div className="tablewrap"><table>
          <thead><tr><th>Agent</th><th>Licenses</th><th>Athletes</th></tr></thead>
          <tbody>{team.map((p) => (
            <tr key={p.id}>
              <td><b>{p.name}</b><div className="muted" style={{ fontSize: 13 }}>{STAGES[p.stage]}</div></td>
              <td><div className="dots">{statesOf(p).length ? statesOf(p).map((c) => <span className="chip" key={c}><span className={`dot ${status(c, p.done).key}`} />{c}</span>) : <span className="muted">None yet</span>}</div></td>
              <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.athletes.length}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
        </div>
      </details>

      <div className="grid2">
        <div className="card sec">
          <h2>Athletes</h2>
          <div className="tablewrap"><table>
            <thead><tr><th>Athlete</th><th>Agent</th><th>Contract</th></tr></thead>
            <tbody>{athletes.map((a) => (
              <tr key={a.agent + a.name}>
                <td><b>{a.name}</b><div className="muted" style={{ fontSize: 13 }}>{a.school}{a.sport && ` · ${a.sport}`}</div></td>
                <td>{a.agent}</td>
                <td>{a.contract === "Signed" ? <span className="okchip">✓ Signed</span> : <span className="waitchip">● Not sent</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
        <div className="card sec">
          <h2>Deals and commissions</h2>
          <div className="tablewrap"><table>
            <thead><tr><th>Deal</th><th className="num">Value</th><th className="num">Agent</th><th className="num">{agency.name}</th><th /></tr></thead>
            <tbody>{state.deals.map((d) => (
              <tr key={d.brand}>
                <td><b>{d.brand}</b><div className="muted" style={{ fontSize: 13 }}>{d.athlete} · {d.agent}</div></td>
                <td className="num">{money(d.amount)}</td>
                <td className="num">{money(cut(d) - house(d))}</td>
                <td className="num">{money(house(d))}</td>
                <td>{d.status === "Paid" ? <span className="okchip">✓ Paid</span> : <span className="waitchip">● Pending</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{agency.split}/{100 - agency.split} split: agents keep {agency.split}% of the commission on deals they close.</p>
          <div className="lines">
            <div className="total"><span>{agency.name} earned</span><span>{money(earned)}</span></div>
            <div><span className="muted">Paid to agents</span><span>{money(toAgents)}</span></div>
            <div><span className="muted">Coming in to {agency.name}</span><span>{money(coming)}</span></div>
          </div>
        </div>
      </div>
      {live && owner && <SharedAccess />}
    </section>
  );
}


const blank = { name: "", email: "", phone: "", pay: "" };

/** The agents you work with: name, email, cell and the agreed split or pay. Nothing to sign. */
function AgentList() {
  const { state, update } = useStore();
  const list = state.roster ?? [];
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const note = useSaveNote();
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, [k]: e.target.value }); setMsg(""); note.clear(); };
  const save = () => {
    const a = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), pay: form.pay.trim() };
    if (!a.name) return setMsg("Type their name first.");
    update((d) => {
      d.roster ??= [];
      const i = d.roster.findIndex((x) => x.id === editing);
      if (i >= 0) d.roster[i] = { ...d.roster[i], ...a };
      else d.roster.push({ id: `ag${Date.now()}`, ...a });
    });
    note.start(editing ? `${a.name} is updated.` : `${a.name} is added.`);
    setForm(blank);
    setEditing(null);
  };
  const edit = (a: AgentContact) => { setForm({ name: a.name, email: a.email, phone: a.phone, pay: a.pay }); setEditing(a.id); setMsg(""); };
  const remove = (a: AgentContact) => {
    if (!confirm(`Remove ${a.name}?`)) return;
    update((d) => { d.roster = (d.roster ?? []).filter((x) => x.id !== a.id); });
    if (editing === a.id) { setForm(blank); setEditing(null); }
  };
  return (
    <div className="card sec" id="agent-list">
      <h2>Agents we work with <span className="muted">{list.length}</span></h2>
      <form className="grid2" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label htmlFor="ag-name">Name</label><input id="ag-name" value={form.name} onChange={set("name")} /></div>
        <div className="field"><label htmlFor="ag-email">Email</label><input id="ag-email" type="email" value={form.email} onChange={set("email")} /></div>
        <div className="field"><label htmlFor="ag-phone">Cell phone</label><input id="ag-phone" type="tel" value={form.phone} onChange={set("phone")} /></div>
        <div className="field"><label htmlFor="ag-pay">Split or payment</label><input id="ag-pay" placeholder="70/30, or $500 a deal" value={form.pay} onChange={set("pay")} /></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" id="ag-save" type="submit">{editing ? "Save changes" : "+ Add agent"}</button>
          {editing && <button className="btn ghost" type="button" onClick={() => { setForm(blank); setEditing(null); }}>Cancel</button>}
        </div>
      </form>
      {msg ? <p role="status" style={{ margin: 0 }}>{msg}</p> : note.view}
      {list.length > 0 ? (
        <div className="tablewrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Cell</th><th>Split or pay</th><th /></tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id}>
              <td><b>{a.name}</b></td>
              <td>{a.email ? <a href={`mailto:${a.email}`}>{a.email}</a> : <span className="muted">None</span>}</td>
              <td>{a.phone ? <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`}>{a.phone}</a> : <span className="muted">None</span>}</td>
              <td>{a.pay || <span className="muted">None</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button type="button" className="linkbtn" onClick={() => edit(a)}>Edit</button>{" "}
                <button type="button" className="linkbtn" onClick={() => remove(a)}>Remove</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="muted" style={{ margin: 0 }}>No agents yet. Add one above.</p>}
    </div>
  );
}

/**
 * After a change, says plainly whether it reached the database: "Saving…", then "✓ Saved", or "Not saved" with the reason and Try again.
 * Waits to see the save start before it says saved, so it never claims a save that didn't happen.
 */
function useSaveNote() {
  const { save, retrySave, mode } = useStore();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "waiting" | "saving" | "done" | "error">("idle");
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    if (save.status === "saving") setPhase("saving");
    else if (phase === "saving" && save.status === "saved") setPhase("done");
    else if (save.status === "error") setPhase("error");
  }, [save.status, phase]);
  // Nothing to save to outside the live site, so don't wait forever there.
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setTimeout(() => setPhase(mode === "live" ? (save.status === "error" ? "error" : "done") : "done"), 3000);
    return () => clearTimeout(t);
  }, [phase, mode, save.status]);
  const view = phase === "idle" ? null
    : phase === "error" ? <p role="alert" style={{ margin: 0, color: "var(--stop)" }}><b>Not saved.</b> {save.message} <button type="button" className="linkbtn" onClick={retrySave}>Try again</button></p>
    : phase === "done" ? <p role="status" style={{ margin: 0 }}>✓ {text} Saved.</p>
    : <p role="status" className="muted" style={{ margin: 0 }}>Saving…</p>;
  return { start: (t: string) => { setText(t); setPhase("waiting"); }, clear: () => setPhase("idle"), view };
}

const ROLES = ["HC", "ST", "GM", "Other"] as const;
const roleName = (r: CoachContact["role"]) => (r === "Other" ? "Other" : COACH_LABEL[r]);
const blankCoach = { name: "", school: "", role: "HC" as CoachContact["role"], email: "", phone: "", notes: "" };

/** The coaches you work with: name, school, role, email, cell and a note. Picking a school fills in the coach we already know. */
function CoachList() {
  const { state, update } = useStore();
  const { schools, staffOf } = useScouting();
  const list = state.coaches ?? [];
  const [form, setForm] = useState(blankCoach);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const note = useSaveNote();
  const findSchool = (name: string) => { const n = name.trim().toLowerCase(); return n ? schools.find((x) => x.name.toLowerCase() === n) : undefined; };
  // What we filled in last, so changing the school or role swaps it out but never anything you typed yourself.
  const [auto, setAuto] = useState({ name: "", email: "", phone: "" });
  /** When the school and role match one we have, fill in the coach's name, email and cell. */
  const fill = (f: typeof blankCoach) => {
    const sch = findSchool(f.school);
    const c = sch && f.role !== "Other" ? staffOf(sch.id)[f.role] : { name: "", email: "", phone: "" };
    const pick = (k: "name" | "email" | "phone") => (!f[k] || f[k] === auto[k] ? c[k] : f[k]);
    setAuto({ name: c.name, email: c.email, phone: c.phone });
    return { ...f, name: pick("name"), email: pick("email"), phone: pick("phone") };
  };
  const change = (k: keyof typeof blankCoach) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(k === "school" || k === "role" ? fill(next) : next);
    setMsg(""); note.clear();
  };
  const save = () => {
    const sch = findSchool(form.school);
    const c = { name: form.name.trim(), school: sch?.name ?? form.school.trim(), schoolId: sch?.id, role: form.role, email: form.email.trim(), phone: form.phone.trim(), notes: form.notes.trim() };
    if (!c.name) return setMsg("Type their name first.");
    update((d) => {
      d.coaches ??= [];
      const i = d.coaches.findIndex((x) => x.id === editing);
      if (i >= 0) d.coaches[i] = { ...d.coaches[i], ...c };
      else d.coaches.push({ id: `co${Date.now()}`, ...c });
    });
    note.start(editing ? `${c.name} is updated.` : `${c.name} is added.`);
    setForm(blankCoach);
    setEditing(null);
  };
  const edit = (c: CoachContact) => { setForm({ name: c.name, school: c.school, role: c.role, email: c.email, phone: c.phone, notes: c.notes }); setEditing(c.id); setMsg(""); note.clear(); };
  const remove = (c: CoachContact) => {
    if (!confirm(`Remove ${c.name}?`)) return;
    update((d) => { d.coaches = (d.coaches ?? []).filter((x) => x.id !== c.id); });
    if (editing === c.id) { setForm(blankCoach); setEditing(null); }
  };
  const schoolOf = (c: CoachContact) => (c.schoolId ? schools.find((x) => x.id === c.schoolId) : undefined);
  return (
    <div className="card sec" id="coach-list">
      <h2>Coaches we work with <span className="muted">{list.length}</span></h2>
      <form className="grid2" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label htmlFor="co-school">School</label><input id="co-school" list="co-schools" placeholder="Start typing a school" value={form.school} onChange={change("school")} /></div>
        <div className="field"><label htmlFor="co-role">Role</label>
          <select id="co-role" value={form.role} onChange={change("role")}>{ROLES.map((r) => <option key={r} value={r}>{roleName(r)}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="co-name">Name</label><input id="co-name" value={form.name} onChange={change("name")} /></div>
        <div className="field"><label htmlFor="co-email">Email</label><input id="co-email" type="email" value={form.email} onChange={change("email")} /></div>
        <div className="field"><label htmlFor="co-phone">Cell phone</label><input id="co-phone" type="tel" value={form.phone} onChange={change("phone")} /></div>
        <div className="field"><label htmlFor="co-notes">Notes</label><input id="co-notes" placeholder="How we know them, what they need" value={form.notes} onChange={change("notes")} /></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" id="co-save" type="submit">{editing ? "Save changes" : "+ Add coach"}</button>
          {editing && <button className="btn ghost" type="button" onClick={() => { setForm(blankCoach); setEditing(null); }}>Cancel</button>}
        </div>
      </form>
      <datalist id="co-schools">{schools.map((x) => <option key={x.id} value={x.name} />)}</datalist>
      {msg ? <p role="status" style={{ margin: 0 }}>{msg}</p> : note.view}
      {list.length > 0 ? (
        <div className="tablewrap"><table>
          <thead><tr><th>Name</th><th>School</th><th>Role</th><th>Email</th><th>Cell</th><th>Notes</th><th /></tr></thead>
          <tbody>{list.map((c) => {
            const sch = schoolOf(c);
            return (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td>{sch ? <Link href={`/schools?s=${sch.state}&school=${sch.id}`}>{sch.name}</Link> : c.school || <span className="muted">None</span>}</td>
                <td>{roleName(c.role)}</td>
                <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span className="muted">None</span>}</td>
                <td>{c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a> : <span className="muted">None</span>}</td>
                <td>{c.notes || <span className="muted">None</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="linkbtn" onClick={() => edit(c)}>Edit</button>{" "}
                  <button type="button" className="linkbtn" onClick={() => remove(c)}>Remove</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      ) : <p className="muted" style={{ margin: 0 }}>No coaches yet. Pick a school and role above and we fill in the coach we know.</p>}
    </div>
  );
}

/** Let one more person sign in. They see everything and can add film, but can't change anything. */
function SharedAccess() {
  const { state, share, unshare } = useStore();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const add = async () => {
    const err = await share(email);
    setMsg(err ?? `Added. Send them ${typeof window !== "undefined" ? window.location.origin : "this site"} and have them sign in with ${email.trim().toLowerCase()}.`);
    if (!err) setEmail("");
  };
  return (
    <div className="card sec" id="shared-access">
      <h2>Shared access</h2>
      <p className="muted" style={{ margin: 0 }}>They can do everything you can: your map, players, call logs, film, depth charts, deals and agents. Only you can add or remove people here.</p>
      <div className="pair">
        <input aria-label="Their email" type="email" placeholder="Their email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} />
        <button type="button" className="btn" onClick={() => void add()}>Share</button>
      </div>
      {msg && <p style={{ margin: 0 }} role="status">{msg}</p>}
      {(state.shared ?? []).map((p) => (
        <div className="todo" key={p.id}>
          <span className="grow"><b>{p.email}</b> <small className="muted">{p.joined ? "Signed in" : "Hasn't signed in yet"}</small></span>
          <button type="button" className="linkbtn" onClick={() => { if (confirm(`Remove ${p.email}?`)) void unshare(p.id).then((e) => e && setMsg(e)); }}>Remove</button>
        </div>
      ))}
    </div>
  );
}
