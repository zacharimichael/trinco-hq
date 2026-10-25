"use client";

import Link from "next/link";
import US from "@/data/us-states.json";
import { applied, approvalId, LABEL, RULES, status } from "@/lib/rules";
import { stateTasks } from "@/lib/tasks";
import { useStore } from "@/lib/store";
import { useTaskRunner } from "./TaskRunner";

const NAMES = US as Record<string, { n: string }>;

/** One state's licensing steps, shown next to the map. Start opens each step's guided flow. */
export function StatePanel({ code, athletes = [], onClose }: { code: string; athletes?: { name: string; href?: string; school?: string }[]; onClose: () => void }) {
  const { state } = useStore();
  const run = useTaskRunner();
  const R = RULES[code];

  const close = <button className="back" id="close-state" type="button" onClick={onClose}>✕ Close</button>;
  const mine = (
    <div className="card sec" id="state-athletes">
      <h2>My athletes here</h2>
      {athletes.length ? athletes.map((a, i) => (
        <div className="todo" key={i}>
          <span className="grow">{a.href ? <Link href={a.href}><b>{a.name}</b></Link> : <b>{a.name}</b>}{a.school && <small>{a.school}</small>}</span>
        </div>
      )) : <p className="muted" style={{ margin: 0 }}>None yet.</p>}
    </div>
  );
  if (!R)
    return (
      <div className="panelbody" id="state-panel">
        <div className="card sec">
          {close}
          <div className="statehead"><h1>{NAMES[code]?.n ?? code}</h1></div>
          <p className="muted" style={{ margin: 0 }}>Coming soon. We&apos;re adding this state&apos;s steps now.</p>
        </div>
        {mine}
      </div>
    );

  const s = status(code, state.done);
  const pct = s.total ? Math.round((s.n / s.total) * 100) : 0;
  const tasks = stateTasks(code, state.profile);

  return (
    <div className="panelbody" id="state-panel">
      <div className="card">
        {close}
        <div className="statehead" style={{ marginTop: 8 }}><h1>{R.name}</h1><span className={`badge ${s.key}`}>{LABEL[s.key]}</span></div>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {R.license_required ? `${s.n} of ${s.total} steps done` : "No state license needed. Just this short list."}
          {R.summary && <><br />{R.summary}</>}
        </p>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      </div>
      {mine}

      {R.sections.map((se) => (
        <div className="card sec" key={se.id}>
          <h2>{se.title}</h2>
          {se.id === "get_licensed" ? (<>
            {se.steps.map((st) => {
              const def = tasks[st.id];
              if (!def)
                return (
                  <div className="step" key={st.id}><span className="mark info">✓</span>
                    <div><div className="t">{st.text}</div>{st.detail && <div className="d">{st.detail}</div>}</div></div>
                );
              const blocked = (def.needs ?? []).some((n) => !state.done[n]);
              return (
                <div className="todo" key={st.id}>
                  <span className="grow"><b>{def.title}</b>{st.detail && <small>{st.detail}</small>}</span>
                  {state.done[st.id] ? <span className="okchip">✓ Done</span>
                    : blocked ? <span className="muted" style={{ fontSize: 14 }}>After the steps above</span>
                    : <button className={`btn ${def.optional ? "ghost" : ""}`} data-ltask={st.id}
                        onClick={() => run(def, (d) => { d.done[st.id] = true; })}>{def.cta}</button>}
                </div>
              );
            })}
            {applied(code, state.done) && (
              <div className="todo"><span className="grow"><b>{R.name} approves your license</b></span>
                {state.done[approvalId(code)] ? <span className="okchip">✓ Approved</span> : <span className="waitchip">● Waiting</span>}</div>
            )}
          </>) : (<>
            {se.id === "every_athlete" && <p className="muted" style={{ margin: 0 }}>We handle these for you each time you add an athlete.</p>}
            {se.id === "renew" && <p className="muted" style={{ margin: 0 }}>We&apos;ll remind you and you&apos;ll renew right here.</p>}
            {se.steps.map((st) => (
              <div className="step" key={st.id}>
                <span className={`mark ${st.type === "rule" || se.id === "stay_compliant" ? "rule" : "list"}`}>
                  {st.type === "rule" ? "!" : st.type === "deadline" ? "⏱" : "•"}
                </span>
                <div><div className="t">{st.text}</div>{st.detail && <div className="d">{st.detail}</div>}</div>
              </div>
            ))}
          </>)}
        </div>
      ))}
    </div>
  );
}
