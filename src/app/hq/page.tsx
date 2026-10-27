"use client";

import { useState } from "react";
import { useTaskRunner } from "@/components/TaskRunner";
import { STAGES, type TeamMember } from "@/lib/model";
import { DAY, dueText, myStates, RULES, startOfToday, status } from "@/lib/rules";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function HqPage() {
  const { state, update, mode, inviteAgent, email: myEmail } = useStore();
  const [inviteError, setInviteError] = useState("");
  const live = mode === "live";
  const owner = !live || state.me?.role === "owner";
  const canOnboard = owner || state.me?.role === "editor";
  const run = useTaskRunner();
  const { agency } = state;
  if (live && state.me?.role === "agent")
    return <section className="view"><h1>HQ</h1><p className="muted">Only the agency owner can see HQ.</p></section>;

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
  const split = (agent: string) => (agent === "You" ? 0 : state.team.find((t) => t.name === agent)?.split ?? agency.split);
  const cut = (d: (typeof state.deals)[number]) => (d.amount * d.fee) / 100;
  const house = (d: (typeof state.deals)[number]) => (cut(d) * (100 - split(d.agent))) / 100;
  const paid = state.deals.filter((d) => d.status === "Paid");
  const earned = paid.reduce((s, d) => s + house(d), 0);
  const toAgents = paid.reduce((s, d) => s + cut(d) - house(d), 0);
  const coming = state.deals.filter((d) => d.status !== "Paid").reduce((s, d) => s + house(d), 0);

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
            { key: "email", label: "Agent's email", value: "" },
            { key: "split", label: "Agent's share of commissions (%)", value: String(agency.split) },
          ] },
          { type: "doc", title: "Review the agency agreement", body: (d) => (<>
            <h4>Independent Agent Agreement</h4>
            <p><b>Agency:</b> {agency.name}<br /><b>Agent:</b> {String(d.name)} · {String(d.email)}</p>
            <p>The agent represents athletes for NIL on behalf of the agency. The agent keeps {String(d.split)}% of commissions on deals they close, and the agency keeps the rest.</p>
            <p>The agent must hold every required state license or registration, use the agency&apos;s contracts and follow every rule in this app. The agency can end this agreement if the agent falls out of compliance.</p>
          </>) },
          { type: "sign", title: "Sign", what: "the agency agreement" },
        ],
        done: (d) => {
          const email = String(d.email || "").trim().toLowerCase();
          // Everyone already in the agency, including you, can't be added again.
          const taken = [state.profile.email, myEmail ?? "", ...state.team.map((t) => t.email), ...(state.shared ?? []).map((p) => p.email)]
            .some((e) => e && e.toLowerCase() === email);
          if (live && !email) return { msg: "Not added: type the agent's email and try again." };
          if (live && taken)
            return { msg: [state.profile.email, myEmail].some((e) => e?.toLowerCase() === email)
              ? "Not added: that's your own email. You already count as an agent here, shown as \"You\" in the Agents list."
              : "Not added: someone with that email is already in your agency." };
          setInviteError("");
          if (live) void inviteAgent(String(d.name || "New agent"), email, Number(d.split) || agency.split)
            .then((err) => err && setInviteError(`${d.name || "The new agent"} wasn't saved: ${err}`));
          return {
            msg: live
              ? `${d.name || "Your new agent"} is added. Ask them to sign in at this site with ${d.email || "their email"}, and they'll be taken straight to the agreement.`
              : `Invite sent to ${d.email || "the new agent"}. They'll sign here, then their licensing checklist starts automatically.`,
            doc: `Agency agreement: ${d.name}`,
          };
        },
      },
      (draft, d) => {
        if (live) return;
        draft.team.push({ id: `t${Date.now()}`, name: String(d.name || "New agent"), email: String(d.email || ""), stage: 0, split: Number(d.split) || agency.split, done: {}, athletes: [] });
      },
    );

  return (
    <section className="view">
      <div><h1>HQ</h1><p className="muted" style={{ margin: "6px 0 0" }}>{agency.name} · everything about your agency in one place.</p></div>

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
        {inviteError && <p role="alert" style={{ margin: 0, color: "var(--stop)" }}>{inviteError}</p>}
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
