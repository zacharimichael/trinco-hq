"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SchoolSelect } from "@/components/SchoolSelect";
import {
  available, commit, graduating, GRADUATING, committedTo, finishMove, ideasFor, markSpot, openSpots, pair, setStage, SPOT_LABEL, undoMove, unpair,
  type Spot, type SpotKind,
} from "@/lib/moves";
import { money, nilNow, overall, POS_LABEL, POS_SHORT, POSITIONS, TRANSFER_PICKS, yearShort, yearsLeft, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

const SHOW = 25;
const STATUSES = [...TRANSFER_PICKS, "Committed", "Moved"] as const;
type Status = (typeof STATUSES)[number];

/**
 * Moves: who is leaving where, the spots that leaves open, and who can fill them.
 * Example: Troy's snapper commits to Tennessee. Troy shows as an open spot and
 * Tennessee's spot fills. Tap "Moved" when he's enrolled and he's on Tennessee's depth chart.
 */
export default function MovesPage() {
  const { sc, schools, school, canEdit, edit } = useScouting();
  const [pos, setPos] = useState<Pos>("LS");
  const [div, setDiv] = useState<"All" | "FBS" | "FCS" | "D2" | "D3">("All");
  const [kind, setKind] = useState<SpotKind>("open");
  const [find, setFind] = useState("");
  const [more, setMore] = useState(false);

  const allSpots = useMemo(() => openSpots(sc, pos), [sc, pos]);
  const spots = allSpots.filter((s) => div === "All" || s.school.division === div);
  const pool = useMemo(() => available(sc, pos), [sc, pos]);
  const inDiv = (p: Player) => div === "All" || school(p.school)?.division === div;
  const committed = sc.players.filter((p) => p.name && p.pos === pos && !graduating(p) && committedTo(p, schools) && committedTo(p, schools) !== p.school);
  const grads = sc.players.filter((p) => p.name && p.pos === pos && graduating(p) && inDiv(p)).sort((a, b) => (overall(b) ?? -1) - (overall(a) ?? -1) || a.name.localeCompare(b.name));
  const moved = (sc.moves ?? []).filter((m) => m.pos === pos);
  const closed = Object.entries(sc.spots ?? {}).filter(([k, v]) => v === "filled" && k.endsWith(`|${pos}`)).map(([k]) => k.slice(0, -pos.length - 1));
  const pairings = (sc.matches ?? []).filter((m) => sc.players.find((p) => p.id === m.player)?.pos === pos);

  const listed = spots.filter((s) => s.kind === kind && (!find.trim() || `${s.school.name} ${s.school.conference} ${s.school.state}`.toLowerCase().includes(find.trim().toLowerCase())));
  const shown = more ? listed : listed.slice(0, SHOW);
  const label = POS_LABEL[pos].toLowerCase();
  const nameOf = (id: string) => school(id)?.name ?? "—";
  const player = (id: string) => sc.players.find((p) => p.id === id);

  return (
    <section className="view">
      <div>
        <h1>Moves</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Who&apos;s leaving, the holes it leaves, and who can fill them.</p>
      </div>

      <div className="filters">
        {POSITIONS.length > 1 && <div className="seg"><div>
          {POSITIONS.map((x) => <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{POS_SHORT[x]}</button>)}
        </div></div>}
        <div className="seg"><div>
          {(["All", "FBS", "FCS", "D2", "D3"] as const).map((x) => <button key={x} type="button" aria-pressed={div === x} onClick={() => setDiv(x)}>{x}</button>)}
        </div></div>
      </div>

      <div className="tiles">
        <div className="tile2"><span className="big">{spots.filter((s) => s.kind === "open").length}</span>Open {POS_SHORT[pos]} spots</div>
        <div className="tile2"><span className="big">{pool.filter(inDiv).length}</span>Available to move</div>
        <div className="tile2"><span className="big">{pairings.length}</span>Pitches going</div>
        <div className="tile2"><span className="big">{committed.length + moved.length}</span>Committed or moved</div>
      </div>

      {canEdit && <LogMove pos={pos} />}

      <div className="grid2 movesboard">
        <div className="card sec" id="open-spots">
          <h2>Holes to fill</h2>
          <div className="seg"><div>
            {(["open", "starter", "none"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setMore(false); }}>{SPOT_LABEL[k]} ({spots.filter((s) => s.kind === k).length})</button>
            ))}
          </div></div>
          <small className="muted">{kind === "open" ? `Nobody at ${POS_SHORT[pos]} next season: everyone there is leaving or graduating.` : kind === "starter" ? "The starter is leaving but a backup stays." : `No ${label} on file. Might be a gap in the roster data.`}</small>
          <input aria-label="Find a school" placeholder="Find a school, conference or state" value={find} onChange={(e) => setFind(e.target.value)} />
          {shown.map((s) => <SpotCard key={s.school.id} s={s} pool={pool} />)}
          {!listed.length && <p className="muted" style={{ margin: 0 }}>None right now.</p>}
          {listed.length > SHOW && <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setMore(!more)}>{more ? "Show fewer" : `Show all ${listed.length}`}</button>}
        </div>

        <div className="card sec" id="available">
          <h2>Available {label}s</h2>
          <small className="muted">In the portal or open to moving, not committed, with eligibility left. Best first.</small>
          {pool.filter(inDiv).map((p) => <AvailableCard key={p.id} p={p} spots={allSpots.filter((s) => s.kind !== "none")} />)}
          {!pool.filter(inDiv).length && <p className="muted" style={{ margin: 0 }}>Nobody yet. Log a move above, set &quot;Transferring?&quot; on a profile, or log a call that says someone is moving.</p>}
        </div>
      </div>

      {committed.length > 0 && (
        <div className="card sec" id="committed">
          <h2>Committed</h2>
          <small className="muted">Tap Moved once they&apos;re enrolled. They go onto the new school&apos;s depth chart.</small>
          {committed.map((p) => {
            const to = committedTo(p, schools)!;
            return (
              <div key={p.id} className="moverow">
                <span><Link href={`/players/${p.id}`}><b>{p.name}</b></Link> <span className="muted">{nameOf(p.school)} → <b>{nameOf(to)}</b></span></span>
                {canEdit && <span className="moveacts">
                  <button type="button" className="btn" onClick={() => edit((d) => finishMove(d, p.id, to))}>Moved ✓</button>
                  <button type="button" className="linkbtn" onClick={() => edit((d) => { const x = d.players.find((y) => y.id === p.id); if (x) { x.transferTo = null; x.transfer = "In the portal"; } })}>Back to portal</button>
                </span>}
              </div>
            );
          })}
        </div>
      )}

      {grads.length > 0 && (
        <details className="card sec" id="graduating">
          <summary><b>🎓 Graduating ({grads.length})</b> <span className="muted">· 0 years left, so they&apos;re never in transfer moves</span></summary>
          <small className="muted">Their spots still open up at their schools. Wrong about someone? Change their years left on the profile or on Classes.</small>
          {grads.map((p) => (
            <div key={p.id} className="moverow">
              <span><Link href={`/players/${p.id}`}><b>{p.name}</b></Link> <span className="muted">{[school(p.school)?.name, yearShort(p.year), overall(p) != null && `Rating ${overall(p)}`].filter(Boolean).join(" · ")}</span></span>
            </div>
          ))}
        </details>
      )}

      {moved.length > 0 && (
        <div className="card sec" id="moved">
          <h2>Moved</h2>
          {moved.map((m) => (
            <div key={m.id} className="moverow">
              <span>{player(m.player) ? <Link href={`/players/${m.player}`}><b>{player(m.player)!.name}</b></Link> : <b>Removed player</b>} <span className="muted">{nameOf(m.from)} → <b>{nameOf(m.to)}</b> · {new Date(`${m.date}T12:00`).toLocaleDateString([], { month: "short", day: "numeric" })}</span></span>
              {canEdit && <button type="button" className="linkbtn" onClick={() => edit((d) => undoMove(d, m.id))}>Undo</button>}
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <details className="card sec">
          <summary>Spots you marked filled ({closed.length})</summary>
          {closed.map((id) => (
            <div key={id} className="moverow">
              <span>{nameOf(id)}</span>
              {canEdit && <button type="button" className="linkbtn" onClick={() => edit((d) => markSpot(d, id, pos, null))}>Reopen</button>}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

/** One school with a hole: why it's open, who's been pitched, and the best fits. */
function SpotCard({ s, pool }: { s: Spot; pool: Player[] }) {
  const { sc, school, canEdit, edit } = useScouting();
  const ideas = ideasFor(s, pool, sc);
  const others = pool.filter((p) => p.school !== s.school.id && !s.matches.some((m) => m.player === p.id));
  const player = (id: string) => sc.players.find((p) => p.id === id);
  return (
    <div className={`spot ${s.kind}`}>
      <div className="spothead">
        <Link href={`/schools?s=${s.school.state}&school=${s.school.id}`}><b>{s.school.name}</b></Link>
        <small className="muted">{[s.school.division, s.school.conference, s.school.state].filter(Boolean).join(" · ")}</small>
      </div>
      {s.leaving.map((l) => <small key={l.p.id}>{l.why === GRADUATING ? "🎓" : "🔁"} <Link href={`/players/${l.p.id}`}>{l.p.name}</Link>: {l.why}</small>)}
      {s.movedOut.map((m, i) => <small key={i}>➡️ {m.p?.name ?? "A player"} left for {m.to}</small>)}
      {s.kind === "starter" && s.staying.length > 0 && <small className="muted">Stays: {s.staying.map((p) => `${p.name}${p.depth ? ` (${p.depth})` : ""}`).join(", ")}</small>}
      {s.markedOpen && <small className="muted">You marked this open.</small>}

      {s.matches.map((m) => {
        const p = player(m.player);
        if (!p) return null;
        return (
          <div key={m.id} className="pairrow">
            <span><Link href={`/players/${p.id}`}>{p.name}</Link> <small className="muted">{school(p.school)?.name}</small></span>
            {canEdit ? (
              <span className="moveacts">
                <select aria-label={`Where it stands with ${p.name}`} value={m.stage} onChange={(e) => edit((d) => setStage(d, m.id, e.target.value as typeof m.stage))}>
                  <option>Pitched</option><option>Interested</option>
                </select>
                <button type="button" className="btn ghost" onClick={() => edit((d) => commit(d, p.id, s.school.id, s.school.name))}>Committed ✓</button>
                <button type="button" className="linkbtn" aria-label={`Take ${p.name} off ${s.school.name}`} onClick={() => edit((d) => unpair(d, m.id))}>✕</button>
              </span>
            ) : <span className="chip">{m.stage}</span>}
          </div>
        );
      })}

      {canEdit && s.kind !== "none" && (ideas.length > 0 || others.length > 0) && (
        <div className="ideas">
          {ideas.length > 0 && <small className="muted">Best fits:</small>}
          {ideas.map((p) => (
            <button key={p.id} type="button" className="ideabtn" onClick={() => edit((d) => pair(d, p.id, s.school.id))}>
              + {p.name} <small>{[overall(p) != null && `${overall(p)}`, yearsLeft(p) != null && `${yearsLeft(p)} yr`, school(p.school)?.name].filter(Boolean).join(" · ")}</small>
            </button>
          ))}
          {others.length > ideas.length && (
            <select aria-label={`Pitch someone else to ${s.school.name}`} value="" onChange={(e) => e.target.value && edit((d) => pair(d, e.target.value, s.school.id))}>
              <option value="">+ Pitch someone else</option>
              {others.map((p) => <option key={p.id} value={p.id}>{p.name} · {school(p.school)?.name ?? "—"}</option>)}
            </select>
          )}
        </div>
      )}
      {canEdit && (
        <div>
          {s.markedOpen
            ? <button type="button" className="linkbtn" onClick={() => edit((d) => markSpot(d, s.school.id, s.pos, null))}>Unmark</button>
            : <button type="button" className="linkbtn" onClick={() => edit((d) => markSpot(d, s.school.id, s.pos, "filled"))}>Not a need · hide</button>}
        </div>
      )}
    </div>
  );
}

/** One player who could move: where from, how good, and the schools they've been pitched to. */
function AvailableCard({ p, spots }: { p: Player; spots: Spot[] }) {
  const { sc, school, canEdit, edit } = useScouting();
  const mine = (sc.matches ?? []).filter((m) => m.player === p.id);
  const fact = p.facts?.[0];
  const sch = school(p.school);
  return (
    <div className="spot avail">
      <div className="spothead">
        <Link href={`/players/${p.id}`}><b>{p.name}</b></Link>
        <span className="chip move">🔁 {p.transfer}</span>
      </div>
      <small className="muted">{[sch?.name ?? "No school", sch?.division, yearShort(p.year), yearsLeft(p) != null && `${yearsLeft(p)} yr left`, overall(p) != null && `Rating ${overall(p)}`, nilNow(p) > 0 && money(nilNow(p))].filter(Boolean).join(" · ")}</small>
      {fact && <small className="muted">{[fact.label, fact.value].filter(Boolean).join(": ")}</small>}
      {mine.length > 0 && <small>Pitched to: {mine.map((m) => `${school(m.school)?.name ?? "—"}${m.stage === "Interested" ? " ⭐" : ""}`).join(", ")}</small>}
      {canEdit && (
        <select aria-label={`Pitch ${p.name} to a school`} value="" onChange={(e) => e.target.value && edit((d) => pair(d, p.id, e.target.value))}>
          <option value="">+ Pitch to an open spot</option>
          {spots.filter((s) => s.school.id !== p.school && !mine.some((m) => m.school === s.school.id)).map((s) => (
            <option key={s.school.id} value={s.school.id}>{s.school.name} · {s.kind === "open" ? "open" : "starter leaving"}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Quick entry: "Troy's snapper is going to Tennessee". Pick the player, what's happening, and where. */
function LogMove({ pos }: { pos: Pos }) {
  const { sc, school, edit } = useScouting();
  const [who, setWho] = useState("");
  const [status, setStatus] = useState<Status>("In the portal");
  const [to, setTo] = useState("");
  const [done, setDone] = useState("");
  const options = useMemo(() => sc.players.filter((p) => p.name && p.pos === pos && !graduating(p))
    .map((p) => ({ id: p.id, label: `${p.name} · ${school(p.school)?.name ?? "no school"}` }))
    .sort((a, b) => a.label.localeCompare(b.label)), [sc.players, pos, school]);
  const picked = options.find((o) => o.label === who);
  const needsSchool = status === "Committed" || status === "Moved";
  const ready = picked && (!needsSchool || to);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked || !ready) return;
    const name = school(to)?.name ?? "";
    edit((d) => {
      const p = d.players.find((x) => x.id === picked.id);
      if (!p) return;
      if (status === "Committed") commit(d, p.id, to, name);
      else if (status === "Moved") finishMove(d, p.id, to);
      else { p.transfer = status; p.transferTo = null; }
    });
    setDone(`Saved: ${who.split(" · ")[0]} ${status === "Moved" ? `moved to ${name}` : status === "Committed" ? `committed to ${name}` : status.toLowerCase()}.`);
    setWho("");
    setTo("");
  };

  return (
    <form className="card sec" id="log-move" onSubmit={save}>
      <h2>Log a move</h2>
      <div className="formgrid">
        <div className="field">
          <label htmlFor="move-who">{POS_LABEL[pos]}</label>
          <input id="move-who" list="move-players" placeholder="Type a name" autoComplete="off" value={who} onChange={(e) => { setWho(e.target.value); setDone(""); }} />
          <datalist id="move-players">{options.map((o) => <option key={o.id} value={o.label} />)}</datalist>
        </div>
        {needsSchool && <SchoolSelect label="Going to" value={to} onChange={setTo} />}
      </div>
      <div className="seg"><div>
        {STATUSES.map((s) => <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>)}
      </div></div>
      <button className="btn" type="submit" disabled={!ready} style={{ alignSelf: "flex-start" }}>Save</button>
      {done && <small className="okchip">✓ {done}</small>}
    </form>
  );
}
