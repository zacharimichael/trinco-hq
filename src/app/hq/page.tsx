"use client";

import { useTaskRunner } from "@/components/TaskRunner";
import { STAGES, type TeamMember } from "@/lib/model";
import { DAY, dueText, RULES, startOfToday, status, TRACKED } from "@/lib/rules";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function HqPage() {
  const { state, update } = useStore();
  const run = useTaskRunner();
  const { agency } = state;

  const me: TeamMember = {
    id: "me", name: "You", email: state.profile.email, stage: 3, split: 100, done: state.done,
    athletes: state.athletes.map((a) => ({ name: a.name, school: a.school, sport: a.sport, state: a.state, contract: a.done.contract ? "Signed" : "Not sent" })),
  };
  // An agent who is getting licensed goes Active once every state on their map is green.
  const allGreen = (t: TeamMember) => TRACKED.every((c) => status(c, t.done).key === "go");
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
    if (t.stage === 3 && t.id !== "me") TRACKED.forEach((c) => { if (status(c, t.done).key !== "go") attention.push(`${t.name}: not licensed in ${RULES[c].name}`); });
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
        done: (d) => ({ msg: `Invite sent to ${d.email || "the new agent"}. They'll sign here, then their licensing checklist starts automatically.`, doc: `Agency agreement: ${d.name}` }),
      },
      (draft, d) => {
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
          <button className="btn" id="onboard" type="button" onClick={onboard}>+ Add a new agent</button>
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
                    {i === 2 && <small>{TRACKED.map((c) => <span key={c}><span className={`dot ${status(c, t.done).key}`} /> {c} </span>)}</small>}
                    {i < 2 && t.id !== "me" && (
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
              <td><div className="dots">{TRACKED.map((c) => <span className="chip" key={c}><span className={`dot ${status(c, p.done).key}`} />{c}</span>)}</div></td>
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
    </section>
  );
}
