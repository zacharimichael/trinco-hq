"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddTodo } from "@/components/AddTodo";
import { TodoRow } from "@/components/TodoRow";
import { dealMoney } from "@/lib/agency";
import { dayItems, shortDay, timeText, ymd } from "@/lib/calendar";
import { fmt, myStates, RULES, status, TRACKED } from "@/lib/rules";
import { POS_SHORT, POSITIONS, money } from "@/lib/players";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

/** The Trin Co Agency dashboard. Every area reports up here: licensing, scouting, agents and deals, and your to-dos. */
export default function AgencyHome() {
  const { state, mode } = useStore();
  const router = useRouter();
  // Old map links were /?s=FL. The map lives in Licensing now.
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("s");
    if (s) router.replace(`/licensing?s=${s.toUpperCase()}`);
  }, [router]);

  const owner = mode === "demo" || ["owner", "editor", "viewer"].includes(state.me?.role ?? "");
  const all = todos(state);
  const next = all.filter((t) => !t.later).slice(0, 6);

  const mine = myStates(state.done, state.athletes.map((a) => a.state));
  const keyOf = (c: string) => status(c, state.done).key;
  const licensed = mine.filter((c) => keyOf(c) === "go");
  const inProgress = mine.filter((c) => keyOf(c) === "wip");
  const notYet = mine.filter((c) => keyOf(c) === "stop");
  const renewal = all.filter((t) => t.later && t.due).sort((a, b) => a.due!.getTime() - b.due!.getTime())[0];
  const checked = TRACKED.map((c) => RULES[c].last_researched).sort()[0];

  const players = state.scouting.players;
  const lastCall = players.flatMap((p) => p.talks.map((t) => ({ ...t, player: p }))).sort((a, b) => b.date.localeCompare(a.date))[0];

  const today = ymd(new Date());
  const callsDue = (state.calls ?? []).filter((c) => !c.done && (!c.due || c.due <= today));
  const comingUp = dayItems(state).filter((i) => i.kind === "event" && i.date >= today).slice(0, 2);

  const { earned, coming } = dealMoney(state);
  const athletes = state.athletes.length + state.team.reduce((n, t) => n + t.athletes.length, 0);

  return (
    <section className="view">
      <div>
        <h1>{state.agency.name} Agency</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Everything in one place. Tap an area to open it.</p>
      </div>

      <div className="card next" id="up-next">
        <h2>Up next</h2>
        {next.length ? next.map((t) => <TodoRow key={t.key} t={t} />) : <p className="muted" style={{ margin: 0 }}>Nothing to do. You&apos;re all caught up.</p>}
        <AddTodo />
      </div>

      <div className="grid2">
        <Link href="/licensing" className="card sec area" id="area-licensing">
          <h2>Licensing &amp; compliance</h2>
          <div className="summary">
            <span className="pill go"><span className="dot go" /><b>{licensed.length}</b> Licensed</span>
            <span className="pill wip"><span className="dot wip" /><b>{inProgress.length}</b> In progress</span>
            {!!notYet.length && <span className="pill stop"><span className="dot stop" /><b>{notYet.length}</b> Not licensed</span>}
          </div>
          {!!notYet.length && <p className="warnline">You have athletes in {notYet.map((c) => RULES[c].name).join(", ")} and haven&apos;t started the steps there.</p>}
          <p className="muted" style={{ margin: 0 }}>
            {renewal ? <>Next renewal: {renewal.where.split(" · ")[0]}, {fmt(renewal.due!)}<br /></> : null}
            Rules for all {TRACKED.length} states, checked {fmt(checked)}
          </p>
          <span className="go-on">Open licensing →</span>
        </Link>

        <Link href="/players" className="card sec area" id="area-scouting">
          <h2>Scouting</h2>
          <div className="summary">
            {POSITIONS.map((p) => <span className="pill ath" key={p}><b>{players.filter((x) => x.pos === p).length}</b> {POS_SHORT[p]}</span>)}
            <span className="pill ath"><b>{players.filter((x) => x.client).length}</b> Signed</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {lastCall ? <>Last call: {lastCall.player.name || "a player"}, {fmt(lastCall.date)}</> : "No calls logged yet."}
          </p>
          <span className="go-on">Open scouting →</span>
        </Link>

        <Link href="/calls" className="card sec area" id="area-calls">
          <h2>Calls &amp; calendar</h2>
          <div className="summary">
            <span className={`pill ${callsDue.some((c) => c.due && c.due <= today) ? "stop" : "ath"}`}><b>{callsDue.length}</b> {callsDue.length === 1 ? "call" : "calls"} to make</span>
            <span className="pill ath"><b>{(state.calls ?? []).filter((c) => !c.done).length}</b> on the list</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {comingUp.length ? comingUp.map((i) => <span key={i.key}>{shortDay(i.date)}{i.time ? ` ${timeText(i.time)}` : ""}: {i.title}<br /></span>) : "Nothing on the calendar."}
          </p>
          <span className="go-on">Open call list →</span>
        </Link>

        {owner && (
          <Link href="/hq" className="card sec area" id="area-agency">
            <h2>Agents &amp; deals</h2>
            <div className="tiles two">
              <div className="tile2"><span className="big">{state.team.length + 1}</span>Agents</div>
              <div className="tile2"><span className="big">{athletes}</span>Athletes</div>
              <div className="tile2"><span className="big">{money(earned)}</span>Earned</div>
              <div className="tile2"><span className="big">{money(coming)}</span>Coming in</div>
            </div>
            <span className="go-on">Open agents &amp; deals →</span>
          </Link>
        )}
      </div>
    </section>
  );
}
