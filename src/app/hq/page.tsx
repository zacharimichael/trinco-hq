"use client";

import { useState } from "react";
import { useTaskRunner } from "@/components/TaskRunner";
import { dealMoney } from "@/lib/agency";
import { STAGES, type AgentContact, type TeamMember } from "@/lib/model";
import { useSaveNote } from "@/components/SaveNote";
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
    return <section className="view"><h1>Agents</h1><p className="muted">Only the agency owner can see this.</p></section>;

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
      <div><h1>Agents</h1><p className="muted" style={{ margin: "6px 0 0" }}>The agents you work with, and the deals.</p></div>

      <AgentList />

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

/** Let one more person sign in, with full access or view only. */
function SharedAccess() {
  const { state, share, unshare, setAllTabs } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const add = async (viewOnly: boolean) => {
    const err = await share(email, viewOnly, password);
    const site = typeof window !== "undefined" ? window.location.origin : "this site";
    const who = email.trim().toLowerCase();
    setMsg(err ?? (password
      ? `Added. Send them ${site}, their email ${who} and the password. They tap "Use a password instead" to sign in.`
      : `Added. Send them ${site} and have them sign in with ${who}.`));
    if (!err) { setEmail(""); setPassword(""); }
  };
  return (
    <div className="card sec" id="shared-access">
      <h2>Shared access</h2>
      <p className="muted" style={{ margin: 0 }}>Full access: they can do everything you can. View only: they can look at everything but can&apos;t change anything. Only you can add or remove people here.</p>
      <div className="pair">
        <input aria-label="Their email" type="email" placeholder="Their email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(true); } }} />
        <input aria-label="A password for them" type="text" autoComplete="off" placeholder="A password for them (8+ characters)" value={password} onChange={(e) => { setPassword(e.target.value); setMsg(""); }} />
      </div>
      <div className="pair">
        <button type="button" className="btn" onClick={() => void add(true)}>View only</button>
        <button type="button" className="btn" onClick={() => void add(false)}>Full access</button>
      </div>
      {msg && <p style={{ margin: 0 }} role="status">{msg}</p>}
      {(state.shared ?? []).map((p) => (
        <div className="todo" key={p.id}>
          <span className="grow"><b>{p.email}</b> <small className="muted">{p.viewOnly ? "View only" : "Full access"}{p.allTabs ? " · All tabs" : ""} · {p.joined ? "Signed in" : "Hasn't signed in yet"}</small></span>
          <label className="linkbtn" title="Also see Home, Licensing, Pod leaders and Calendar">
            <input type="checkbox" checked={!!p.allTabs} onChange={(e) => void setAllTabs(p.id, e.target.checked).then((err) => err && setMsg(err))} /> All tabs
          </label>
          <button type="button" className="linkbtn" onClick={() => { if (confirm(`Remove ${p.email}?`)) void unshare(p.id).then((e) => e && setMsg(e)); }}>Remove</button>
        </div>
      ))}
    </div>
  );
}
