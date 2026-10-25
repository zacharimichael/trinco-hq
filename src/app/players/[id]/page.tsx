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

  return (
    <section className="view profile">
      <Link className="back" href="/players">← All players</Link>
      <fieldset disabled={!canEdit} className="view" style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="card sec">
          <input className="bigname" aria-label="Player name" placeholder="Player name" value={p.name} onChange={(e) => set({ name: e.target.value })} />
          <Choice label="Position" options={POSITIONS.map((x) => POS_SHORT[x])} value={POS_SHORT[p.pos]}
            onChange={(v) => v && set({ pos: POSITIONS.find((x) => POS_SHORT[x] === v)! })} />
          <label className="agree"><input type="checkbox" checked={p.client} onChange={(e) => set({ client: e.target.checked })} /> Signed with us (my athlete)</label>
        </div>

        <div className="card sec">
          <h2>Basics</h2>
          <div className="formgrid">
            <Num label="Age" value={p.age} onChange={(age) => set({ age })} />
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
          <Choice label="Year in school" options={SCHOOL_YEARS} value={p.year} onChange={(year) => set({ year })} />
          <SchoolSelect label="School now" value={p.school} onChange={(school) => set({ school })} />
          <PriorSchools value={p.priorSchools} onChange={(priorSchools) => set({ priorSchools })} />
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
          <h2>{sch ? `${sch.name} contacts` : "School contacts"}</h2>
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

        <Talks p={p} onChange={(talks) => set({ talks })} decider={staff.decider} />
        <FilmBox p={p} onChange={(film) => set({ film })} />

        <div className="card sec">
          <h2>High school</h2>
          <div className="formgrid">
            <Text label="High school" value={p.hs} onChange={(hs) => set({ hs })} />
            <div className="field">
              <label htmlFor="hsState">High school state</label>
              <select id="hsState" value={p.hsState} onChange={(e) => set({ hsState: e.target.value })}>
                <option value="">Pick a state</option>
                {STATE_NAMES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                <option value="INTL">Outside the US</option>
              </select>
            </div>
          </div>
          <h3>High school coach</h3>
          <ContactFields value={p.hsCoach} onChange={(hsCoach) => set({ hsCoach })} />
          <Text label="High school stats" multiline value={p.hsStats} placeholder="e.g. 14/16 FG, long of 52, 70% touchbacks" onChange={(hsStats) => set({ hsStats })} />
          <YesNo label="Played another position?" value={p.playedOther ?? (p.otherPos.length ? true : null)} onChange={(playedOther) => set({ playedOther, ...(playedOther ? {} : { otherPos: [] }) })} />
          {(p.playedOther ?? p.otherPos.length > 0) && <Multi label="Which position?" options={HS_POSITIONS} value={p.otherPos} onChange={(otherPos) => set({ otherPos })} />}
          <YesNo label="Played other sports?" value={p.otherSportsYes ?? (p.otherSports ? true : null)} onChange={(otherSportsYes) => set({ otherSportsYes, ...(otherSportsYes ? {} : { otherSports: "" }) })} />
          {(p.otherSportsYes ?? !!p.otherSports) && <Text label="Which sports?" value={p.otherSports} placeholder="Soccer, baseball" onChange={(otherSports) => set({ otherSports })} />}
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn" href={`/compare?ids=${p.id}`}>Compare with others</Link>
        {canEdit && <button className="btn ghost" type="button" onClick={() => { if (confirm(`Delete ${p.name || "this player"}?`)) { router.push("/players"); removePlayer(p.id); } }}>Delete player</button>}
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

const WHO: { v: Talk["who"]; label: string }[] = [{ v: "HC", label: "Head coach" }, { v: "GM", label: "GM" }, { v: "ST", label: "Special teams" }, { v: "Other", label: "Other" }];

/** Live negotiation updates: who we talked to and what they said. */
function Talks({ p, onChange, decider }: { p: Player; onChange: (t: Talk[]) => void; decider: CoachRole | null }) {
  const [who, setWho] = useState<Talk["who"] | null>(decider);
  const [note, setNote] = useState("");
  const add = () => {
    if (!note.trim()) return;
    onChange([{ date: new Date().toISOString(), who: who ?? "Other", note: note.trim() }, ...p.talks]);
    setNote("");
  };
  return (
    <div className="card sec">
      <h2>Negotiation updates</h2>
      <Choice label="Talked to" options={WHO.map((w) => w.label)} value={WHO.find((w) => w.v === who)?.label ?? null}
        onChange={(v) => setWho(WHO.find((w) => w.label === v)?.v ?? null)} />
      <Text label="What happened" multiline value={note} placeholder="e.g. GM wants to see film, will offer $15k for next season" onChange={setNote} />
      <button className="btn" type="button" onClick={add} disabled={!note.trim()} style={{ alignSelf: "flex-start" }}>Add update</button>
      {p.talks.map((t, i) => (
        <div className="step" key={i}>
          <span className="mark list">{t.who === "Other" ? "•" : t.who}</span>
          <div className="grow"><div className="t">{t.note}</div>
            <div className="d">{WHO.find((w) => w.v === t.who)?.label}{decider === t.who && " (decision maker)"} · {new Date(t.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div></div>
        </div>
      ))}
    </div>
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
    <div className="card sec">
      <h2>Film</h2>
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
