"use client";

import { useState } from "react";
import { TodoRow } from "@/components/TodoRow";
import { useTaskRunner } from "@/components/TaskRunner";
import US from "@/data/us-states.json";
import { fmt } from "@/lib/rules";
import { athleteTasks, todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

const ALL_STATES = Object.keys(US).sort();

export default function TodoPage() {
  const { state } = useStore();
  const run = useTaskRunner();
  const now = todos(state).filter((t) => !t.later);
  const docs = [...state.docs].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const addAthlete = () =>
    run(
      {
        id: "add_athlete", title: "Add an athlete", cta: "Add",
        screens: () => [{ type: "fields", title: "Who are you signing?", fields: [
          { key: "name", label: "Athlete's name", value: "" },
          { key: "school", label: "School", value: "" },
          { key: "state", label: "School's state", value: state.profile.address.match(/\b([A-Z]{2})\s+\d{5}/)?.[1] ?? "FL", options: ALL_STATES },
          { key: "sport", label: "Sport", value: "" },
        ] }],
        done: (d) => ({ msg: `${d.name || "Your athlete"} is added. Their to-dos are on your list.` }),
      },
      (draft, d) => {
        draft.athletes.push({ id: `a${Date.now()}`, name: String(d.name || "New athlete"), school: String(d.school || ""), state: String(d.state), sport: String(d.sport || ""), signed: null, done: {} });
      },
    );

  return (
    <section className="view">
      <h1>To-do</h1>
      <div className="card next">
        <h2>Do these now</h2>
        {now.length ? now.map((t) => <TodoRow key={t.key} t={t} />) : <p className="muted">Nothing to do. You&apos;re all caught up.</p>}
        <AddTodo />
      </div>
      <div className="grid2">
        <div className="card sec">
          <h2>Athletes</h2>
          {state.athletes.map((a) => {
            const left = athleteTasks(a, state.profile).filter((t) => !a.done[t.id]).length;
            return (
              <div className="todo" key={a.id}>
                <span className="grow"><b>{a.name}</b><small>{a.school}{a.sport && ` · ${a.sport}`}{a.signed && ` · contract signed ${fmt(a.signed)}`}</small></span>
                {left ? <span className="badge wip">{left} to do</span> : <span className="okchip">✓ All set</span>}
              </div>
            );
          })}
          <button className="btn" id="add-ath" type="button" onClick={addAthlete}>+ Add an athlete</button>
        </div>
        <div className="card sec">
          <h2>Documents</h2>
          {docs.map((d, i) => (
            <div className="todo" key={d.name + i}><span className="mark list">✎</span><span className="grow"><b>{d.name}</b><small>Saved {fmt(d.date)}</small></span>{d.pdf && <a className="btn ghost" href={d.pdf} download={`${d.name}.pdf`}>Signed PDF</a>}</div>
          ))}
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Everything you sign, pay or book is saved here automatically.</p>
        </div>
      </div>
    </section>
  );
}

/** Add your own to-do: what to do and, if it has one, when it's due. */
function AddTodo() {
  const { update } = useStore();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((d) => { (d.myTodos ??= []).push({ id: `m${Date.now().toString(36)}`, title: title.trim(), due: due || null, done: false }); });
    setTitle(""); setDue("");
  };
  return (
    <form className="addtodo" id="add-todo" onSubmit={add}>
      <input aria-label="New to-do" placeholder="Add a to-do, e.g. Call the Florida GM" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input aria-label="Due date (optional)" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <button className="btn" type="submit" disabled={!title.trim()}>+ Add</button>
    </form>
  );
}
