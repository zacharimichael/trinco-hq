"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import US from "@/data/us-states.json";
import { Choice, ContactFields, Multi, Num, Rating, Text, YesNo } from "@/components/Fields";
import { SchoolSelect } from "@/components/SchoolSelect";
import {
  COACH_LABEL, HS_POSITIONS, SCHOOL_YEARS, kicks, money, nilTotal, NIL_YEARS, POS_LABEL, POS_SHORT, POSITIONS, punts,
  type CoachRole, type Film, type Player, type Talk,
} from "@/lib/players";
import { useStore } from "@/lib/store";
import { useScouting } from "@/lib/useScouting";

const STATE_NAMES = Object.entries(US as Record<string, { n: string }>).map(([c, s]) => [c, s.n]).sort((a, b) => a[1].localeCompare(b[1]));
const ROLES: CoachRole[] = ["HC", "GM", "ST"];

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sc, canEdit, school, staffOf, setStaff, setPlayer, removePlayer } = useScouting();
  const p = sc.players.find((x) => x.id === id);
  if (!p) return <section className="view"><Link className="back" href="/players">← All players</Link><p className="muted">This player isn&apos;t here anymore.</p></section>;

  const set = (patch: Partial<Player>) => setPlayer(p.id, patch);
  const sch = school(p.school);
  const staff = staffOf(p.school);

  // Leaving a brand-new profile without a name throws it away, so a mis-tap doesn't leave a blank player behind.
  const leave = () => { if (canEdit && !p.name.trim()) removePlayer(p.id); router.push("/players"); };

  return (
    <section className="view profile">
      <button className="back" type="button" onClick={leave}>← All players</button>
      <fieldset disabled={!canEdit} className="view" style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="card sec">
          <input className="bigname" aria-label="Player name" placeholder="Player name" autoFocus={!p.name} value={p.name} onChange={(e) => set({ name: e.target.value })} />
          <Choice label="Position" options={POSITIONS.map((x) => POS_SHORT[x])} value={POS_SHORT[p.pos]}
            onChange={(v) => v && set({ pos: POSITIONS.find((x) => POS_SHORT[x] === v)! })} />
          <label className="agree"><input type="checkbox" checked={p.client} onChange={(e) => set({ client: e.target.checked })} /> Signed with us (my athlete)</label>
        </div>

        <div className="card sec">
          <div className="formgrid">
            <SchoolSelect label="School now" value={p.school} onChange={(school) => set({ school })} />
            <div className="field">
              <label htmlFor="year">Year</label>
              <select id="year" value={p.year ?? ""} onChange={(e) => set({ year: (e.target.value || null) as Player["year"] })}>
                <option value="">Pick a year</option>
                {SCHOOL_YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <PriorSchools value={p.priorSchools} onChange={(priorSchools) => set({ priorSchools })} />
          <div className="field">
            <label htmlFor="hsState">High school state</label>
            <select id="hsState" value={p.hsState} onChange={(e) => set({ hsState: e.target.value })}>
              <option value="">Pick a state</option>
              {STATE_NAMES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              <option value="INTL">Outside the US</option>
            </select>
          </div>
          <div className="formgrid">
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
            <Num label="Age" value={p.age} onChange={(age) => set({ age })} />
          </div>
        </div>

        <div className="card sec">
          <h2>{POS_LABEL[p.pos]} ratings</h2>
          {p.pos === "LS" && (<>
            <Rating label="Long snapper rating" max={99} value={p.lsRating} onChange={(lsRating) => set({ lsRating })} />
            <Choice label="System" options={["Pro style", "Free release"] as const} value={p.system} onChange={(system) => set({ system })} />
            <div className="formgrid">
              <Num label="40-yard dash (sec)" step={0.01} placeholder="4.90" value={p.forty} onChange={(forty) => set({ forty })} />
              <Num label="225 lb bench (reps)" value={p.bench} onChange={(bench) => set({ bench })} />
            </div>
            <Rating label="Snap accuracy" max={20} value={p.snapAcc} onChange={(snapAcc) => set({ snapAcc })} />
            <Rating label="Snap speed" max={20} value={p.snapSpeed} onChange={(snapSpeed) => set({ snapSpeed })} />
            <Choice label="Snap spiral" options={["Loose", "Wobble", "Clean"] as const} value={p.spiral} onChange={(spiral) => set({ spiral })} />
          </>)}
          {kicks(p.pos) && (<>
            {p.pos === "KP" && <h3>Kicking</h3>}
            <Rating label="Kicker rating" max={99} value={p.kRating} onChange={(kRating) => set({ kRating })} />
            <Rating label="Kick power" max={20} value={p.kPower} onChange={(kPower) => set({ kPower })} />
            <Rating label="Kick accuracy" max={20} value={p.kAcc} onChange={(kAcc) => set({ kAcc })} />
            <Choice label="Kicking foot" options={["Right", "Left"] as const} value={p.foot} onChange={(foot) => set({ foot })} />
          </>)}
          {punts(p.pos) && (<>
            {p.pos === "KP" && <h3>Punting</h3>}
            <Rating label="Punter rating" max={99} value={p.pRating} onChange={(pRating) => set({ pRating })} />
            <Rating label="Punt power" max={20} value={p.pPower} onChange={(pPower) => set({ pPower })} />
            <Rating label="Punt accuracy" max={20} value={p.pAcc} onChange={(pAcc) => set({ pAcc })} />
            <Rating label="Get-off time" max={20} value={p.getOff} onChange={(getOff) => set({ getOff })} />
            <Choice label="Punt type" options={["Wobbly", "Spiral", "End over end"] as const} value={p.puntType} onChange={(puntType) => set({ puntType })} />
            <YesNo label="Holds?" value={p.holds} onChange={(holds) => set({ holds })} />
            <Choice label="Kicks from" options={["Sideline", "Middle of field", "Numbers"] as const} value={p.spot} onChange={(spot) => set({ spot })} />
          </>)}
          {p.pos !== "LS" && <YesNo label="Kicks off?" value={p.kicksOff} onChange={(kicksOff) => set({ kicksOff })} />}
        </div>

        <div className="card sec">
          <h2>Depth chart</h2>
          <Choice label="Role" options={["Starter", "Backup"] as const} value={p.depth} onChange={(depth) => set({ depth })} />
          <div className="checks">
            <label className="agree"><input type="checkbox" checked={p.allAmerican} onChange={(e) => set({ allAmerican: e.target.checked })} /> All-American</label>
            <label className="agree"><input type="checkbox" checked={p.allConference} onChange={(e) => set({ allConference: e.target.checked })} /> All-Conference</label>
          </div>
        </div>

        <div className="card sec">
          <h2>NIL earnings</h2>
          <div className="nilyears">
            {Array.from({ length: NIL_YEARS }, (_, i) => (
              <Num key={i} label={`Year ${i + 1}`} prefix="$" value={p.nil[i]}
                onChange={(v) => set({ nil: p.nil.map((n, j) => (j === i ? v : n)) })} />
            ))}
          </div>
          <div className="lines"><div className="total"><span>Earned so far</span><span>{money(nilTotal(p))}</span></div></div>
        </div>

        <div className="card sec">
          <YesNo label="Played another position?" value={p.playedOther ?? (p.otherPos.length ? true : null)} onChange={(playedOther) => set({ playedOther, ...(playedOther ? {} : { otherPos: [] }) })} />
          {(p.playedOther ?? p.otherPos.length > 0) && <Multi label="Which position?" options={HS_POSITIONS} value={p.otherPos} onChange={(otherPos) => set({ otherPos })} />}
        </div>

        <Talks p={p} onChange={(talks) => set({ talks })} decider={staff.decider} />
        <FilmBox p={p} onChange={(film) => set({ film })} />
        <details className="card fold">
          <summary><h2>{sch ? `${sch.name} coaches` : "School coaches"}</h2>{staff.decider && <span className="chip">Decision maker: {COACH_LABEL[staff.decider]}</span>}</summary>
          <div className="sec">
          {!sch ? <p className="muted" style={{ margin: 0 }}>Pick a school above first.</p> : (<>
            <p className="muted" style={{ margin: 0 }}>Shared with every player at {sch.name}.</p>
            {ROLES.map((r) => (
              <div key={r} className={`coach ${staff.decider === r ? "decider" : ""}`}>
                <div className="coachhead">
                  <h3>{COACH_LABEL[r]}</h3>
                  {staff.decider === r && <span className="badge go">Decision maker</span>}
                </div>
                <ContactFields value={staff[r]} onChange={(c) => setStaff(p.school, { ...staff, [r]: c })} />
              </div>
            ))}
            <Choice label="Who makes the decision?" options={ROLES.map((r) => COACH_LABEL[r])} value={staff.decider ? COACH_LABEL[staff.decider] : null}
              onChange={(v) => setStaff(p.school, { ...staff, decider: ROLES.find((r) => COACH_LABEL[r] === v) ?? null })} />
          </>)}
          </div>
        </details>

      </fieldset>

      <div className="donebar">
        {canEdit && <button className="btn" type="button" id="done" onClick={leave}>Done</button>}
        <Link className="btn ghost" href={`/compare?ids=${p.id}`}>Compare</Link>
        {canEdit && <button className="linkbtn" type="button" onClick={() => { if (confirm(`Delete ${p.name || "this player"}?`)) { router.push("/players"); removePlayer(p.id); } }}>Delete player</button>}
      </div>
    </section>
  );
}

function PriorSchools({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [next, setNext] = useState("");
  const add = () => { if (next.trim()) { onChange([...value, next.trim()]); setNext(""); } };
  return (
    <div className="field">
      <label htmlFor="prior">Schools before this one</label>
      {value.length > 0 && <div className="dots">{value.map((s, i) => (
        <span key={i} className="chip">{s} <button type="button" className="linkbtn" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button></span>
      ))}</div>}
      <div className="pair">
        <input id="prior" list="school-names" value={next} placeholder="Type a school" onChange={(e) => setNext(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn ghost" onClick={add}>Add</button>
      </div>
    </div>
  );
}

const WHO: { v: Talk["who"]; label: string }[] = [
  { v: "Player", label: "Player" }, { v: "Parent", label: "Parent" }, { v: "HC", label: "Head coach" }, { v: "GM", label: "GM" },
  { v: "ST", label: "Special teams" }, { v: "HSC", label: "HS coach" }, { v: "Other", label: "Other" },
];
const SHORT: Record<Talk["who"], string> = { Player: "P", Parent: "Pa", HC: "HC", GM: "GM", ST: "ST", HSC: "HS", Other: "•" };

/** Local date and time for a datetime-local input. */
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

/** Call log: every call with the player, family and coaches, newest first, so the conversation reads in order. */
function Talks({ p, onChange, decider }: { p: Player; onChange: (t: Talk[]) => void; decider: CoachRole | null }) {
  const [who, setWho] = useState<Talk["who"] | null>(null);
  const [when, setWhen] = useState(nowLocal);
  const [note, setNote] = useState("");
  const add = () => {
    if (!note.trim()) return;
    const date = when ? new Date(when).toISOString() : new Date().toISOString();
    onChange([...p.talks, { date, who: who ?? "Other", note: note.trim() }].sort((a, b) => b.date.localeCompare(a.date)));
    setNote(""); setWhen(nowLocal());
  };
  const calls = [...p.talks].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <details className="card fold" id="call-log">
      <summary><h2>Call log</h2><span className="chip">{calls.length} {calls.length === 1 ? "call" : "calls"}</span></summary>
      <div className="sec">
      <Choice label="Talked to" options={WHO.map((w) => w.label)} value={WHO.find((w) => w.v === who)?.label ?? null}
        onChange={(v) => setWho(WHO.find((w) => w.label === v)?.v ?? null)} />
      <div className="field">
        <label htmlFor="call-when">When</label>
        <input id="call-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <Text label="What was said" multiline value={note} placeholder="e.g. GM wants to see film, will offer $15k for next season" onChange={setNote} />
      <button className="btn" type="button" onClick={add} disabled={!note.trim()} style={{ alignSelf: "flex-start" }}>Log call</button>
      {calls.map((t) => (
        <div className="step" key={`${t.date}-${t.note}`}>
          <span className="mark list">{SHORT[t.who] ?? "•"}</span>
          <div className="grow"><div className="t">{t.note}</div>
            <div className="d">{WHO.find((w) => w.v === t.who)?.label}{decider === t.who && " (decision maker)"} · {new Date(t.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div></div>
          <button type="button" className="linkbtn" aria-label="Delete this call" onClick={() => { if (confirm("Delete this call?")) onChange(p.talks.filter((x) => x !== t)); }}>✕</button>
        </div>
      ))}
      </div>
    </details>
  );
}

function FilmBox({ p, onChange }: { p: Player; onChange: (f: Film[]) => void }) {
  const { uploadFilm, mode } = useStore();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) return setError("Paste a full link that starts with https://");
    const kind: Film["kind"] = /hudl\.com/i.test(url) ? "Hudl" : /onform/i.test(url) ? "OnForm" : "Link";
    onChange([...p.film, { kind, url }]);
    setLink(""); setError("");
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError("");
    const r = await uploadFilm(p.id, file);
    setBusy(false);
    if (typeof r === "string") setError(r); else onChange([...p.film, r]);
  };
  return (
    <details className="card fold">
      <summary><h2>Film</h2><span className="chip">{p.film.length} {p.film.length === 1 ? "clip" : "clips"}</span></summary>
      <div className="sec">
      <div className="pair">
        <input aria-label="Hudl or OnForm link" value={link} placeholder="Paste a Hudl or OnForm link" onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
        <button type="button" className="btn ghost" onClick={addLink}>Add link</button>
      </div>
      <label className="btn ghost filepick">
        {busy ? "Uploading…" : "Upload video from phone"}
        <input type="file" accept="video/*" hidden disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {mode === "demo" && <small className="muted">Demo: uploaded videos only last until you refresh.</small>}
      {error && <p style={{ margin: 0, color: "var(--stop)" }}>{error}</p>}
      {p.film.map((f, i) => <FilmItem key={i} f={f} onRemove={() => onChange(p.film.filter((_, j) => j !== i))} />)}
      </div>
    </details>
  );
}

function FilmItem({ f, onRemove }: { f: Film; onRemove: () => void }) {
  const { filmUrl } = useStore();
  const [src, setSrc] = useState(f.path ? "" : f.url);
  // Signed links expire, so fetch one when the clip is shown.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (f.path) void filmUrl(f).then(setSrc); }, [f.path]);
  return (
    <div className="film">
      <div className="coachhead">
        <b>{f.kind === "Video" ? f.name ?? "Video" : f.kind}</b>
        <button type="button" className="linkbtn" onClick={onRemove}>Remove</button>
      </div>
      {f.kind === "Video"
        ? (src ? <video src={src} controls playsInline preload="metadata" /> : <span className="muted">Loading…</span>)
        : <a href={f.url} target="_blank" rel="noreferrer" className="filmlink">{f.url}</a>}
    </div>
  );
}
