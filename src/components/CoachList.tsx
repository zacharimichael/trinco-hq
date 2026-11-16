"use client";

import Link from "next/link";
import { useState } from "react";
import { useSaveNote } from "@/components/SaveNote";
import type { CoachContact } from "@/lib/model";
import { COACH_LABEL } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";
import { useStore } from "@/lib/store";

const ROLES = ["HC", "ST", "GM", "Other"] as const;
const roleName = (r: CoachContact["role"]) => (r === "Other" ? "Other" : COACH_LABEL[r]);
const blankCoach = { name: "", school: "", role: "HC" as CoachContact["role"], email: "", phone: "", x: "", notes: "" };
/** Turns "@coach", "coach" or an x.com / twitter.com link into just "coach". */
const xHandle = (v: string) => v.trim().replace(/^(https?:\/\/)?(www\.)?(x|twitter)\.com\//i, "").replace(/^@/, "").split(/[/?#\s]/)[0];

/** The coaches you work with: name, school, role, email, cell, X and a note. Picking a school fills in the coach we already know. */
export function CoachList() {
  const { state, update } = useStore();
  const { schools, staffOf } = useScouting();
  const list = state.coaches ?? [];
  const [form, setForm] = useState(blankCoach);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const note = useSaveNote();
  const findSchool = (name: string) => { const n = name.trim().toLowerCase(); return n ? schools.find((x) => x.name.toLowerCase() === n) : undefined; };
  // What we filled in last, so changing the school or role swaps it out but never anything you typed yourself.
  const [auto, setAuto] = useState({ name: "", email: "", phone: "" });
  /** When the school and role match one we have, fill in the coach's name, email and cell. */
  const fill = (f: typeof blankCoach) => {
    const sch = findSchool(f.school);
    const c = sch && f.role !== "Other" ? staffOf(sch.id)[f.role] : { name: "", email: "", phone: "" };
    const pick = (k: "name" | "email" | "phone") => (!f[k] || f[k] === auto[k] ? c[k] : f[k]);
    setAuto({ name: c.name, email: c.email, phone: c.phone });
    return { ...f, name: pick("name"), email: pick("email"), phone: pick("phone") };
  };
  const change = (k: keyof typeof blankCoach) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(k === "school" || k === "role" ? fill(next) : next);
    setMsg(""); note.clear();
  };
  const save = () => {
    const sch = findSchool(form.school);
    const c = { name: form.name.trim(), school: sch?.name ?? form.school.trim(), schoolId: sch?.id, role: form.role, email: form.email.trim(), phone: form.phone.trim(), x: xHandle(form.x), notes: form.notes.trim() };
    if (!c.name) return setMsg("Type their name first.");
    update((d) => {
      d.coaches ??= [];
      const i = d.coaches.findIndex((x) => x.id === editing);
      if (i >= 0) d.coaches[i] = { ...d.coaches[i], ...c };
      else d.coaches.push({ id: `co${Date.now()}`, ...c });
    });
    note.start(editing ? `${c.name} is updated.` : `${c.name} is added.`);
    setForm(blankCoach);
    setEditing(null);
  };
  const edit = (c: CoachContact) => { setForm({ name: c.name, school: c.school, role: c.role, email: c.email, phone: c.phone, x: c.x ? `@${c.x}` : "", notes: c.notes }); setEditing(c.id); setMsg(""); note.clear(); };
  const remove = (c: CoachContact) => {
    if (!confirm(`Remove ${c.name}?`)) return;
    update((d) => { d.coaches = (d.coaches ?? []).filter((x) => x.id !== c.id); });
    if (editing === c.id) { setForm(blankCoach); setEditing(null); }
  };
  const schoolOf = (c: CoachContact) => (c.schoolId ? schools.find((x) => x.id === c.schoolId) : undefined);
  return (
    <div className="card sec" id="coach-list">
      <h2>Coaches we work with <span className="muted">{list.length}</span></h2>
      <form className="grid2" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label htmlFor="co-school">School</label><input id="co-school" list="co-schools" placeholder="Start typing a school" value={form.school} onChange={change("school")} /></div>
        <div className="field"><label htmlFor="co-role">Role</label>
          <select id="co-role" value={form.role} onChange={change("role")}>{ROLES.map((r) => <option key={r} value={r}>{roleName(r)}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="co-name">Name</label><input id="co-name" value={form.name} onChange={change("name")} /></div>
        <div className="field"><label htmlFor="co-email">Email</label><input id="co-email" type="email" value={form.email} onChange={change("email")} /></div>
        <div className="field"><label htmlFor="co-phone">Cell phone</label><input id="co-phone" type="tel" value={form.phone} onChange={change("phone")} /></div>
        <div className="field"><label htmlFor="co-x">X (Twitter)</label><input id="co-x" placeholder="@handle or x.com link" value={form.x} onChange={change("x")} /></div>
        <div className="field"><label htmlFor="co-notes">Notes</label><input id="co-notes" placeholder="How we know them, what they need" value={form.notes} onChange={change("notes")} /></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" id="co-save" type="submit">{editing ? "Save changes" : "+ Add coach"}</button>
          {editing && <button className="btn ghost" type="button" onClick={() => { setForm(blankCoach); setEditing(null); }}>Cancel</button>}
        </div>
      </form>
      <datalist id="co-schools">{schools.map((x) => <option key={x.id} value={x.name} />)}</datalist>
      {msg ? <p role="status" style={{ margin: 0 }}>{msg}</p> : note.view}
      {list.length > 0 ? (
        <div className="tablewrap"><table>
          <thead><tr><th>Name</th><th>School</th><th>Role</th><th>Email</th><th>Cell</th><th>X</th><th>Notes</th><th /></tr></thead>
          <tbody>{list.map((c) => {
            const sch = schoolOf(c);
            return (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td>{sch ? <Link href={`/schools?s=${sch.state}&school=${sch.id}`}>{sch.name}</Link> : c.school || <span className="muted">None</span>}</td>
                <td>{roleName(c.role)}</td>
                <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span className="muted">None</span>}</td>
                <td>{c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a> : <span className="muted">None</span>}</td>
                <td>{c.x ? <a href={`https://x.com/${c.x}`} target="_blank" rel="noopener noreferrer">@{c.x}</a> : <span className="muted">None</span>}</td>
                <td>{c.notes || <span className="muted">None</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="linkbtn" onClick={() => edit(c)}>Edit</button>{" "}
                  <button type="button" className="linkbtn" onClick={() => remove(c)}>Remove</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      ) : <p className="muted" style={{ margin: 0 }}>No coaches yet. Pick a school and role above and we fill in the coach we know.</p>}
    </div>
  );
}

