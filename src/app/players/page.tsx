"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { heightText, money, coachRating, yearShort, nilNow, overall, POS_LABEL, POS_SHORT, POSITIONS, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";
import { SortTh, useSort } from "@/components/SortTh";
import { talkedTo } from "@/lib/toTalk";
import { useToTalk } from "@/lib/useToTalk";

export default function PlayersPage() {
  const router = useRouter();
  const { sc, school, schools, canEdit, addPlayer } = useScouting();
  const [pos, setPos] = useState<Pos | "all">("all");
  const [q, setQ] = useState("");
  const [conf, setConf] = useState("");
  const confs = [...new Set(schools.map((s) => s.conference))];
  const [pick, setPick] = useState<string[]>([]);
  // Who you've talked to: everyone, players with no call logged yet, or the ones on your "Players to talk to" list.
  const [talk, setTalk] = useState<"" | "never" | "list">("");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("talk");
    if (t === "never" || t === "list") setTalk(t);
  }, []);
  const toTalk = useToTalk();

  const { sort, by, apply } = useSort<"name" | "pos" | "school" | "rating" | "coach" | "nil", (typeof sc.players)[number]>({ key: "rating", desc: true }, {
    name: (p) => p.name.toLowerCase(),
    pos: (p) => POS_SHORT[p.pos],
    school: (p) => school(p.school)?.name ?? "",
    rating: overall,
    coach: coachRating,
    nil: nilNow,
  });
  const list = apply(sc.players
    .filter((p) => pos === "all" || p.pos === pos)
    .filter((p) => !conf || school(p.school)?.conference === conf)
    .filter((p) => !talk || (talk === "never" ? p.name && !talkedTo(p) : toTalk.onList(p.id)))
    .filter((p) => !q || `${p.name} ${school(p.school)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const toggle = (id: string) => setPick((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id].slice(-4)));

  return (
    <section className="view">
      <div>
        <h1>Players</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Long snappers.</p>
      </div>

      <div className="card sec" id="add-player">
        <h2>Add a player</h2>
        {canEdit ? (<>
          <p className="muted" style={{ margin: 0 }}>Tap their position.</p>
          <div className="addrow">
            {POSITIONS.map((x) => (
              <button key={x} className="btn" type="button" id={`add-${x}`} onClick={() => router.push(`/players/${addPlayer(x)}`)}>+ Add {POS_LABEL[x].toLowerCase()}</button>
            ))}
          </div>
        </>) : <p className="muted" style={{ margin: 0 }}>Only the agency owner can add players.</p>}
      </div>

      <div className="card sec">
        <div className="filters">
          {POSITIONS.length > 1 && <div className="seg"><div>
            {(["all", ...POSITIONS] as const).map((x) => (
              <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{x === "all" ? "All" : POS_SHORT[x]}</button>
            ))}
          </div></div>}
          <select aria-label="Conference" className="search" value={conf} onChange={(e) => setConf(e.target.value)}>
            <option value="">All conferences</option>
            {confs.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Talked to" className="search" value={talk} onChange={(e) => setTalk(e.target.value as typeof talk)}>
            <option value="">Talked to or not</option>
            <option value="never">Never talked to</option>
            <option value="list">On my to-talk list</option>
          </select>
          <input className="search" aria-label="Search players" placeholder="Search name or school" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Tick up to 4 players to compare them.</p>
        {talk === "never" && list.some((p) => !toTalk.onList(p.id)) && (
          <button className="btn" type="button" id="add-all-to-talk" style={{ alignSelf: "flex-start" }} onClick={() => {
            const add = list.filter((p) => !toTalk.onList(p.id));
            if (add.length > 25 && !confirm(`Add all ${add.length} players to your "Players to talk to" list?`)) return;
            toTalk.add(add);
          }}>+ Add these {list.filter((p) => !toTalk.onList(p.id)).length} to Players to talk to</button>
        )}
        <div className="tablewrap">
          <table>
            <thead><tr><th aria-label="Compare" /><SortTh k="name" label="Player" sort={sort} by={by} /><SortTh k="pos" label="Pos" sort={sort} by={by} /><SortTh k="school" label="School" sort={sort} by={by} /><SortTh k="rating" label="Player rating" num sort={sort} by={by} /><SortTh k="coach" label="Coaches rating" num sort={sort} by={by} /><th>Ht / Wt</th><SortTh k="nil" label="NIL now" num sort={sort} by={by} /></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><input type="checkbox" className="tick" aria-label={`Compare ${p.name}`} checked={pick.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td><Link href={`/players/${p.id}`}><b>{p.name || "New player"}</b></Link>
                    <div className="dots" style={{ marginTop: 4 }}>
                      {p.client && <span className="chip mine">My athlete</span>}
                      {p.allAmerican && <span className="chip">All-American</span>}
                      {p.allConference && <span className="chip">All-Conf</span>}
                      {p.transfer && <span className="chip move">🔁 {p.transfer}</span>}
                      {toTalk.onList(p.id) && <span className="chip">📞 To talk to</span>}
                    </div></td>
                  <td>{POS_SHORT[p.pos]}</td>
                  <td>{school(p.school)?.name ?? "—"}<br /><small className="muted">{[school(p.school)?.conference, yearShort(p.year), p.depth].filter(Boolean).join(" · ")}</small></td>
                  <td className="num"><b>{overall(p) ?? "—"}</b></td>
                  <td className="num"><b>{coachRating(p) ?? "—"}</b></td>
                  <td>{heightText(p.height)} / {p.weight ?? "—"}</td>
                  <td className="num">{money(nilNow(p))}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="muted">No players yet. Add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {pick.length > 0 && (
        <div className="stickybar">
          <span><b>{pick.length}</b> picked</span>
          <button className="linkbtn" type="button" onClick={() => setPick([])}>Clear</button>
          <button className="btn ghost" type="button" onClick={() => { toTalk.add(sc.players.filter((p) => pick.includes(p.id))); setPick([]); }}>+ To talk to</button>
          <Link className="btn" id="compare-go" href={`/compare?ids=${pick.join(",")}`}>Compare</Link>
        </div>
      )}
    </section>
  );
}
