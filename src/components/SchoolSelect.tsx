"use client";

import { useId } from "react";
import { useScouting } from "@/lib/useScouting";

/** Every FBS and FCS school, grouped by division and conference. */
export function SchoolSelect({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  const id = useId();
  const { schools } = useScouting();
  const groups = new Map<string, typeof schools>();
  for (const s of schools) {
    const k = `${s.division} · ${s.conference}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pick a school</option>
        {[...groups].map(([g, list]) => (
          <optgroup key={g} label={g}>
            {[...list].sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </optgroup>
        ))}
      </select>
      <datalist id="school-names">{schools.map((s) => <option key={s.id} value={s.name} />)}</datalist>
    </div>
  );
}
