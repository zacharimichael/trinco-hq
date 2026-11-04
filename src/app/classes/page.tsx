"use client";

import { useState } from "react";
import Link from "next/link";
import { byBest } from "@/lib/moves";
import { money, nilNow, overall, POS_LABEL, POS_SHORT, POSITIONS, yearShort, yearsLeft, YEARS_LEFT, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

type Cls = (typeof YEARS_LEFT)[number] | "unset";
const TOP = 50;

/** Top players grouped by years of eligibility left after this season: 0, 1, 2, 3 or 4. */
export default function ClassesPage() {
  const { sc, school, canEdit, setPlayer } = useScouting();
  const [pos, setPos] = useState<Pos>("LS");
  const [div, setDiv] = useState<"All" | "FBS" | "FCS">("All");
  const [cls, setCls] = useState<Cls>(0);
  const [all, setAll] = useState(false);

  const players = sc.players.filter((p) => p.name && p.pos === pos && (div === "All" || school(p.school)?.division === div));
  const inCls = (p: Player, c: Cls) => (c === "unset" ? yearsLeft(p) == null : yearsLeft(p) === c);
  const count = (c: Cls) => players.filter((p) => inCls(p, c)).length;
  const list = players.filter((p) => inCls(p, cls)).sort((a, b) => byBest(a, b) || nilNow(b) - nilNow(a) || a.name.localeCompare(b.name));
  const shown = all ? list : list.slice(0, TOP);
  const unset = count("unset");

  return (
    <section className="view">
      <div>
        <h1>Classes</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Top {POS_LABEL[pos].toLowerCase()}s by years of eligibility left after this season. Best rated first.</p>
      </div>

      <div className="filters">
        {POSITIONS.length > 1 && <div className="seg"><div>
          {POSITIONS.map((x) => <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{POS_SHORT[x]}</button>)}
        </div></div>}
        <div className="seg"><div>
          {(["All", "FBS", "FCS"] as const).map((x) => <button key={x} type="button" aria-pressed={div === x} onClick={() => setDiv(x)}>{x}</button>)}
        </div></div>
      </div>

      <div className="tiles classtiles">
        {YEARS_LEFT.map((c) => (
          <button key={c} type="button" className="tile2" aria-pressed={cls === c} onClick={() => { setCls(c); setAll(false); }}>
            <span className="big">{count(c)}</span>{c === 0 ? "0 years left" : `${c} year${c === 1 ? "" : "s"} left`}
          </button>
        ))}
        {unset > 0 && (
          <button type="button" className="tile2" aria-pressed={cls === "unset"} onClick={() => { setCls("unset"); setAll(false); }}>
            <span className="big">{unset}</span>No year yet
          </button>
        )}
      </div>

      <div className="card sec">
        <h2>{cls === "unset" ? "No year in school yet" : cls === 0 ? "0 years left · done after this season" : `${cls} year${cls === 1 ? "" : "s"} left`}</h2>
        {cls === 0 && <small className="muted">Their spots open up next year. They show on <Link href="/transfers">Moves</Link>.</small>}
        <small className="muted">Guessed from year in school (Senior 0, Junior 1, Sophomore 2, Freshman 3). Redshirts and extra years vary, so change it below when you know.</small>
        <div className="tablewrap">
          <table id="class-list">
            <thead><tr><th className="num">#</th><th>Player</th><th>School</th><th className="num">Rating</th><th className="num">NIL now</th><th>Years left</th></tr></thead>
            <tbody>
              {shown.map((p, i) => (
                <tr key={p.id}>
                  <td className="num muted">{i + 1}</td>
                  <td><Link href={`/players/${p.id}`}><b>{p.name}</b></Link>
                    {(p.client || p.allAmerican || p.allConference || p.transfer) && <small className="muted" style={{ display: "block" }}>
                      {[p.client && "My athlete", p.allAmerican && "All-American", p.allConference && "All-Conf", p.transfer && `🔁 ${p.transfer}`].filter(Boolean).join(" · ")}</small>}</td>
                  <td>{school(p.school)?.name ?? "—"}<br /><small className="muted">{[school(p.school)?.division, yearShort(p.year), p.depth].filter(Boolean).join(" · ")}</small></td>
                  <td className="num"><b>{overall(p) ?? "—"}</b></td>
                  <td className="num">{nilNow(p) ? money(nilNow(p)) : "—"}</td>
                  <td>
                    <select aria-label={`Years left for ${p.name}`} disabled={!canEdit} value={yearsLeft(p) ?? ""}
                      onChange={(e) => setPlayer(p.id, { yearsLeft: e.target.value === "" ? null : Number(e.target.value) })}>
                      <option value="">?</option>
                      {YEARS_LEFT.map((n) => <option key={n} value={n}>{n}{p.yearsLeft == null && yearsLeft(p) === n ? " (guess)" : ""}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="muted">Nobody here yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {list.length > TOP && <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setAll(!all)}>{all ? `Show top ${TOP}` : `Show all ${list.length}`}</button>}
      </div>
    </section>
  );
}
