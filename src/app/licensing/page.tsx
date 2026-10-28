"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UsMap } from "@/components/UsMap";
import { StatePanel } from "@/components/StatePanel";
import { TodoRow } from "@/components/TodoRow";
import { status, TRACKED, type StatusKey } from "@/lib/rules";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";
import { athletesByState } from "@/lib/players";

export default function MapPage() {
  const { state } = useStore();
  const statuses = Object.fromEntries(TRACKED.map((c) => [c, status(c, state.done).key])) as Record<string, StatusKey>;
  const count = (k: StatusKey) => Object.values(statuses).filter((v) => v === k).length;
  const mine = athletesByState(state.athletes, state.scouting);
  const counts = Object.fromEntries(Object.entries(mine).map(([c, l]) => [c, l.length]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const next = todos(state).filter((t) => !t.later).slice(0, 3);

  // The open state lives in the URL (?s=FL) so it survives a refresh and can be linked.
  const [open, setOpen] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("s");
    if (s) setOpen(s.toUpperCase());
  }, []);
  const select = useCallback((code: string | null) => {
    setOpen(code);
    const url = new URL(window.location.href);
    if (code) url.searchParams.set("s", code); else url.searchParams.delete("s");
    window.history.replaceState(null, "", url);
    if (code && window.matchMedia("(max-width: 899px)").matches)
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  return (
    <section className="view">
      <div>
        <h1>Your licenses</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Tap a state to get licensed there.</p>
      </div>
      <div className="summary">
        <span className="pill go"><span className="dot go" /><b>{count("go")}</b> Licensed</span>
        <span className="pill wip"><span className="dot wip" /><b>{count("wip")}</b> In progress</span>
        <span className="pill stop"><span className="dot stop" /><b>{count("stop")}</b> Not licensed</span>
        <span className="pill ath"><span className="athdot">#</span><b>{total}</b> My athletes</span>
      </div>
      <div className={`maplayout ${open ? "open" : ""}`}>
        <div className="col">
          <div className="card">
            <div className="mapbox"><UsMap statuses={statuses} counts={counts} selected={open} onSelect={select} /></div>
            <div className="legend">
              <span><span className="dot go" />Licensed</span>
              <span><span className="dot wip" />In progress</span>
              <span><span className="dot stop" />Not licensed</span>
              <span><span className="dot off" />Coming soon</span>
              <span><span className="athdot">2</span>My athletes there</span>
            </div>
          </div>
          <div className="card next">
            <h2>Up next</h2>
            {next.length ? next.map((t) => <TodoRow key={t.key} t={t} />) : <p className="muted">Nothing yet. Tap a state to start.</p>}
            <Link className="back" href="/licensing/todo" id="see-all">See all to-dos</Link>
          </div>
        </div>
        {open && <div ref={panel} className="statepanel"><StatePanel key={open} code={open} athletes={mine[open] ?? []} onClose={() => select(null)} /></div>}
      </div>
    </section>
  );
}
