"use client";

import { useEffect, useId, useState } from "react";
import { customSchool } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

/**
 * Type to find any FBS or FCS school. A school that isn't listed (Division II,
 * III, NAIA, JUCO) can be added with one tap; it just has no depth chart group.
 */
export function SchoolSelect({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  const id = useId();
  const { schools, school, edit } = useScouting();
  const current = school(value);
  const [text, setText] = useState(current?.name ?? "");
  useEffect(() => { setText(current?.name ?? ""); }, [current?.name]);

  const find = (t: string) => schools.find((s) => s.name.toLowerCase() === t.trim().toLowerCase());
  const type = (t: string) => {
    setText(t);
    const hit = find(t);
    if (hit) onChange(hit.id);
    else if (!t.trim()) onChange("");
  };
  const add = () => {
    const sch = customSchool(text.trim(), "Other", "Other", "");
    if (!schools.some((s) => s.id === sch.id)) edit((s) => { s.extraSchools.push(sch); });
    onChange(sch.id);
  };
  const unknown = text.trim() && !find(text);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} list="school-names" value={text} placeholder="Type a school" autoComplete="off" onChange={(e) => type(e.target.value)} />
      {current && !unknown && <small className="muted">{current.division === "Other" ? "Not FBS or FCS" : `${current.division} · ${current.conference}`}</small>}
      {unknown && <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={add}>+ Add &quot;{text.trim()}&quot;</button>}
      <datalist id="school-names">{schools.map((s) => <option key={s.id} value={s.name} />)}</datalist>
    </div>
  );
}
