"use client";

import Link from "next/link";
import { useState } from "react";
import { useSaveNote } from "@/components/SaveNote";
import { POD_SIZE, type PodLeader, type PodSpot } from "@/lib/model";
import { useScouting } from "@/lib/useScouting";
import { useStore } from "@/lib/store";

const blankLeader = { name: "", email: "", phone: "" };
const openSpots = (): PodSpot[] => Array.from({ length: POD_SIZE }, () => ({ name: "", school: "" }));
/** Always POD_SIZE spots, so older saves (or a bigger pod size later) line up. */
const spotsOf = (l: PodLeader): PodSpot[] => [...(l.spots ?? []), ...openSpots()].slice(0, Math.max(POD_SIZE, l.spots?.length ?? 0));

/** Pod leaders (owner only): each leader and the ten spots in their pod. */
export default function PodsPage() {
  const { state, update } = useStore();
  const pods = state.pods ?? [];
  const [form, setForm] = useState(blankLeader);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const note = useSaveNote();
  const filled = pods.reduce((n, l) => n + spotsOf(l).filter((s) => s.name).length, 0);

  const change = (k: keyof typeof blankLeader) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, [k]: e.target.value }); setMsg(""); note.clear(); };
  const save = () => {
    const l = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() };
    if (!l.name) return setMsg("Type their name first.");
    update((d) => {
      d.pods ??= [];
      const i = d.pods.findIndex((x) => x.id === editing);
      if (i >= 0) d.pods[i] = { ...d.pods[i], ...l };
      else d.pods.push({ id: `pod${Date.now()}`, ...l, spots: openSpots() });
    });
    note.start(editing ? `${l.name} is updated.` : `${l.name} is added.`);
    setForm(blankLeader);
    setEditing(null);
  };
  const edit = (l: PodLeader) => { setForm({ name: l.name, email: l.email, phone: l.phone }); setEditing(l.id); setMsg(""); note.clear(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = (l: PodLeader) => {
    if (!confirm(`Remove ${l.name} and their pod?`)) return;
    update((d) => { d.pods = (d.pods ?? []).filter((x) => x.id !== l.id); });
    if (editing === l.id) { setForm(blankLeader); setEditing(null); }
  };

  return (
    <section className="view">
      <div>
        <h1>Pod leaders</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{pods.length} {pods.length === 1 ? "leader" : "leaders"} · {filled} of {pods.length * POD_SIZE} spots filled. Each pod has {POD_SIZE} spots.</p>
      </div>

      <div className="card sec" id="pod-add">
        <h2>{editing ? "Edit pod leader" : "Add a pod leader"}</h2>
        <form className="grid2" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="field"><label htmlFor="pl-name">Name</label><input id="pl-name" value={form.name} onChange={change("name")} /></div>
          <div className="field"><label htmlFor="pl-email">Email</label><input id="pl-email" type="email" value={form.email} onChange={change("email")} /></div>
          <div className="field"><label htmlFor="pl-phone">Cell phone</label><input id="pl-phone" type="tel" value={form.phone} onChange={change("phone")} /></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" id="pl-save" type="submit">{editing ? "Save changes" : "+ Add pod leader"}</button>
            {editing && <button className="btn ghost" type="button" onClick={() => { setForm(blankLeader); setEditing(null); }}>Cancel</button>}
          </div>
        </form>
        {msg ? <p role="status" style={{ margin: 0 }}>{msg}</p> : note.view}
      </div>

      {!pods.length && <p className="muted">No pod leaders yet. Add one above and their {POD_SIZE} spots show up here.</p>}
      {pods.map((l) => <Pod key={l.id} leader={l} onEdit={() => edit(l)} onRemove={() => remove(l)} />)}
    </section>
  );
}

/** One leader's card: contact info and their spots, each with a player name and school. */
function Pod({ leader, onEdit, onRemove }: { leader: PodLeader; onEdit: () => void; onRemove: () => void }) {
  const { update } = useStore();
  const { sc, school } = useScouting();
  const spots = spotsOf(leader);
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", school: "" });
  const note = useSaveNote();
  const listId = `pod-players-${leader.id}`;
  const playerByName = (name: string) => { const n = name.trim().toLowerCase(); return n ? sc.players.find((p) => p.name.toLowerCase() === n) : undefined; };

  const start = (i: number) => { setOpen(i); setForm({ name: spots[i].name, school: spots[i].school }); note.clear(); };
  /** Typing a player we already track fills in their school. */
  const changeName = (v: string) => {
    const p = playerByName(v);
    const sch = p ? school(p.school)?.name ?? "" : "";
    setForm((f) => ({ name: v, school: sch && !f.school ? sch : f.school }));
  };
  const saveSpot = (i: number, s: PodSpot) => {
    update((d) => {
      const pod = (d.pods ?? []).find((x) => x.id === leader.id);
      if (!pod) return;
      pod.spots = spotsOf(pod);
      pod.spots[i] = s;
    });
  };
  const save = () => {
    if (open == null) return;
    const name = form.name.trim();
    const p = playerByName(name);
    saveSpot(open, { name, school: form.school.trim(), ...(p ? { playerId: p.id } : {}) });
    note.start(name ? `Spot ${open + 1}: ${name}.` : `Spot ${open + 1} is open.`);
    setOpen(null);
  };
  const clear = (i: number) => {
    if (!confirm(`Open up spot ${i + 1}? ${spots[i].name} comes out of this pod.`)) return;
    saveSpot(i, { name: "", school: "" });
    note.start(`Spot ${i + 1} is open.`);
    if (open === i) setOpen(null);
  };
  const taken = spots.filter((s) => s.name).length;

  return (
    <div className="card sec" id={`pod-${leader.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>{leader.name} <span className="muted">{taken} of {spots.length}</span></h2>
        <span style={{ whiteSpace: "nowrap" }}>
          <button type="button" className="linkbtn" onClick={onEdit}>Edit</button>{" "}
          <button type="button" className="linkbtn" onClick={onRemove}>Remove</button>
        </span>
      </div>
      {(leader.email || leader.phone) && (
        <p className="muted" style={{ margin: 0 }}>
          {leader.email && <a href={`mailto:${leader.email}`}>{leader.email}</a>}
          {leader.email && leader.phone && " · "}
          {leader.phone && <a href={`tel:${leader.phone.replace(/[^\d+]/g, "")}`}>{leader.phone}</a>}
        </p>
      )}
      <datalist id={listId}>{sc.players.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <div className="tablewrap"><table>
        <thead><tr><th>#</th><th>Player</th><th>School</th><th /></tr></thead>
        <tbody>{spots.map((s, i) => open === i ? (
          <tr key={i}>
            <td>{i + 1}</td>
            <td><input aria-label={`Spot ${i + 1} player`} list={listId} placeholder="Player name" value={form.name} onChange={(e) => changeName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} autoFocus /></td>
            <td><input aria-label={`Spot ${i + 1} school`} placeholder="School" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} onKeyDown={(e) => e.key === "Enter" && save()} /></td>
            <td style={{ whiteSpace: "nowrap" }}>
              <button type="button" className="btn" onClick={save}>Save</button>{" "}
              <button type="button" className="btn ghost" onClick={() => setOpen(null)}>Cancel</button>
            </td>
          </tr>
        ) : (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{s.name ? (s.playerId && sc.players.some((p) => p.id === s.playerId) ? <Link href={`/players/${s.playerId}`}><b>{s.name}</b></Link> : <b>{s.name}</b>) : <span className="muted">Open</span>}</td>
            <td>{s.school || <span className="muted">{s.name ? "None" : ""}</span>}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              {s.name ? <>
                <button type="button" className="linkbtn" onClick={() => start(i)}>Edit</button>{" "}
                <button type="button" className="linkbtn" onClick={() => clear(i)}>Open spot</button>
              </> : <button type="button" className="linkbtn" onClick={() => start(i)}>+ Add player</button>}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
      {note.view}
    </div>
  );
}
