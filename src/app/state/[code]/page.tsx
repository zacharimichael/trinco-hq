"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { approvalId, LABEL, RULES, status } from "@/lib/rules";
import { licenseTasks } from "@/lib/tasks";
import { useStore } from "@/lib/store";
import { useTaskRunner } from "@/components/TaskRunner";

export default function StatePage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  const { state } = useStore();
  const run = useTaskRunner();
  const R = RULES[code];
  if (!R) notFound();

  const s = status(code, state.done);
  const pct = s.total ? Math.round((s.n / s.total) * 100) : 0;
  const tasks = licenseTasks(state.profile);
  const submitted = state.done[`${code.toLowerCase()}_submit`];

  return (
    <section className="view">
      <Link className="back" href="/" id="back">← All states</Link>
      <div className="card">
        <div className="statehead"><h1>{R.name}</h1><span className={`badge ${s.key}`}>{LABEL[s.key]}</span></div>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {R.license_required ? `${s.n} of ${s.total} steps done` : "No state license needed. Just this short list."}
        </p>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      </div>

      {R.sections.map((se) => (
        <div className="card sec" key={se.id}>
          <h2>{se.title}</h2>
          {se.id === "get_licensed" ? (<>
            {se.steps.map((st) => {
              const def = tasks[st.id];
              if (!def)
                return (
                  <div className="step" key={st.id}><span className="mark info">✓</span>
                    <div><div className="t">{st.text}</div><div className="d">{st.detail}</div></div></div>
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
            {R.license_required && submitted && (
              <div className="todo"><span className="grow"><b>{R.name} approves your license</b></span>
                {state.done[approvalId(code)] ? <span className="okchip">✓ Approved</span> : <span className="waitchip">● Waiting</span>}</div>
            )}
          </>) : (<>
            {se.id === "every_athlete" && <p className="muted" style={{ margin: 0 }}>We handle these for you each time you add an athlete.</p>}
            {se.id === "renew" && <p className="muted" style={{ margin: 0 }}>We&apos;ll remind you and you&apos;ll renew right here.</p>}
            {se.steps.map((st) => (
              <div className="step" key={st.id}>
                <span className={`mark ${st.type === "rule" ? "rule" : se.id === "stay_compliant" ? "rule" : "list"}`}>
                  {st.type === "rule" ? "!" : st.type === "deadline" ? "⏱" : "•"}
                </span>
                <div><div className="t">{st.text}</div>{st.detail && <div className="d">{st.detail}</div>}</div>
              </div>
            ))}
          </>)}
        </div>
      ))}
    </section>
  );
}
