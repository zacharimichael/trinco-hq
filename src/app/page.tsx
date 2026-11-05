"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddTodo } from "@/components/AddTodo";
import { TodoRow } from "@/components/TodoRow";
import { dealMoney } from "@/lib/agency";
import { dayItems, shortDay, timeText, ymd } from "@/lib/calendar";
import { fmt, myStates, RULES, status, TRACKED } from "@/lib/rules";
import { POS_SHORT, POSITIONS, money, schoolById, shownPos } from "@/lib/players";
import { lookingSchools } from "@/lib/moves";
import { todos } from "@/lib/tasks";
import { useStore } from "@/lib/store";

/** The home dashboard. Athletes and recruiting come first, then coaches, agents, calendar and licensing, in the same order as the menu. */
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

  const players = state.scouting.players.filter(shownPos);
  const schoolOf = schoolById(state.scouting);
  const lastCall = [
    ...players.flatMap((p) => p.talks.map((t) => ({ date: t.date, name: p.name || "a player" }))),
    ...(state.schoolCalls ?? []).map((c) => ({ date: c.date, name: schoolOf(c.school)?.name ?? "a school" })),
  ].sort((a, b) => b.date.localeCompare(a.date))[0];

  const today = ymd(new Date());
  const callsDue = (state.calls ?? []).filter((c) => !c.done && !c.first && (!c.due || c.due <= today));
  const toTalk = (state.calls ?? []).filter((c) => !c.done && c.first).length;
  const comingUp = dayItems(state).filter((i) => i.kind === "event" && i.date >= today).slice(0, 2);

  const { earned, coming } = dealMoney(state);
  const looking = POSITIONS.reduce((n, p) => n + lookingSchools(state.scouting, p).length, 0);
  const coaches = (state.coaches ?? []).length;
  const coachCalls = (state.schoolCalls ?? []).length;
  const athletes = state.athletes.length + state.team.reduce((n, t) => n + t.athletes.length, 0);

  return (
    <section className="view">
      <div>
        <h1>{state.agency.name}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Recruiting and NIL for your athletes. Tap an area to open it.</p>
      </div>

      <div className="card next" id="up-next">
        <h2>Up next</h2>
        {next.length ? next.map((t) => <TodoRow key={t.key} t={t} />) : <p className="muted" style={{ margin: 0 }}>Nothing to do. You&apos;re all caught up.</p>}
        <AddTodo />
      </div>

      <div className="grid2">
        <Link href="/players" className="card sec area" id="area-athletes">
          <h2>Athletes</h2>
          <div className="summary">
            {POSITIONS.map((p) => <span className="pill ath" key={p}><b>{players.filter((x) => x.pos === p).length}</b> {POS_SHORT[p]}</span>)}
            <span className="pill ath"><b>{players.filter((x) => x.client).length}</b> Signed</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {lastCall ? <>Last call: {lastCall.name}, {fmt(lastCall.date)}</> : "No calls logged yet."}
          </p>
          <span className="go-on">Open athletes →</span>
        </Link>

        <Link href="/transfers" className="card sec area" id="area-matchmaker">
          <h2>Match Maker</h2>
          <div className="summary">
            <span className="pill ath"><b>{players.filter((x) => x.name && x.transfer).length}</b> going to transfer</span>
            <span className="pill ath"><b>{looking}</b> {looking === 1 ? "school" : "schools"} looking</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>Match players who are moving with schools that need one.</p>
          <span className="go-on">Open Match Maker →</span>
        </Link>

        <Link href="/coaches" className="card sec area" id="area-coaching">
          <h2>Coaching</h2>
          <div className="summary">
            <span className="pill ath"><b>{coaches}</b> {coaches === 1 ? "coach" : "coaches"} we work with</span>
            <span className="pill ath"><b>{coachCalls}</b> coach {coachCalls === 1 ? "call" : "calls"}</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>Every school&apos;s coaches are on the School map.</p>
          <span className="go-on">Open coaching →</span>
        </Link>

        {owner && (
          <Link href="/hq" className="card sec area" id="area-agency">
            <h2>Agents</h2>
            <div className="tiles two">
              <div className="tile2"><span className="big">{state.team.length + 1}</span>Agents</div>
              <div className="tile2"><span className="big">{athletes}</span>Signed athletes</div>
              <div className="tile2"><span className="big">{money(earned)}</span>Earned</div>
              <div className="tile2"><span className="big">{money(coming)}</span>Coming in</div>
            </div>
            <span className="go-on">Open agents →</span>
          </Link>
        )}

        <Link href="/calls" className="card sec area" id="area-calls">
          <h2>Calls &amp; calendar</h2>
          <div className="summary">
            <span className={`pill ${callsDue.some((c) => c.due && c.due <= today) ? "stop" : "ath"}`}><b>{callsDue.length}</b> {callsDue.length === 1 ? "call" : "calls"} to make</span>
            <span className="pill ath"><b>{toTalk}</b> {toTalk === 1 ? "player" : "players"} to talk to</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {comingUp.length ? comingUp.map((i) => <span key={i.key}>{shortDay(i.date)}{i.time ? ` ${timeText(i.time)}` : ""}: {i.title}<br /></span>) : "Nothing on the calendar."}
          </p>
          <span className="go-on">Open call list →</span>
        </Link>

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
      </div>
    </section>
  );
}
