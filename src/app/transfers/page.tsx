"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SchoolSelect } from "@/components/SchoolSelect";
import {
  commit, committedTo, finishMove, graduating, lookingSchools, markSpot, openSpots, pair, setStage, transferring, undoMove, unpair,
} from "@/lib/moves";
import { isHs, money, ratingsText, nilNow, POS_LABEL, POSITIONS, POS_SHORT, TRANSFER_PICKS, yearShort, yearsLeft, type Match, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

/**
 * Moves: three lists. Snappers going to transfer, schools looking for a snapper,
 * and the connections between them. Committing fills the school's spot and puts
 * the player's old school on the looking list.
 */
export default function MovesPage() {
  const { sc, schools, school, canEdit, edit } = useScouting();
  const [pos, setPos] = useState<Pos>(POSITIONS[0]);
  const word = POS_LABEL[pos].toLowerCase();

  const movers = useMemo(() => transferring(sc, pos), [sc, pos]);
  const looking = useMemo(() => lookingSchools(sc, pos), [sc, pos]);
  const player = (id: string) => sc.players.find((p) => p.id === id);
  const conns = (sc.matches ?? []).filter((m) => player(m.player)?.pos === pos);
  const committed = sc.players.filter((p) => p.name && p.pos === pos && !graduating(p) && committedTo(p, schools) && committedTo(p, schools) !== p.school);
  const moved = (sc.moves ?? []).filter((m) => m.pos === pos);
  const nameOf = (id: string) => school(id)?.name ?? "—";

  // Schools the roster says will have nobody at this position next season, that aren't on the list yet.
  const lookingIds = new Set(looking.map((s) => s.id));
  const maybe = useMemo(() => openSpots(sc, pos).filter((s) => s.kind === "open" && !lookingIds.has(s.school.id)), [sc, pos, looking]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="view">
      <div>
        <h1>Moves</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{POS_LABEL[pos]}s going to transfer, schools looking for one, and who you&apos;ve connected.</p>
      </div>

      {POSITIONS.length > 1 && (
        <div className="seg"><div>
          {POSITIONS.map((x) => <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{POS_SHORT[x]}</button>)}
        </div></div>
      )}

      <div className="tiles">
        <div className="tile2"><span className="big">{movers.length}</span>Going to transfer</div>
        <div className="tile2"><span className="big">{looking.length}</span>Schools looking</div>
        <div className="tile2"><span className="big">{conns.length}</span>Connected</div>
        <div className="tile2"><span className="big">{committed.length}</span>Committed</div>
      </div>

      <div className="grid2 movesboard">
        {/* 1. Snappers going to transfer */}
        <div className="card sec" id="transferring">
          <h2>1. Going to transfer</h2>
          {canEdit && <AddMover pos={pos} />}
          {movers.map((p) => (
            <div key={p.id} className="spot avail">
              <div className="spothead">
                <Link href={`/players/${p.id}`}><b>{p.name}</b></Link>
                <span className="chip move">{p.transfer}</span>
              </div>
              {conns.some((m) => m.player === p.id) && <small>Connected to: {conns.filter((m) => m.player === p.id).map((m) => `${nameOf(m.school)}${m.stage === "Interested" ? " ⭐" : ""}`).join(", ")}</small>}
              <small className="muted">{[nameOf(p.school), yearShort(p.year), yearsLeft(p) != null && `${yearsLeft(p)} yr left`, ratingsText(p), nilNow(p) > 0 && money(nilNow(p))].filter(Boolean).join(" · ")}</small>
              {canEdit && (
                <div className="moveacts">
                  <ConnectPick label={`Connect ${p.name} to a school`} placeholder="+ Connect to a school"
                    options={looking.filter((s) => s.id !== p.school && !conns.some((m) => m.player === p.id && m.school === s.id)).map((s) => ({ id: s.id, label: s.name }))}
                    onPick={(id) => edit((d) => pair(d, p.id, id))} empty="Add a school to list 2 first" />
                  <button type="button" className="linkbtn" onClick={() => edit((d) => { const x = d.players.find((y) => y.id === p.id); if (x) x.transfer = null; d.matches = (d.matches ?? []).filter((m) => m.player !== p.id); })}>Remove</button>
                </div>
              )}
            </div>
          ))}
          {!movers.length && <p className="muted" style={{ margin: 0 }}>Nobody yet. Add a {word} above.</p>}
        </div>

        {/* 2. Schools looking for a snapper */}
        <div className="card sec" id="looking">
          <h2>2. Schools looking</h2>
          {canEdit && <AddSchool pos={pos} />}
          {looking.map((s) => (
            <div key={s.id} className="spot open">
              <div className="spothead">
                <Link href={`/schools?s=${s.state}&school=${s.id}`}><b>{s.name}</b></Link>
                <small className="muted">{[s.division, s.conference, s.state].filter(Boolean).join(" · ")}</small>
              </div>
              {conns.some((m) => m.school === s.id) && <small>Connected: {conns.filter((m) => m.school === s.id).map((m) => `${player(m.player)?.name ?? "—"}${m.stage === "Interested" ? " ⭐" : ""}`).join(", ")}</small>}
              {canEdit && (
                <div className="moveacts">
                  <ConnectPick label={`Connect a ${word} to ${s.name}`} placeholder={`+ Connect a ${word}`}
                    options={movers.filter((p) => p.school !== s.id && !conns.some((m) => m.player === p.id && m.school === s.id)).map((p) => ({ id: p.id, label: `${p.name} · ${nameOf(p.school)}` }))}
                    onPick={(id) => edit((d) => pair(d, id, s.id))} empty={`Add a ${word} to list 1 first`} />
                  <button type="button" className="linkbtn" onClick={() => edit((d) => markSpot(d, s.id, pos, null))}>Remove</button>
                </div>
              )}
            </div>
          ))}
          {!looking.length && <p className="muted" style={{ margin: 0 }}>No schools yet. Add one above.</p>}
          {canEdit && maybe.length > 0 && (
            <details>
              <summary className="muted">Might need a {word} ({maybe.length})</summary>
              <small className="muted">Everyone they have at {POS_SHORT[pos]} is leaving or graduating.</small>
              {maybe.map((s) => (
                <div key={s.school.id} className="moverow">
                  <span>{s.school.name} <small className="muted">{s.leaving.map((l) => l.p.name).join(", ")}</small></span>
                  <button type="button" className="btn ghost" onClick={() => edit((d) => markSpot(d, s.school.id, pos, "open"))}>+ Add</button>
                </div>
              ))}
            </details>
          )}
        </div>
      </div>

      {/* 3. Connections */}
      <div className="card sec" id="connections">
        <h2>3. Connections</h2>
        {conns.map((m) => <ConnRow key={m.id} m={m} />)}
        {committed.map((p) => {
          const to = committedTo(p, schools)!;
          return (
            <div key={p.id} className="moverow">
              <span><Link href={`/players/${p.id}`}><b>{p.name}</b></Link> <span className="muted">{nameOf(p.school)} →</span> <b>{nameOf(to)}</b> <span className="chip mine">Committed ✓</span></span>
              {canEdit && <span className="moveacts">
                <button type="button" className="btn" onClick={() => edit((d) => finishMove(d, p.id, to))}>He&apos;s moved</button>
                <button type="button" className="linkbtn" onClick={() => edit((d) => { const x = d.players.find((y) => y.id === p.id); if (x) { x.transferTo = null; x.transfer = "In the portal"; } })}>Undo</button>
              </span>}
            </div>
          );
        })}
        {!conns.length && !committed.length && <p className="muted" style={{ margin: 0 }}>Connect a {word} from list 1 to a school in list 2.</p>}
      </div>

      {moved.length > 0 && (
        <details className="card sec" id="moved">
          <summary><b>Moved ({moved.length})</b></summary>
          {moved.map((m) => (
            <div key={m.id} className="moverow">
              <span>{player(m.player)?.name ?? "Removed player"} <span className="muted">{nameOf(m.from)} → <b>{nameOf(m.to)}</b> · {new Date(`${m.date}T12:00`).toLocaleDateString([], { month: "short", day: "numeric" })}</span></span>
              {canEdit && <button type="button" className="linkbtn" onClick={() => edit((d) => undoMove(d, m.id))}>Undo</button>}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

/** One connection: player → school, how it's going, and Committed. */
function ConnRow({ m }: { m: Match }) {
  const { sc, school, canEdit, edit } = useScouting();
  const p = sc.players.find((x) => x.id === m.player);
  const s = school(m.school);
  if (!p || !s) return null;
  const stage = m.stage === "Interested" ? "Interested" : "Connected";
  return (
    <div className="moverow">
      <span><Link href={`/players/${p.id}`}><b>{p.name}</b></Link> <span className="muted">{school(p.school)?.name ?? "—"} →</span> <b>{s.name}</b></span>
      {canEdit ? (
        <span className="moveacts">
          <span className="seg"><span style={{ display: "inline-flex", gap: 6 }}>
            {(["Connected", "Interested"] as const).map((x) => (
              <button key={x} type="button" aria-pressed={stage === x} onClick={() => edit((d) => setStage(d, m.id, x))}>{x === "Interested" ? "⭐ Interested" : x}</button>
            ))}
          </span></span>
          <button type="button" className="btn" onClick={() => edit((d) => commit(d, p.id, s.id, s.name))}>Committed ✓</button>
          <button type="button" className="linkbtn" aria-label={`Disconnect ${p.name} from ${s.name}`} onClick={() => edit((d) => unpair(d, m.id))}>✕</button>
        </span>
      ) : <span className="chip">{stage}</span>}
    </div>
  );
}

/** A plain dropdown that acts as soon as something is picked. */
function ConnectPick({ label, placeholder, options, onPick, empty }: { label: string; placeholder: string; options: { id: string; label: string }[]; onPick: (id: string) => void; empty: string }) {
  if (!options.length) return <small className="muted">{empty}</small>;
  return (
    <select aria-label={label} value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

/** Type a name, tap Open to it or In the portal, Add. */
function AddMover({ pos }: { pos: Pos }) {
  const { sc, school, edit } = useScouting();
  const [who, setWho] = useState("");
  const [status, setStatus] = useState<string>("In the portal");
  const options = useMemo(() => sc.players.filter((p: Player) => p.name && p.pos === pos && !isHs(p) && !p.transfer && !graduating(p))
    .map((p) => ({ id: p.id, label: `${p.name} · ${school(p.school)?.name ?? "no school"}` }))
    .sort((a, b) => a.label.localeCompare(b.label)), [sc.players, pos, school]);
  const picked = options.find((o) => o.label === who);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    edit((d) => { const p = d.players.find((x) => x.id === picked.id); if (p) { p.transfer = status; p.transferTo = null; } });
    setWho("");
  };
  return (
    <form className="addrow2" id="add-mover" onSubmit={add}>
      <div className="field">
        <label htmlFor="mover-name">{POS_LABEL[pos]}</label>
        <input id="mover-name" list="mover-names" placeholder="Type a name" autoComplete="off" value={who} onChange={(e) => setWho(e.target.value)} />
        <datalist id="mover-names">{options.map((o) => <option key={o.id} value={o.label} />)}</datalist>
      </div>
      <div className="field" style={{ flex: "0 1 190px" }}>
        <label htmlFor="mover-status">Status</label>
        <select id="mover-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {TRANSFER_PICKS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <button className="btn" type="submit" disabled={!picked}>+ Add</button>
    </form>
  );
}

/** Type a school, Add. */
function AddSchool({ pos }: { pos: Pos }) {
  const { edit } = useScouting();
  const [id, setId] = useState("");
  const [k, setK] = useState(0);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    edit((d) => markSpot(d, id, pos, "open"));
    setId("");
    setK(k + 1);
  };
  return (
    <form className="addrow2" id="add-school" onSubmit={add}>
      <SchoolSelect key={k} label="School" value={id} onChange={setId} />
      <button className="btn" type="submit" disabled={!id}>+ Add</button>
    </form>
  );
}
