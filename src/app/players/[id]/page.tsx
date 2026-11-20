"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Num } from "@/components/Fields";
import { LogCall } from "@/components/LogCall";
import { Payments } from "@/components/Payments";
import { SchoolSelect } from "@/components/SchoolSelect";
import { TransferField } from "@/components/TransferField";
import {
  heightText, hsClassText, isHs, money, nilTotal, NIL_YEARS, SCHOOL_YEARS, yearsLeft, YEARS_LEFT, yearShort,
  type CoachRole, type Fact, type Player, type Talk,
} from "@/lib/players";
import { useStore } from "@/lib/store";
import { useScouting } from "@/lib/useScouting";
import { lastTalk } from "@/lib/toTalk";
import { useToTalk } from "@/lib/useToTalk";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sc, canEdit, school, staffOf, setPlayer, removePlayer } = useScouting();
  const p = sc.players.find((x) => x.id === id);
  const hidden = useStore().state.scouting.players.find((x) => x.id === id);
  if (!p && hidden) return <section className="view"><Link className="back" href="/players">← All players</Link><p className="muted">Kickers and punters are hidden for now. This profile is still saved.</p></section>;
  if (!p) return <section className="view"><Link className="back" href="/players">← All players</Link><p className="muted">This player isn&apos;t here anymore.</p></section>;

  const set = (patch: Partial<Player>) => setPlayer(p.id, patch);
  const staff = staffOf(p.school);
  // One line under the name: where they are, what year, how big. Blanks are left out.
  const at = school(p.school)?.name || p.jucoSchool?.trim() || (isHs(p) ? [p.hs?.trim(), p.hsState].filter(Boolean).join(", ") || "High school" : "");
  const yr = isHs(p) ? hsClassText(p.hsClass!) : yearShort(p.year);
  const glance = [at, yr, p.height ? heightText(p.height) : "", p.weight ? `${p.weight} lbs` : ""].filter(Boolean).join(" · ");

  // Leaving a brand-new profile without a name throws it away, so a mis-tap doesn't leave a blank player behind.
  const leave = () => { if (canEdit && !p.name.trim()) removePlayer(p.id); router.push("/players"); };

  return (
    <section className="view profile">
      <button className="back" type="button" onClick={leave}>← All players</button>
      <fieldset disabled={!canEdit} className="view" style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="card sec">
          <input className="bigname" aria-label="Player name" placeholder="Player name" autoFocus={!p.name} value={p.name} onChange={(e) => set({ name: e.target.value })} />
          {glance && <p className="glance">{glance}</p>}
          <label className="agree"><input type="checkbox" checked={p.client} onChange={(e) => set({ client: e.target.checked })} /> Signed with us (my athlete)</label>
        </div>

        <div className="card sec">
          <SchoolSelect label="School now" value={p.school} onChange={(school) => set({ school })} />
          <div className="formgrid">
            {isHs(p)
              ? <div className="field"><label>Year</label><input disabled value={hsClassText(p.hsClass!)} /></div>
              : <div className="field">
                  <label htmlFor="year">Year</label>
                  <select id="year" value={p.year ?? ""} onChange={(e) => set({ year: (e.target.value || null) as Player["year"] })}>
                    <option value="">Pick a year</option>
                    {SCHOOL_YEARS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>}
            <div className="field">
              <label>Height</label>
              <div className="pair">
                <div className="prefixed"><input aria-label="Feet" type="number" min={4} max={7} value={p.height ? Math.floor(p.height / 12) : ""}
                  onChange={(e) => set({ height: e.target.value === "" ? null : Number(e.target.value) * 12 + ((p.height ?? 0) % 12) })} /><span>ft</span></div>
                <div className="prefixed"><input aria-label="Inches" type="number" min={0} max={11} value={p.height ? p.height % 12 : ""}
                  onChange={(e) => set({ height: Math.floor((p.height ?? 72) / 12) * 12 + Math.min(11, Number(e.target.value) || 0) })} /><span>in</span></div>
              </div>
            </div>
            <Num label="Weight (lbs)" value={p.weight} onChange={(weight) => set({ weight })} />
          </div>
          <SchoolList id="prior" label="Schools before this one" value={p.priorSchools} onChange={(priorSchools) => set({ priorSchools })} />
          <div className="field">
            <label htmlFor="years-left">Years of eligibility left after this season</label>
            <select id="years-left" value={yearsLeft(p) ?? ""} onChange={(e) => set({ yearsLeft: e.target.value === "" ? null : Number(e.target.value) })}>
              <option value="">Not sure</option>
              {YEARS_LEFT.map((n) => <option key={n} value={n}>{n}{p.yearsLeft == null && yearsLeft(p) === n ? " (from year)" : ""}</option>)}
            </select>
          </div>
        </div>

        <div className="card sec">
          <h2>NIL money</h2>
          <div className="nilyears">
            {Array.from({ length: NIL_YEARS }, (_, i) => (
              <Num key={i} label={`Year ${i + 1}`} prefix="$" value={p.nil[i]}
                onChange={(v) => set({ nil: p.nil.map((n, j) => (j === i ? v : n)) })} />
            ))}
          </div>
          <div className="lines"><div className="total"><span>Earned so far</span><span>{money(nilTotal(p))}</span></div></div>
        </div>

        <div className="card sec" id="transfer">
          <h2>Schools interested in transferring to</h2>
          <TransferField value={p.transfer ?? null} onChange={(transfer) => set(transfer ? { transfer } : { transfer, transferTo: null })} />
          <SchoolList id="want" label="Schools they'd like to go to" value={p.wantSchools ?? []} onChange={(wantSchools) => set({ wantSchools })} />
        </div>

        {(p.client || (p.payments?.length ?? 0) > 0) && <Payments p={p} />}
        <ToTalkBar p={p} />
        <LogCall p={p} key={p.id} />
        <Talks p={p} onChange={(talks) => set({ talks })} decider={staff.decider} />
        <Facts facts={p.facts ?? []} onChange={(facts) => set({ facts })} />
      </fieldset>

      <div className="donebar">
        {canEdit && <button className="btn" type="button" id="done" onClick={leave}>Done</button>}
        {canEdit && <button className="linkbtn" type="button" onClick={() => { if (confirm(`Delete ${p.name || "this player"}?`)) { router.push("/players"); removePlayer(p.id); } }}>Delete player</button>}
      </div>
    </section>
  );
}

/** A list of school names: type one, tap Add. Used for past schools and schools a player wants to transfer to. */
function SchoolList({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [next, setNext] = useState("");
  const add = () => { const v = next.trim(); if (v && !value.includes(v)) onChange([...value, v]); setNext(""); };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {value.length > 0 && <div className="dots">{value.map((s, i) => (
        <span key={i} className="chip">{s} <button type="button" className="linkbtn" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button></span>
      ))}</div>}
      <div className="pair">
        <input id={id} list="school-names" value={next} placeholder="Type a school" onChange={(e) => setNext(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn ghost" onClick={add}>Add</button>
      </div>
    </div>
  );
}

const WHO_LABEL: Record<Talk["who"], string> = { Player: "Player", Parent: "Parent", HC: "Head coach", GM: "GM", ST: "Special teams", HSC: "HS coach", Other: "Other" };
const SHORT: Record<Talk["who"], string> = { Player: "P", Parent: "Pa", HC: "HC", GM: "GM", ST: "ST", HSC: "HS", Other: "•" };
const when = (d: string) => new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

/** Things learned on calls that have no box of their own, newest first. */
function Facts({ facts, onChange }: { facts: Fact[]; onChange: (f: Fact[]) => void }) {
  return (
    <details className="card fold" id="notes" open={facts.length > 0 && facts.length <= 5}>
      <summary><h2>Notes from calls</h2><span className="chip">{facts.length}</span></summary>
      <div className="sec">
        {!facts.length && <p className="muted" style={{ margin: 0 }}>Log a call above and anything that has no box lands here.</p>}
        {facts.map((f) => (
          <div className="step" key={f.id}>
            <div className="grow"><div className="t">{f.label && <b>{f.label}: </b>}{f.value}</div>
              <div className="d">{f.from} · {when(f.date)}</div></div>
            <button type="button" className="linkbtn" aria-label="Delete this note" onClick={() => { if (confirm("Delete this note?")) onChange(facts.filter((x) => x.id !== f.id)); }}>✕</button>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Shows whether you've talked to this player and puts them on (or takes them off) "Players to talk to". */
function ToTalkBar({ p }: { p: Player }) {
  const { onList, add, remove } = useToTalk();
  // The call list (under Calendar) is owner only, so others see the list name without a link.
  const owner = useStore().state.me?.role === "owner";
  if (!p.name.trim()) return null;
  const last = lastTalk(p);
  const on = onList(p.id);
  return (
    <div className="card todo wraps" id="to-talk">
      <span className={`dot ${last ? "go" : "wip"}`} />
      <span className="grow">
        <b>{last ? `Last talked ${new Date(last).toLocaleDateString([], { dateStyle: "medium" })}` : "Never talked to"}</b>
        {on && <small>On your {owner ? <Link href="/calls#to-talk">Players to talk to</Link> : "Players to talk to"} list. Logging a call with them below checks them off.</small>}
      </span>
      {on
        ? <button className="linkbtn" type="button" onClick={() => remove(p.id)}>Take off list</button>
        : <button className="btn" type="button" onClick={() => add([p])}>+ Players to talk to</button>}
    </div>
  );
}

/** Call log: every call with the player, family and coaches, newest first. Calls are logged in the box at the top. */
function Talks({ p, onChange, decider }: { p: Player; onChange: (t: Talk[]) => void; decider: CoachRole | null }) {
  const calls = [...p.talks].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <details className="card fold" id="call-log">
      <summary><h2>Call log</h2><span className="chip">{calls.length} {calls.length === 1 ? "call" : "calls"}</span></summary>
      <div className="sec">
      {!calls.length && <p className="muted" style={{ margin: 0 }}>No calls yet. Log one in the box at the top.</p>}
      {calls.map((t) => (
        <div className="step" key={`${t.date}-${t.note}`}>
          <span className="mark list">{SHORT[t.who] ?? "•"}</span>
          <div className="grow"><div className="t" style={{ whiteSpace: "pre-wrap" }}>{t.note}</div>
            <div className="d">{WHO_LABEL[t.who]}{decider === t.who && " (decision maker)"} · {when(t.date)}</div></div>
          <button type="button" className="linkbtn" aria-label="Delete this call" onClick={() => { if (confirm("Delete this call?")) onChange(p.talks.filter((x) => x !== t)); }}>✕</button>
        </div>
      ))}
      </div>
    </details>
  );
}
