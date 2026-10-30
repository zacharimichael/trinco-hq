"use client";

import { useState } from "react";
import { TRANSFER_PICKS } from "@/lib/players";

/** Transfer status: one tap for the usual ones, or type your own (e.g. "Committed to Auburn"). Empty means staying. */
export function TransferField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const custom = !!value && !(TRANSFER_PICKS as readonly string[]).includes(value);
  const [typing, setTyping] = useState(custom);
  return (
    <fieldset className="seg">
      <legend>Transferring?</legend>
      <div>
        <button type="button" aria-pressed={!value && !typing} onClick={() => { setTyping(false); onChange(null); }}>Staying</button>
        {TRANSFER_PICKS.map((o) => (
          <button key={o} type="button" aria-pressed={value === o && !typing} onClick={() => { setTyping(false); onChange(o); }}>{o}</button>
        ))}
        <button type="button" aria-pressed={typing || custom} onClick={() => setTyping(true)}>Other</button>
      </div>
      {(typing || custom) && (
        <input aria-label="Transfer status" style={{ marginTop: 8 }} placeholder="e.g. Committed to Auburn" value={custom ? value! : ""}
          autoFocus={typing && !custom} onChange={(e) => onChange(e.target.value || null)} />
      )}
    </fieldset>
  );
}
