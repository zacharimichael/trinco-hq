import type { AppState } from "./model";

/** Everything with a date, for the calendar: events, calls to make and your own to-dos. */
export type DayItem = { key: string; date: string; time: string | null; title: string; kind: "event" | "call" | "todo"; player: string | null; id: string };

export function dayItems(s: AppState): DayItem[] {
  return [
    ...(s.events ?? []).map((e) => ({ key: `e${e.id}`, date: e.date, time: e.time, title: e.title, kind: "event" as const, player: e.player, id: e.id })),
    ...(s.calls ?? []).filter((c) => !c.done && c.due).map((c) => ({ key: `c${c.id}`, date: c.due!, time: null, title: `Call ${c.name || "back"}${c.why ? `: ${c.why}` : ""}`, kind: "call" as const, player: c.player, id: c.id })),
    ...(s.myTodos ?? []).filter((m) => !m.done && m.due).map((m) => ({ key: `t${m.id}`, date: m.due!, time: null, title: m.title, kind: "todo" as const, player: null, id: m.id })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

/** YYYY-MM-DD in local time. */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const longDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
export const shortDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
export const timeText = (t: string | null) => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
