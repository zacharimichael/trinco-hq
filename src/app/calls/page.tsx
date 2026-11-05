"use client";

import { useState } from "react";
import Link from "next/link";
import { shortDay, ymd } from "@/lib/calendar";
import { WHO_LABEL } from "@/lib/intake";
import type { CallItem } from "@/lib/model";
import { hsClassText, newId, schoolById, shownPos, yearShort } from "@/lib/players";
import { useStore } from "@/lib/store";
import { lastTalk, talkedTo } from "@/lib/toTalk";
import { useToTalk } from "@/lib/useToTalk";

/** People to call: late and today first, then by day, then anytime. */
export default function CallsPage() {
  const { state, update } = useStore();
  const players = state.scouting.players.filter((p) => p.name && shownPos(p));
  const today = ymd(new Date());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [why, setWhy] = useState("");
  const [due, setDue] = useState("");
  const [player, setPlayer] = useState("");
  const [showDone, setShowDone] = useState(false);

  const calls = state.calls ?? [];
  const schoolOf = schoolById(state.scouting);
  const schoolLink = (id: string) => { const s = schoolOf(id); return s ? `/schools?s=${s.state}&school=${encodeURIComponent(s.id)}` : "/schools"; };
  // Every call logged, on players and on schools, newest first.
  const logged = [
    ...state.scouting.players.filter(shownPos).flatMap((p) => p.talks.map((t) => ({ key: `p-${p.id}-${t.date}`, date: t.date, note: t.note, title: p.name || "A player", sub: WHO_LABEL[t.who], href: `/players/${p.id}#call-log` }))),
    ...(state.schoolCalls ?? []).map((c) => ({ key: c.id, date: c.date, note: c.note, title: schoolOf(c.school)?.name ?? "A school", sub: [WHO_LABEL[c.who], c.name].filter(Boolean).join(", "), href: schoolLink(c.school) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const [showAll, setShowAll] = useState(false);
  // Players to talk to have their own card above; the rest of the list is everyone else.
  const open = calls.filter((c) => !c.done && !c.first).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const done = calls.filter((c) => c.done && !c.first);
  const set = (id: string, patch: Partial<CallItem>) => update((d) => { const c = d.calls?.find((x) => x.id === id); if (c) Object.assign(c, patch); });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    update((d) => { (d.calls ??= []).push({ id: newId("c"), name: name.trim(), phone: phone.trim(), why: why.trim(), due: due || null, player: player || null, done: false }); });
    setName(""); setPhone(""); setWhy(""); setDue(""); setPlayer("");
  };

  const Row = ({ c }: { c: CallItem }) => {
    const p = c.player ? state.scouting.players.find((x) => x.id === c.player) : undefined;
    const sch = c.school ? schoolOf(c.school) : undefined;
    const late = !c.done && !!c.due && c.due < today;
    return (
      <div className="todo">
        <span className={`dot ${late || c.due === today ? "stop" : "wip"}`} />
        <span className="grow">
          <b>{c.name || "Someone"}</b>{c.why && <> · {c.why}</>}
          <small>
            {[c.due ? (c.due === today ? "Today" : late ? `Late, ${shortDay(c.due)}` : shortDay(c.due)) : "Anytime", c.phone].filter(Boolean).join(" · ")}
            {p && <> · <Link href={`/players/${p.id}#log-call`}>{p.name}</Link></>}
            {sch && <> · <Link href={schoolLink(sch.id)}>{sch.name}</Link></>}
          </small>
        </span>
        {c.phone && !c.done && <a className="btn ghost" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>📞 Call</a>}
        {c.done
          ? <button className="linkbtn" type="button" onClick={() => set(c.id, { done: false })}>Undo</button>
          : <button className="btn" type="button" onClick={() => set(c.id, { done: true })}>✓ Done</button>}
        <button className="linkbtn" type="button" aria-label={`Delete call to ${c.name}`} onClick={() => update((d) => { d.calls = (d.calls ?? []).filter((x) => x.id !== c.id); })}>✕</button>
      </div>
    );
  };

  return (
    <section className="view">
      <ToTalk />

      <div className="card next" id="call-list">
        <h2>Calls to make</h2>
        {!open.length && <p className="muted" style={{ margin: 0 }}>Nobody to call. Add someone below, or log a call on a player or school and the AI adds callbacks here.</p>}
        {open.map((c) => <Row key={c.id} c={c} />)}
      </div>

      <form className="card sec" id="add-call" onSubmit={add}>
        <h2>Add someone to call</h2>
        <div className="formgrid">
          <div className="field"><label htmlFor="call-name">Who</label><input id="call-name" value={name} placeholder="e.g. Coach Diaz" onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="call-phone">Phone (optional)</label><input id="call-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="call-why">Why (optional)</label><input id="call-why" value={why} placeholder="e.g. Follow up on NIL offer" onChange={(e) => setWhy(e.target.value)} /></div>
        <div className="formgrid">
          <div className="field"><label htmlFor="call-due">When (optional)</label><input id="call-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="field">
            <label htmlFor="call-player">About a player (optional)</label>
            <select id="call-player" value={player} onChange={(e) => setPlayer(e.target.value)}>
              <option value="">No one</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn" type="submit" disabled={!name.trim()} style={{ alignSelf: "flex-start" }}>+ Add to call list</button>
      </form>

      <div className="card sec" id="calls-logged">
        <h2>Calls you&apos;ve logged</h2>
        {!logged.length && <p className="muted" style={{ margin: 0 }}>None yet. Log a call on a player, or on a school from the School map.</p>}
        {(showAll ? logged : logged.slice(0, 10)).map((c) => (
          <Link key={c.key} href={c.href} className="step" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="grow">
              <div className="t">{c.title}<span className="muted" style={{ fontWeight: 400 }}> · {c.sub}</span></div>
              <div className="d" style={{ whiteSpace: "pre-wrap" }}>{c.note.length > 160 ? `${c.note.slice(0, 160)}…` : c.note}</div>
              <div className="d">{new Date(c.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>
            </div>
          </Link>
        ))}
        {logged.length > 10 && <button className="linkbtn" type="button" onClick={() => setShowAll(!showAll)} style={{ alignSelf: "flex-start" }}>{showAll ? "Show fewer" : `Show all ${logged.length}`}</button>}
      </div>

      {!!done.length && (
        <div className="card sec">
          <button className="linkbtn" type="button" onClick={() => setShowDone(!showDone)} style={{ alignSelf: "flex-start" }}>{showDone ? "Hide" : "Show"} done calls ({done.length})</button>
          {showDone && done.map((c) => <Row key={c.id} c={c} />)}
        </div>
      )}
    </section>
  );
}

/** Players you haven't spoken to yet. Logging a call with the player or a parent ticks them off; so does ✓ Talked. */
function ToTalk() {
  const { state } = useStore();
  const { open, done, onList, add, talked, undo, drop } = useToTalk();
  const schoolOf = schoolById(state.scouting);
  const byId = new Map(state.scouting.players.map((p) => [p.id, p]));
  const [q, setQ] = useState("");
  const [showDone, setShowDone] = useState(false);
  const players = state.scouting.players.filter((p) => p.name && shownPos(p));
  const never = players.filter((p) => !talkedTo(p));
  const found = q.trim().length < 2 ? [] : players
    .filter((p) => !onList(p.id) && `${p.name} ${schoolOf(p.school)?.name ?? ""} ${p.jucoSchool ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(talkedTo(a)) - Number(talkedTo(b)) || a.name.localeCompare(b.name))
    .slice(0, 8);
  const where = (id: string | null) => {
    const p = id ? byId.get(id) : undefined;
    if (!p) return "";
    return [p.hsClass != null ? hsClassText(p.hsClass) : p.jucoSchool ? `JUCO · ${p.jucoSchool}` : schoolOf(p.school)?.name, yearShort(p.year)].filter(Boolean).join(" · ");
  };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="card next" id="to-talk">
      <h2>Players to talk to</h2>
      {!open.length && <p className="muted" style={{ margin: 0 }}>Nobody yet. Find a player below, or tap &ldquo;+ Players to talk to&rdquo; on a profile.</p>}
      {open.map((c) => {
        const p = c.player ? byId.get(c.player) : undefined;
        const last = p ? lastTalk(p) : null;
        return (
          <div className="todo wraps" key={c.id}>
            <span className="dot wip" />
            <span className="grow">
              <b>{p ? <Link href={`/players/${p.id}`}>{p.name}</Link> : c.name}</b>
              <small>{[where(c.player), last ? `Last talked ${fmt(last)}` : "Never talked to"].filter(Boolean).join(" · ")}</small>
            </span>
            {p && <Link className="btn ghost" href={`/players/${p.id}#log-call`}>📞 Log call</Link>}
            <button className="btn" type="button" onClick={() => talked(c.id)}>✓ Talked</button>
            <button className="linkbtn" type="button" aria-label={`Take ${c.name} off the list`} onClick={() => drop(c.id)}>✕</button>
          </div>
        );
      })}

      <div className="field" style={{ marginTop: 6 }}>
        <label htmlFor="to-talk-find">Add a player</label>
        <input id="to-talk-find" placeholder="Type a name or school" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {found.map((p) => (
        <div className="todo wraps" key={p.id}>
          <span className="grow"><b>{p.name}</b><small>{[where(p.id), talkedTo(p) ? "Talked before" : "Never talked to"].filter(Boolean).join(" · ")}</small></span>
          <button className="btn" type="button" onClick={() => add([p])}>+ Add</button>
        </div>
      ))}
      {q.trim().length >= 2 && !found.length && <p className="muted" style={{ margin: 0 }}>No one by that name who isn&apos;t on the list already.</p>}
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        {never.length} {never.length === 1 ? "player has" : "players have"} no call logged yet. <Link href="/players?talk=never">See them on Players</Link>
      </p>

      {!!done.length && (<>
        <button className="linkbtn" type="button" onClick={() => setShowDone(!showDone)} style={{ alignSelf: "flex-start" }}>{showDone ? "Hide" : "Show"} talked to ({done.length})</button>
        {showDone && done.map((c) => (
          <div className="todo wraps" key={c.id}>
            <span className="dot go" />
            <span className="grow"><b>{c.player && byId.get(c.player) ? <Link href={`/players/${c.player}`}>{byId.get(c.player)!.name}</Link> : c.name}</b>
              <small>{[where(c.player), c.doneOn && `Talked ${fmt(c.doneOn)}`].filter(Boolean).join(" · ")}</small></span>
            <button className="linkbtn" type="button" onClick={() => undo(c.id)}>Undo</button>
          </div>
        ))}
      </>)}
    </div>
  );
}
