"use client";

import { useId } from "react";
import type { Contact } from "@/lib/players";

/** Small form controls for the player profiles: big tap targets, one tap per answer. */

export function Text({ label, value, onChange, placeholder, multiline, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline
        ? <textarea id={id} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

export function Num({ label, value, onChange, step = 1, placeholder, prefix }: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void; step?: number; placeholder?: string; prefix?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={prefix ? "prefixed" : undefined}>
        {prefix && <span>{prefix}</span>}
        <input id={id} type="number" inputMode="decimal" step={step} min={0} value={value ?? ""} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
      </div>
    </div>
  );
}

/** A 1-20 or 1-99 rating as a slider with the number beside it. */
export function Rating({ label, value, onChange, max }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; max: 20 | 99 }) {
  const id = useId();
  const v = value ?? null;
  return (
    <div className="rate">
      <label htmlFor={id}>{label} <span className="muted">1–{max}</span></label>
      <div className="rateline">
        <input id={id} type="range" min={1} max={max} value={v ?? Math.ceil(max / 2)} data-empty={v == null}
          onChange={(e) => onChange(Number(e.target.value))} />
        <output htmlFor={id} className={v == null ? "muted" : undefined}>{v ?? "—"}</output>
      </div>
    </div>
  );
}

/** Pick one (tap again to clear). */
export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T | null | undefined; onChange: (v: T | null) => void }) {
  return (
    <fieldset className="seg">
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(value === o ? null : o)}>{o}</button>
        ))}
      </div>
    </fieldset>
  );
}

export function YesNo({ label, value, onChange }: { label: string; value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  const v = value == null ? null : value ? "Yes" : "No";
  return <Choice label={label} options={["Yes", "No"] as const} value={v} onChange={(x) => onChange(x == null ? null : x === "Yes")} />;
}

/** Pick any number. */
export function Multi({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="seg">
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value.includes(o)}
            onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>{o}</button>
        ))}
      </div>
    </fieldset>
  );
}

export function ContactFields({ value, onChange }: { value: Contact; onChange: (v: Contact) => void }) {
  return (
    <div className="formgrid">
      <Text label="Name" value={value.name} onChange={(name) => onChange({ ...value, name })} />
      <Text label="Phone" type="tel" value={value.phone} onChange={(phone) => onChange({ ...value, phone })} />
      <Text label="Email" type="email" value={value.email} onChange={(email) => onChange({ ...value, email })} />
    </div>
  );
}
