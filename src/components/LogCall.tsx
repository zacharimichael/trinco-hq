"use client";

import { useEffect, useRef, useState } from "react";
import { Choice } from "@/components/Fields";
import { applyChanges, buildContext, FIELDS, findSchool, usable, type Change } from "@/lib/intake";
import type { School } from "@/data/schools";
import { COACH_LABEL, money, POS_LABEL, staffFor, type CoachRole, type Player, type Talk } from "@/lib/players";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

const WHO: { v: Talk["who"]; label: string }[] = [
  { v: "Player", label: "Player" }, { v: "Parent", label: "Parent" }, { v: "HC", label: "Head coach" }, { v: "GM", label: "GM" },
  { v: "ST", label: "Special teams" }, { v: "HSC", label: "HS coach" }, { v: "Other", label: "Other" },
];

/** Local date and time for a datetime-local input. */
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const todayLocal = () => nowLocal().slice(0, 10);
const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

type Step = { s: "write" } | { s: "sorting" } | { s: "review"; changes: Change[]; pick: boolean[] } | { s: "saved"; count: number };

/** On a school's page you pick one of its coaches, shown by name when we have it. */
const SCHOOL_WHO: Talk["who"][] = ["ST", "HC", "GM", "Other"];
const SCHOOL_SHORT: Record<string, string> = { ST: "Special teams", HC: "Head coach", GM: "GM", Other: "Someone else" };

/**
 * Log a call: type or paste what was said, the AI sorts it into the right places
 * (this profile, other players, depth charts, NIL, coaches, call list, calendar),
 * you tick what's right and save. The note itself always goes in the call log:
 * the player's when it's on a profile, the school's when it's on a school page.
 */
export function LogCall({ p, school }: { p?: Player; school?: School }) {
  const { state, update, mode } = useStore();
  const staff = school ? staffFor(state.scouting.staff, school.id) : null;
  const who_ = staff
    ? SCHOOL_WHO.map((v) => ({ v, label: v !== "Other" && staff[v as CoachRole].name.trim() ? `${SCHOOL_SHORT[v]}: ${staff[v as CoachRole].name.trim()}` : SCHOOL_SHORT[v] }))
    : WHO;
  const [who, setWho] = useState<Talk["who"] | null>(school ? "ST" : null);
  const coach = staff && who && who !== "Other" ? staff[who as CoachRole]?.name.trim() || undefined : undefined;
  const [when, setWhen] = useState(nowLocal);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>({ s: "write" });
  const [error, setError] = useState<{ text: string; noKey?: boolean } | null>(null);

  const iso = () => (when ? new Date(when).toISOString() : new Date().toISOString());
  const save = (changes: Change[]) => {
    const n = note.trim();
    if (!n) return;
    update((d) => applyChanges(d, { playerId: p?.id ?? null, schoolId: school?.id, coach, who: who ?? "Other", when: iso(), note: n, changes }));
    setNote(""); setWhen(nowLocal()); setError(null);
    setStep({ s: "saved", count: changes.length });
  };

  // A note typed but not saved is saved as a plain note when you leave the profile.
  const draft = useRef<(() => void) | null>(null);
  draft.current = note.trim() && step.s !== "saved" ? () => save([]) : null;
  useEffect(() => () => draft.current?.(), []);

  const sort = async () => {
    setError(null); setStep({ s: "sorting" });
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ note, who: who ?? "Other", coach, when: iso(), today: todayLocal(), context: buildContext(state, p?.id ?? null, school?.id) }),
      });
      const out = await res.json().catch(() => ({}));
      if (out.error === "no-key") { setStep({ s: "write" }); return setError({ text: "The AI isn't set up yet, so it can't sort notes. You can still save the note.", noKey: true }); }
      if (!res.ok) { setStep({ s: "write" }); return setError({ text: out.error ?? (mode === "demo" ? "The AI only works when you're signed in." : "Something went wrong. Try again.") }); }
      const all = (out.changes ?? []) as Change[];
      const refs = new Set(all.filter((c) => c.kind === "new_player").map((c) => c.player));
      const changes = all.filter((c) => usable(c, state.scouting, refs));
      setStep({ s: "review", changes, pick: changes.map(() => true) });
    } catch {
      setStep({ s: "write" });
      setError({ text: "Couldn't reach the AI. Check your internet and try again." });
    }
  };

  if (step.s === "review") {
    const chosen = step.changes.filter((_, i) => step.pick[i]);
    return (
      <div className="card sec" id="log-call">
        <h2>Here&apos;s what I found</h2>
        <p className="muted" style={{ margin: 0 }}>Untick anything that&apos;s wrong, then save.</p>
        {step.changes.length === 0 && <p style={{ margin: 0 }}>Nothing else to file. The note will go in the call log.</p>}
        <div className="found">
          {step.changes.map((c, i) => (
            <label key={i} className="foundrow">
              <input type="checkbox" checked={step.pick[i]} onChange={(e) => setStep({ ...step, pick: step.pick.map((x, j) => (j === i ? e.target.checked : x)) })} />
              <span className="grow"><b>{c.text}</b><small>{where(c, step.changes, state.scouting.players, p?.id ?? "", state.scouting)}</small></span>
            </label>
          ))}
          <div className="foundrow on"><span className="okmark">✓</span><span className="grow"><b>Your note</b><small>{school ? `${school.name} call log` : "Call log"}</small></span></div>
        </div>
        <div className="pair" style={{ alignItems: "center" }}>
          <button className="btn" type="button" id="save-found" onClick={() => save(keepRefs(chosen, step.changes))}>Save{chosen.length ? ` ${chosen.length + 1} things` : " note"}</button>
          <button className="btn ghost" type="button" onClick={() => setStep({ s: "write" })}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card sec" id="log-call">
      <h2>Log a call</h2>
      <Choice label="Talked to" options={who_.map((w) => w.label)} value={who_.find((w) => w.v === who)?.label ?? null}
        onChange={(v) => setWho(who_.find((w) => w.label === v)?.v ?? null)} />
      <div className="field">
        <label htmlFor="call-when">When</label>
        <input id="call-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="call-note">What was said</label>
        <textarea id="call-note" rows={5} value={note} disabled={step.s === "sorting"}
          placeholder={school
            ? "Type or paste anything. e.g. Starter LS graduates in May, they want a free-release snapper for 2027. Call him back after signing day."
            : "Type or paste anything. e.g. Their backup snapper is transferring and getting $8k a year. Call the ST coach back Friday."}
          onChange={(e) => { setNote(e.target.value); if (step.s === "saved") setStep({ s: "write" }); }} />
      </div>
      {error && <p className="warnline" style={{ margin: 0 }}>{error.text}</p>}
      <div className="pair" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" type="button" id="sort-call" onClick={sort} disabled={!note.trim() || step.s === "sorting" || error?.noKey} style={{ flex: "none" }}>
          {step.s === "sorting" ? "Sorting…" : "✨ Sort it for me"}
        </button>
        <button className="btn ghost" type="button" id="save-call" onClick={() => save([])} disabled={!note.trim() || step.s === "sorting"} style={{ flex: "none" }}>Just save the note</button>
        {step.s === "saved" && <span className="okchip" style={{ flex: "none" }}>✓ Saved{step.count ? ` with ${step.count} updates` : ""}</span>}
      </div>
    </div>
  );
}

/** New players are kept when anything ticked is about them, so a ticked change never points at nobody. */
function keepRefs(chosen: Change[], all: Change[]) {
  const need = new Set(chosen.map((c) => c.player));
  return [...all.filter((c) => c.kind === "new_player" && need.has(c.player) && !chosen.includes(c)), ...chosen];
}

/** The small line under each finding: whose profile and which box. */
function where(c: Change, all: Change[], players: Player[], me: string, sc: Parameters<typeof findSchool>[0]) {
  const who = c.player && c.player === me ? "This profile"
    : players.find((x) => x.id === c.player)?.name || all.find((x) => x.kind === "new_player" && x.player === c.player)?.name || "";
  const spot = (() => {
    switch (c.kind) {
      case "set": return `${FIELDS[c.field!]?.label}: ${c.field === "school" ? findSchool(sc, c.value)?.name : c.field === "height" ? `${Math.floor(Number(c.value) / 12)}'${Number(c.value) % 12}"` : c.value}`;
      case "nil": return `NIL year ${c.year}: ${money(c.amount ?? 0)}`;
      case "fact": return `Notes: ${[c.label, c.value].filter(Boolean).join(": ")}`;
      case "new_player": return `New ${POS_LABEL[c.pos ?? "LS"].toLowerCase()} profile${c.school ? ` at ${findSchool(sc, c.school)?.name ?? c.school}` : ""}`;
      case "call": return `Call list${c.date ? `, ${day(c.date)}` : ""}${c.phone ? ` · ${c.phone}` : ""}`;
      case "event": return `Calendar, ${day(c.date!)}${c.time ? ` ${c.time}` : ""}`;
      case "coach": return `${findSchool(sc, c.school)?.name} ${COACH_LABEL[c.role as CoachRole].toLowerCase()}${c.value && /decision/i.test(c.value) ? " (decision maker)" : ""}`;
    }
  })();
  return [c.kind === "new_player" ? "" : who, spot].filter(Boolean).join(" · ");
}
