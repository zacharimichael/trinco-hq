"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { heightText, kicks, money, nilNow, nilTotal, overall, POS_SHORT, punts, type Player } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

type Metric = {
  label: string;
  get: (p: Player) => number | string | null | undefined;
  /** For bars: the top of the scale. Omit for text rows. */
  max?: number | ((ps: Player[]) => number);
  /** Lower is better (40-yard dash). */
  low?: boolean;
  fmt?: (n: number) => string;
  when?: (p: Player) => boolean;
};

const yn = (b: boolean | null | undefined) => (b == null ? null : b ? "Yes" : "No");
const topOf = (get: (p: Player) => number) => (ps: Player[]) => Math.max(1, ...ps.map(get));

const GROUPS: { title: string; rows: Metric[] }[] = [
  { title: "Overall", rows: [
    { label: "Overall rating", get: overall, max: 99 },
    { label: "LS rating", get: (p) => p.lsRating, max: 99, when: (p) => p.pos === "LS" },
    { label: "K rating", get: (p) => p.kRating, max: 99, when: (p) => kicks(p.pos) },
    { label: "P rating", get: (p) => p.pRating, max: 99, when: (p) => punts(p.pos) },
  ] },
  { title: "Snapping", rows: [
    { label: "Snap accuracy", get: (p) => p.snapAcc, max: 20, when: (p) => p.pos === "LS" },
    { label: "Snap speed", get: (p) => p.snapSpeed, max: 20, when: (p) => p.pos === "LS" },
    { label: "Spiral", get: (p) => p.spiral, when: (p) => p.pos === "LS" },
    { label: "System", get: (p) => p.system, when: (p) => p.pos === "LS" },
    { label: "40-yard dash", get: (p) => p.forty, max: topOf((p) => p.forty ?? 0), low: true, fmt: (n) => `${n.toFixed(2)}s`, when: (p) => p.pos === "LS" },
    { label: "225 bench reps", get: (p) => p.bench, max: topOf((p) => p.bench ?? 0), when: (p) => p.pos === "LS" },
  ] },
  { title: "Kicking", rows: [
    { label: "Kick power", get: (p) => p.kPower, max: 20, when: (p) => kicks(p.pos) },
    { label: "Kick accuracy", get: (p) => p.kAcc, max: 20, when: (p) => kicks(p.pos) },
    { label: "Foot", get: (p) => p.foot, when: (p) => kicks(p.pos) },
    { label: "Kicks off", get: (p) => yn(p.kicksOff), when: (p) => p.pos !== "LS" },
  ] },
  { title: "Punting", rows: [
    { label: "Punt power", get: (p) => p.pPower, max: 20, when: (p) => punts(p.pos) },
    { label: "Punt accuracy", get: (p) => p.pAcc, max: 20, when: (p) => punts(p.pos) },
    { label: "Get-off time", get: (p) => p.getOff, max: 20, when: (p) => punts(p.pos) },
    { label: "Punt type", get: (p) => p.puntType, when: (p) => punts(p.pos) },
    { label: "Holds", get: (p) => yn(p.holds), when: (p) => punts(p.pos) },
    { label: "Kicks from", get: (p) => p.spot, when: (p) => punts(p.pos) },
  ] },
  { title: "Body", rows: [
    { label: "Age", get: (p) => p.age },
    { label: "Height", get: (p) => (p.height ? heightText(p.height) : null) },
    { label: "Weight", get: (p) => (p.weight ? `${p.weight} lbs` : null) },
  ] },
  { title: "NIL and honors", rows: [
    { label: "NIL now", get: nilNow, max: topOf(nilNow), fmt: money },
    { label: "NIL earned total", get: nilTotal, max: topOf(nilTotal), fmt: money },
    { label: "Depth", get: (p) => p.depth },
    { label: "All-American", get: (p) => (p.allAmerican ? "Yes" : "No") },
    { label: "All-Conference", get: (p) => (p.allConference ? "Yes" : "No") },
  ] },
];

export default function ComparePage() {
  const { sc, school } = useScouting();
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("ids");
    if (q) setIds(q.split(",").filter(Boolean));
  }, []);
  const choose = (next: string[]) => {
    setIds(next);
    const url = new URL(window.location.href);
    url.searchParams.set("ids", next.join(","));
    window.history.replaceState(null, "", url);
  };
  const ps = ids.map((id) => sc.players.find((p) => p.id === id)).filter((p): p is Player => !!p);
  const others = sc.players.filter((p) => !ids.includes(p.id));

  return (
    <section className="view">
      <Link className="back" href="/players">← All players</Link>
      <h1>Compare players</h1>
      {ps.length < 4 && (
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="addcmp">Add a player</label>
          <select id="addcmp" value="" onChange={(e) => e.target.value && choose([...ids, e.target.value])}>
            <option value="">Pick a player</option>
            {others.map((p) => <option key={p.id} value={p.id}>{p.name || "New player"} · {POS_SHORT[p.pos]} · {school(p.school)?.name ?? "No school"}</option>)}
          </select>
        </div>
      )}
      {ps.length === 0 ? <p className="muted">Pick at least two players.</p> : (
        <div className="card tablewrap">
          <table className="cmp" style={{ ["--n" as string]: ps.length }}>
            <thead>
              <tr><th />{ps.map((p) => (
                <th key={p.id}>
                  <Link href={`/players/${p.id}`} className="cmpname">{p.name || "New player"}</Link>
                  <small>{POS_SHORT[p.pos]} · {school(p.school)?.name ?? "—"}</small>
                  <button type="button" className="linkbtn" onClick={() => choose(ids.filter((x) => x !== p.id))}>Remove</button>
                </th>
              ))}</tr>
            </thead>
            {GROUPS.map((g) => {
              const rows = g.rows.filter((m) => !m.when || ps.some(m.when));
              if (!rows.length) return null;
              return (
                <tbody key={g.title}>
                  <tr className="grouprow"><th colSpan={ps.length + 1}>{g.title}</th></tr>
                  {rows.map((m) => <MetricRow key={m.label} m={m} ps={ps} />)}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </section>
  );
}

function MetricRow({ m, ps }: { m: Metric; ps: Player[] }) {
  const vals = ps.map((p) => (m.when && !m.when(p) ? undefined : m.get(p)));
  const nums = vals.filter((v): v is number => typeof v === "number" && v > 0);
  const best = nums.length > 1 && m.max ? (m.low ? Math.min(...nums) : Math.max(...nums)) : null;
  const max = typeof m.max === "function" ? m.max(ps) : m.max;
  return (
    <tr>
      <th scope="row">{m.label}</th>
      {vals.map((v, i) => {
        if (v == null || v === "") return <td key={i} className="muted">—</td>;
        if (typeof v !== "number" || !max) return <td key={i}>{v}</td>;
        // Lower is better: the fastest time gets the full bar.
        const pct = m.low ? (Math.min(...nums) / v) * 100 : (v / max) * 100;
        return (
          <td key={i} className={v === best ? "best" : undefined}>
            <div className="cmpbar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
            <b>{m.fmt ? m.fmt(v) : v}</b>{v === best && <span className="sr"> (best)</span>}
          </td>
        );
      })}
    </tr>
  );
}
