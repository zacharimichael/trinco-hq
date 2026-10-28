"use client";

import { useState } from "react";
import Link from "next/link";
import { dayItems, longDay, timeText, ymd, type DayItem } from "@/lib/calendar";
import { newId } from "@/lib/players";
import { useStore } from "@/lib/store";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A month at a glance: your events, calls to make and to-dos. Tap a day to see it or add to it. */
export default function CalendarPage() {
  const { state, update } = useStore();
  const today = ymd(new Date());
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState(today);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const items = dayItems(state);
  const byDay = new Map<string, DayItem[]>();
  items.forEach((i) => byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]));
  const start = new Date(month); start.setDate(1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const weeks = days[35].getMonth() === month.getMonth() ? 6 : 5;
  const go = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const player = (id: string | null) => (id ? state.scouting.players.find((p) => p.id === id) : undefined);
  const onDay = byDay.get(picked) ?? [];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((d) => { (d.events ??= []).push({ id: newId("e"), date: picked, time: time || null, title: title.trim(), player: null }); });
    setTitle(""); setTime("");
  };
  const remove = (i: DayItem) => update((d) => {
    if (i.kind === "event") d.events = (d.events ?? []).filter((x) => x.id !== i.id);
    if (i.kind === "call") { const c = d.calls?.find((x) => x.id === i.id); if (c) c.done = true; }
    if (i.kind === "todo") { const m = d.myTodos?.find((x) => x.id === i.id); if (m) m.done = true; }
  });

  return (
    <section className="view">
      <div className="card sec">
        <div className="calhead">
          <button className="btn ghost" type="button" aria-label="Last month" onClick={() => go(-1)}>‹</button>
          <h2>{month.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
          <button className="btn ghost" type="button" aria-label="Next month" onClick={() => go(1)}>›</button>
        </div>
        <div className="calgrid" id="calendar">
          {WEEKDAYS.map((w) => <div key={w} className="wd">{w}</div>)}
          {days.slice(0, weeks * 7).map((d) => {
            const k = ymd(d);
            const list = byDay.get(k) ?? [];
            return (
              <button key={k} type="button" aria-pressed={picked === k} aria-label={`${longDay(k)}, ${list.length} things`}
                className={`calday ${d.getMonth() !== month.getMonth() ? "out" : ""} ${k === today ? "today" : ""}`} onClick={() => setPicked(k)}>
                <span className="n">{d.getDate()}</span>
                {list.slice(0, 3).map((i) => <span key={i.key} className={`it ${i.kind}`}>{i.title}</span>)}
                {list.length > 3 && <small className="muted">+{list.length - 3}</small>}
              </button>
            );
          })}
        </div>
        {month.getMonth() !== new Date().getMonth() && <button className="linkbtn" type="button" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setPicked(today); }}>Back to today</button>}
      </div>

      <div className="card next" id="day">
        <h2>{picked === today ? "Today" : longDay(picked)}</h2>
        {!onDay.length && <p className="muted" style={{ margin: 0 }}>Nothing on this day.</p>}
        {onDay.map((i) => {
          const p = player(i.player);
          return (
            <div className="todo" key={i.key}>
              <span className={`dot ${i.kind === "call" ? "wip" : "go"}`} />
              <span className="grow">
                <b>{i.title}</b>
                <small>{[i.time && timeText(i.time), i.kind === "call" ? "Call list" : i.kind === "todo" ? "Your to-do" : "", p?.name].filter(Boolean).join(" · ")}
                  {p && <> · <Link href={`/players/${p.id}`}>Open profile</Link></>}</small>
              </span>
              <button className="linkbtn" type="button" aria-label={`Remove ${i.title}`} onClick={() => remove(i)}>{i.kind === "event" ? "✕" : "✓ Done"}</button>
            </div>
          );
        })}
        <form className="addtodo" id="add-event" onSubmit={add}>
          <input aria-label="What's happening" placeholder="Add to this day, e.g. Visit at Auburn" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input aria-label="Time (optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <button className="btn" type="submit" disabled={!title.trim()}>+ Add</button>
        </form>
      </div>
    </section>
  );
}
