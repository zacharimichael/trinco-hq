"use client";

import { useEffect, useRef, useState } from "react";
import { HS_IDS } from "@/data/hs-long-snappers";
import { JUCO_IDS } from "@/data/juco-long-snappers";
import Link from "next/link";
import { byBest } from "@/lib/moves";
import { money, bestRating, coachRating, HS_CLASS_YEARS, hsClassText, isHs, isJuco, missingJucoPlayers, ratingsText, nilNow, overall, POS_LABEL, POS_SHORT, POSITIONS, missingHsPlayers, yearShort, yearsLeft, YEARS_LEFT, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

type Cls = (typeof YEARS_LEFT)[number] | "unset" | (typeof HS_CLASS_YEARS)[number] | "juco";
const isHsCls = (c: Cls): c is (typeof HS_CLASS_YEARS)[number] => typeof c === "number" && c > 2000;
/** High school lists: Kohl's ranked first in their order, then Kohl's unranked and Rubio-only names. */
const byList = (a: Player, b: Player) => (a.kohlsRank ?? 999) - (b.kohlsRank ?? 999);
const TOP = 50;

/** Top players grouped by years of eligibility left after this season (0 to 4), plus JUCO and high school classes of 2027 and 2028. */
export default function ClassesPage() {
  const { sc, school, canEdit, setPlayer, edit, addHsPlayers, addJucoPlayers } = useScouting();
  const [pos, setPos] = useState<Pos>("LS");
  const [div, setDiv] = useState<"All" | "FBS" | "FCS">("All");
  const [cls, setCls] = useState<Cls>(0);
  const [all, setAll] = useState(false);
  // Backup for the sign-in auto-load: if no high school or JUCO snappers from the lists are saved yet, add them once when an owner or editor opens Classes.
  const tried = useRef({ hs: false, juco: false });
  const noHs = !sc.players.some((p) => HS_IDS.has(p.id));
  const noJuco = !sc.players.some((p) => JUCO_IDS.has(p.id));
  useEffect(() => {
    if (canEdit && noHs && !tried.current.hs) { tried.current.hs = true; addHsPlayers(); }
    if (canEdit && noJuco && !tried.current.juco) { tried.current.juco = true; addJucoPlayers(); }
  }, [canEdit, noHs, noJuco, addHsPlayers, addJucoPlayers]);
  const [adding, setAdding] = useState("");

  const hs = isHsCls(cls);
  const juco = cls === "juco";
  const players = sc.players.filter((p) => p.name && p.pos === pos && (isHs(p) || isJuco(p) || div === "All" || school(p.school)?.division === div));
  const inCls = (p: Player, c: Cls) => (isHsCls(c) ? p.hsClass === c : c === "juco" ? !isHs(p) && isJuco(p)
    : !isHs(p) && !isJuco(p) && (c === "unset" ? yearsLeft(p) == null : yearsLeft(p) === c));
  const count = (c: Cls) => players.filter((p) => inCls(p, c)).length;
  const list = players.filter((p) => inCls(p, cls)).sort((a, b) => byBest(a, b) || (hs ? byList(a, b) : nilNow(b) - nilNow(a)) || a.name.localeCompare(b.name));
  const missingHs = canEdit && pos === "LS" ? (juco ? missingJucoPlayers(sc) : missingHsPlayers(sc).filter((p) => p.hsClass === cls)).length : 0;
  const shown = all ? list : list.slice(0, TOP);
  const unset = count("unset");

  // Top ten for this class: your picks in your order, then the best rated to fill any open places.
  const key = `${pos}|${cls}`;
  const picks = cls === "unset" ? [] : (sc.top10?.[key] ?? []).map((id) => list.find((p) => p.id === id)).filter((p): p is Player => !!p);
  const auto = list.filter((p) => (bestRating(p) != null || (hs && p.kohlsRank != null)) && !picks.includes(p)).slice(0, Math.max(0, 10 - picks.length));
  const top = [...picks.map((p) => ({ p, mine: true })), ...auto.map((p) => ({ p, mine: false }))].slice(0, 10);
  const setPicks = (ids: string[]) => edit((d) => { (d.top10 ??= {})[key] = ids.slice(0, 10); });
  const ids = picks.map((p) => p.id);
  const inTop = (p: Player) => ids.includes(p.id);
  const togglePick = (p: Player) => setPicks(inTop(p) ? ids.filter((x) => x !== p.id) : [...ids, p.id]);
  const label = (p: Player) => `${p.name} · ${(isHs(p) ? p.hsState : isJuco(p) ? p.jucoSchool : school(p.school)?.name) ?? ""}`;
  const nudge = (i: number, by: number) => { const n = [...ids]; [n[i], n[i + by]] = [n[i + by], n[i]]; setPicks(n); };
  const clsName = hs ? hsClassText(cls) : juco ? "JUCO" : cls === "unset" ? "No year yet" : cls === 0 ? "0 years left" : `${cls} year${cls === 1 ? "" : "s"} left`;

  return (
    <section className="view">
      <div>
        <h1>Classes</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Top {POS_LABEL[pos].toLowerCase()}s by years of eligibility left after this season, plus JUCO and high school classes. Best rated first.</p>
      </div>

      <div className="filters">
        {POSITIONS.length > 1 && <div className="seg"><div>
          {POSITIONS.map((x) => <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{POS_SHORT[x]}</button>)}
        </div></div>}
        {!hs && !juco && <div className="seg"><div>
          {(["All", "FBS", "FCS"] as const).map((x) => <button key={x} type="button" aria-pressed={div === x} onClick={() => setDiv(x)}>{x}</button>)}
        </div></div>}
      </div>

      <div className="tiles classtiles">
        {YEARS_LEFT.map((c) => (
          <button key={c} type="button" className="tile2" aria-pressed={cls === c} onClick={() => { setCls(c); setAll(false); }}>
            <span className="big">{count(c)}</span>{c === 0 ? "0 left · Graduating" : `${c} year${c === 1 ? "" : "s"} left`}
          </button>
        ))}
        {unset > 0 && (
          <button type="button" className="tile2" aria-pressed={cls === "unset"} onClick={() => { setCls("unset"); setAll(false); }}>
            <span className="big">{unset}</span>No year yet
          </button>
        )}
        <button type="button" className="tile2" aria-pressed={juco} onClick={() => { setCls("juco"); setAll(false); }}>
          <span className="big">{count("juco")}</span>JUCO
        </button>
        {HS_CLASS_YEARS.map((c) => (
          <button key={c} type="button" className="tile2" aria-pressed={cls === c} onClick={() => { setCls(c); setAll(false); }}>
            <span className="big">{count(c)}</span>HS Class of {c}
          </button>
        ))}
      </div>

      {cls !== "unset" && (
        <div className="card sec" id="top-ten">
          <h2>🏆 Top 10 · {clsName}</h2>
          <small className="muted">{canEdit ? "Type a name or tap ☆ on anyone below. Use ▲ ▼ to rank." : "The agency's ranking."}{auto.length > 0 && (hs ? " Places you haven't filled show the best rated, then Kohl's order (auto)." : " Places you haven't filled show the best rated (auto).")}</small>
          <ol className="topten">
            {top.map(({ p, mine }, i) => (
              <li key={p.id}>
                <span className="rank">{i + 1}</span>
                <span className="grow"><Link href={`/players/${p.id}`}><b>{p.name}</b></Link> <small className="muted">{[hs ? p.hsState : juco ? p.jucoSchool : school(p.school)?.name, hs && p.kohlsRank != null && `Kohl's #${p.kohlsRank}`, yearShort(p.year), ratingsText(p)].filter(Boolean).join(" · ")}{!mine && " · auto"}</small></span>
                {canEdit && mine && (
                  <span className="moveacts">
                    <button type="button" className="linkbtn" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => nudge(i, -1)}>▲</button>
                    <button type="button" className="linkbtn" aria-label={`Move ${p.name} down`} disabled={i === picks.length - 1} onClick={() => nudge(i, 1)}>▼</button>
                    <button type="button" className="linkbtn" aria-label={`Take ${p.name} off the top 10`} onClick={() => togglePick(p)}>✕</button>
                  </span>
                )}
                {canEdit && !mine && <button type="button" className="linkbtn" onClick={() => togglePick(p)}>Keep</button>}
              </li>
            ))}
            {Array.from({ length: 10 - top.length }, (_, i) => <li key={`e${i}`} className="muted"><span className="rank">{top.length + i + 1}</span><span className="grow">—</span></li>)}
          </ol>
          {canEdit && ids.length < 10 && (
            <div className="field" style={{ maxWidth: 420 }}>
              <label htmlFor="top-add">Add to the top 10</label>
              <input id="top-add" list="top-names" placeholder="Type a name" autoComplete="off" value={adding}
                onChange={(e) => { const hit = list.find((p) => label(p) === e.target.value); if (hit) { if (!inTop(hit)) togglePick(hit); setAdding(""); } else setAdding(e.target.value); }} />
              <datalist id="top-names">{list.filter((p) => !inTop(p)).map((p) => <option key={p.id} value={label(p)} />)}</datalist>
            </div>
          )}
        </div>
      )}

      {hs || juco ? (
        <div className="card sec">
          <h2>{juco ? "Everyone at a junior college (JUCO)" : `Everyone in the ${hsClassText(cls)}`}</h2>
          {juco ? <small className="muted">Anyone with a JUCO school on their profile. Started with the snappers Kohl&apos;s Kicking lists as committed to a JUCO from the 2025 and 2026 high school classes. Nobody publishes a JUCO long snapper ranking, so add others from their profile (JUCO school box).</small>
          : <small className="muted">From <a href={`https://www.kohlskicking.com/national-player-ratings/long-snappers/${cls}`} target="_blank" rel="noreferrer">Kohl&apos;s Kicking&apos;s {cls} long snapper ratings</a> and Rubio Long Snapping&apos;s lists. Kohl&apos;s order is shown until you add ratings. Special Teams University doesn&apos;t publish class lists.</small>}
          {missingHs > 0 && <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={juco ? addJucoPlayers : addHsPlayers}>Add {missingHs} from the lists</button>}
          <div className="tablewrap">
            <table id="hs-class-list">
              <thead><tr>{canEdit && <th aria-label="Top 10" />}<th className="num">#</th><th>Player</th><th>{juco ? "JUCO school" : "State"}</th>{!juco && <th>Kohl&apos;s</th>}<th className="num">Player rating</th><th className="num">Coaches rating</th><th>{juco ? "Notes" : "Recruiting"}</th></tr></thead>
              <tbody>
                {shown.map((p, i) => (
                  <tr key={p.id}>
                    {canEdit && <td><button type="button" className="starbtn" aria-pressed={inTop(p)} disabled={!inTop(p) && ids.length >= 10}
                      aria-label={inTop(p) ? `Take ${p.name} off the top 10` : `Add ${p.name} to the top 10`} onClick={() => togglePick(p)}>{inTop(p) ? "★" : "☆"}</button></td>}
                    <td className="num muted">{i + 1}</td>
                    <td><Link href={`/players/${p.id}`}><b>{p.name}</b></Link>
                      {(p.client || p.lists?.length) && <small className="muted" style={{ display: "block" }}>
                        {[p.client && "My athlete", p.lists?.length && `On ${p.lists.join(" + ")}`].filter(Boolean).join(" · ")}</small>}</td>
                    <td>{juco ? p.jucoSchool : p.hsState || "—"}</td>
                    {!juco && <td>{p.kohlsRank != null ? `#${p.kohlsRank}` : p.lists?.includes("Kohl's") ? "Listed" : "—"}</td>}
                    <td className="num"><b>{overall(p) ?? "—"}</b></td>
                    <td className="num"><b>{coachRating(p) ?? "—"}</b></td>
                    <td><small>{p.recruiting || "—"}</small></td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={8} className="muted">Nobody here yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {list.length > TOP && <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setAll(!all)}>{all ? `Show top ${TOP}` : `Show all ${list.length}`}</button>}
        </div>
      ) : (
      <div className="card sec">
        <h2>{cls === "unset" ? "No year in school yet" : cls === 0 ? "Everyone graduating · 0 years left" : `Everyone with ${cls} year${cls === 1 ? "" : "s"} left`}</h2>
        {cls === 0 && <small className="muted">Out of eligibility after this season, so they&apos;re kept out of transfer moves. Their spots show as holes on <Link href="/transfers">Moves</Link>.</small>}
        <small className="muted">Guessed from year in school (Senior 0, Junior 1, Sophomore 2, Freshman 3). Redshirts and extra years vary, so change it below when you know.</small>
        <div className="tablewrap">
          <table id="class-list">
            <thead><tr>{canEdit && cls !== "unset" && <th aria-label="Top 10" />}<th className="num">#</th><th>Player</th><th>School</th><th className="num">Player rating</th><th className="num">Coaches rating</th><th className="num">NIL now</th><th>Years left</th></tr></thead>
            <tbody>
              {shown.map((p, i) => (
                <tr key={p.id}>
                  {canEdit && cls !== "unset" && <td><button type="button" className="starbtn" aria-pressed={inTop(p)} disabled={!inTop(p) && ids.length >= 10}
                    aria-label={inTop(p) ? `Take ${p.name} off the top 10` : `Add ${p.name} to the top 10`} onClick={() => togglePick(p)}>{inTop(p) ? "★" : "☆"}</button></td>}
                  <td className="num muted">{i + 1}</td>
                  <td><Link href={`/players/${p.id}`}><b>{p.name}</b></Link>
                    {(p.client || p.allAmerican || p.allConference || p.transfer) && <small className="muted" style={{ display: "block" }}>
                      {[p.client && "My athlete", p.allAmerican && "All-American", p.allConference && "All-Conf", p.transfer && `🔁 ${p.transfer}`].filter(Boolean).join(" · ")}</small>}</td>
                  <td>{school(p.school)?.name ?? "—"}<br /><small className="muted">{[school(p.school)?.division, yearShort(p.year), p.depth].filter(Boolean).join(" · ")}</small></td>
                  <td className="num"><b>{overall(p) ?? "—"}</b></td>
                  <td className="num"><b>{coachRating(p) ?? "—"}</b></td>
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
              {!list.length && <tr><td colSpan={8} className="muted">Nobody here yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {list.length > TOP && <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setAll(!all)}>{all ? `Show top ${TOP}` : `Show all ${list.length}`}</button>}
      </div>
      )}
    </section>
  );
}
