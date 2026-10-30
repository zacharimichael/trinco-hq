"use client";

import { useState } from "react";
import Link from "next/link";
import { money, nilNow, overall, POS_SHORT, positionsFor, TRANSFER_PICKS, yearShort, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";
import { SortTh, useSort } from "@/components/SortTh";

/** Players willing to move schools. A player is on this list when their transfer status is set, here, on their profile or from a call note. */
export default function TransfersPage() {
  const { sc, school, canEdit, setPlayer } = useScouting();
  const [pos, setPos] = useState<Pos | "all">("all");
  const [adding, setAdding] = useState("");
  const [addAs, setAddAs] = useState<string>(TRANSFER_PICKS[0]);

  const named = sc.players.filter((p) => p.name);
  const moving = named.filter((p) => p.transfer);
  const staying = named.filter((p) => !p.transfer).sort((a, b) => a.name.localeCompare(b.name));
  const { sort, by, apply } = useSort<"name" | "pos" | "school" | "status" | "rating" | "nil", Player>({ key: "rating", desc: true }, {
    name: (p) => p.name.toLowerCase(),
    pos: (p) => POS_SHORT[p.pos],
    school: (p) => school(p.school)?.name ?? "",
    status: (p) => p.transfer ?? "",
    rating: overall,
    nil: nilNow,
  });
  const list = apply(moving.filter((p) => pos === "all" || p.pos === pos));
  const latest = (p: Player) => p.facts?.[0];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adding) return;
    setPlayer(adding, { transfer: addAs });
    setAdding("");
  };

  return (
    <section className="view">
      <div>
        <h1>Transfers</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Players willing to move schools. Call notes that say a player is transferring add them here.</p>
      </div>

      <div className="tiles">
        <div className="tile2"><span className="big">{moving.length}</span>On the list</div>
        <div className="tile2"><span className="big">{moving.filter((p) => p.transfer === "Open to transferring").length}</span>Open to it</div>
        <div className="tile2"><span className="big">{moving.filter((p) => p.transfer === "In the portal").length}</span>In the portal</div>
        <div className="tile2"><span className="big">{money(moving.reduce((a, p) => a + nilNow(p), 0))}</span>NIL they make now</div>
      </div>

      {canEdit && (
        <form className="card sec" id="add-transfer" onSubmit={add}>
          <h2>Add a player</h2>
          {staying.length ? (<>
            <div className="formgrid">
              <div className="field">
                <label htmlFor="transfer-player">Player</label>
                <select id="transfer-player" value={adding} onChange={(e) => setAdding(e.target.value)}>
                  <option value="">Pick a player</option>
                  {staying.map((p) => <option key={p.id} value={p.id}>{p.name} · {POS_SHORT[p.pos]}{school(p.school) ? ` · ${school(p.school)!.name}` : ""}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="transfer-as">Status</label>
                <select id="transfer-as" value={addAs} onChange={(e) => setAddAs(e.target.value)}>
                  {TRANSFER_PICKS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <button className="btn" type="submit" disabled={!adding} style={{ alignSelf: "flex-start" }}>+ Add to transfer list</button>
          </>) : <p className="muted" style={{ margin: 0 }}>Everyone is already on the list. <Link href="/players">Add a new player</Link> first.</p>}
        </form>
      )}

      <div className="card sec">
        <div className="filters">
          <div className="seg"><div>
            {(["all", ...positionsFor(moving)] as const).map((x) => (
              <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{x === "all" ? "All" : POS_SHORT[x]}</button>
            ))}
          </div></div>
        </div>
        <div className="tablewrap">
          <table id="transfer-list">
            <thead><tr>
              <SortTh k="name" label="Player" sort={sort} by={by} /><SortTh k="pos" label="Pos" sort={sort} by={by} />
              <SortTh k="school" label="Leaving" sort={sort} by={by} /><SortTh k="status" label="Status" sort={sort} by={by} />
              <SortTh k="rating" label="Rating" num sort={sort} by={by} /><SortTh k="nil" label="NIL now" num sort={sort} by={by} /><th aria-label="Remove" />
            </tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/players/${p.id}`}><b>{p.name}</b></Link>
                    {latest(p) && <small className="muted" style={{ display: "block", marginTop: 4 }}>{[latest(p)!.label, latest(p)!.value].filter(Boolean).join(": ")}</small>}</td>
                  <td>{POS_SHORT[p.pos]}</td>
                  <td>{school(p.school)?.name ?? "—"}<br /><small className="muted">{[school(p.school)?.conference, yearShort(p.year), p.depth].filter(Boolean).join(" · ")}</small></td>
                  <td><span className="chip move">🔁 {p.transfer}</span></td>
                  <td className="num"><b>{overall(p) ?? "—"}</b></td>
                  <td className="num">{money(nilNow(p))}</td>
                  <td>{canEdit && <button className="linkbtn" type="button" aria-label={`Take ${p.name} off the list`} onClick={() => setPlayer(p.id, { transfer: null })}>Remove</button>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="muted">Nobody on the list yet. Add a player above, or log a call that says someone is transferring.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
