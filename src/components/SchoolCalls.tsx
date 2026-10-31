"use client";

import { LogCall } from "@/components/LogCall";
import type { School } from "@/data/schools";
import { WHO_LABEL } from "@/lib/intake";
import { useStore } from "@/lib/store";
import { useScouting } from "@/lib/useScouting";

const when = (d: string) => new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

/** Calls with one school's coaches: log a new one at the top, past calls below, newest first. */
export function SchoolCalls({ s }: { s: School }) {
  const { state, update } = useStore();
  const { canEdit } = useScouting();
  const calls = (state.schoolCalls ?? []).filter((c) => c.school === s.id);

  return (
    <div className="sec" id="school-calls" style={{ marginTop: 18 }}>
      {canEdit && <LogCall key={s.id} school={s} />}
      <div className="card sec" id="school-call-log">
        <h2>Calls with {s.name}</h2>
        {!calls.length && <p className="muted" style={{ margin: 0 }}>No calls yet.{canEdit && " Log one in the box above."}</p>}
        {calls.map((c) => (
          <div className="step" key={c.id}>
            <span className="mark list">{c.who === "Other" ? "•" : c.who}</span>
            <div className="grow">
              <div className="t" style={{ whiteSpace: "pre-wrap" }}>{c.note}</div>
              <div className="d">{[WHO_LABEL[c.who], c.name].filter(Boolean).join(", ")} · {when(c.date)}</div>
            </div>
            {canEdit && <button type="button" className="linkbtn" aria-label="Delete this call"
              onClick={() => { if (confirm("Delete this call?")) update((d) => { d.schoolCalls = (d.schoolCalls ?? []).filter((x) => x.id !== c.id); }); }}>✕</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
