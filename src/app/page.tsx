"use client";

import Link from "next/link";
import { UsMap } from "@/components/UsMap";
import { TodoRow } from "@/components/TodoRow";
import { status, TRACKED, type StatusKey } from "@/lib/rules";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

export default function MapPage() {
  const { state } = useStore();
  const statuses = Object.fromEntries(TRACKED.map((c) => [c, status(c, state.done).key])) as Record<string, StatusKey>;
  const count = (k: StatusKey) => Object.values(statuses).filter((v) => v === k).length;
  const next = todos(state).filter((t) => !t.later).slice(0, 3);

  return (
    <section className="view">
      <div>
        <h1>Your licenses</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Tap a state to see what&apos;s left.</p>
      </div>
      <div className="summary">
        <span className="pill go"><span className="dot go" /><b>{count("go")}</b> Licensed</span>
        <span className="pill wip"><span className="dot wip" /><b>{count("wip")}</b> In progress</span>
        <span className="pill stop"><span className="dot stop" /><b>{count("stop")}</b> Not licensed</span>
      </div>
      <div className="card">
        <div className="mapbox"><UsMap statuses={statuses} /></div>
        <div className="legend">
          <span><span className="dot go" />Licensed</span>
          <span><span className="dot wip" />In progress</span>
          <span><span className="dot stop" />Not licensed</span>
          <span><span className="dot off" />Not one of your states</span>
        </div>
      </div>
      <div className="card next">
        <h2>Up next</h2>
        {next.length ? next.map((t) => <TodoRow key={t.key} t={t} />) : <p className="muted">You&apos;re all caught up.</p>}
        <Link className="back" href="/todo" id="see-all">See all to-dos</Link>
      </div>
    </section>
  );
}
