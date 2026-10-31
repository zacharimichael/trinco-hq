"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import US from "@/data/us-states.json";
import { DIVISIONS, type Division } from "@/data/schools";
import { SchoolCalls } from "@/components/SchoolCalls";
import { SchoolDepth } from "@/components/SchoolDepth";
import { cityOf, onMap, SchoolsUsMap, StateSchoolMap } from "@/components/SchoolMap";
import { useScouting } from "@/lib/useScouting";

const NAMES = US as Record<string, { n: string }>;
const DIV_LABEL: Record<Division, string> = { FBS: "FBS", FCS: "FCS", D2: "Division II", D3: "Division III", Other: "Other" };

export default function SchoolMapPage() {
  const { sc, schools, school } = useScouting();
  const [st, setSt] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [hide, setHide] = useState<Division[]>([]);
  const card = useRef<HTMLDivElement>(null);

  // The open state and school live in the URL (?s=MA&school=...) so a refresh or a link lands in the same place.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get("s")?.toUpperCase();
    if (s && NAMES[s]) setSt(s);
    if (q.get("school")) setPick(q.get("school"));
  }, []);
  const go = useCallback((s: string | null, id: string | null) => {
    setSt(s);
    setPick(id);
    const url = new URL(window.location.href);
    url.search = "";
    if (s) url.searchParams.set("s", s);
    if (id) url.searchParams.set("school", id);
    window.history.replaceState(null, "", url);
    if (id) requestAnimationFrame(() => card.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    else window.scrollTo({ top: 0 });
  }, []);

  const counts = useMemo(() => schools.reduce<Record<string, number>>((a, s) => { a[s.state] = (a[s.state] ?? 0) + 1; return a; }, {}), [schools]);
  const here = useMemo(() => schools.filter((s) => s.state === st).sort((a, b) => a.name.localeCompare(b.name)), [schools, st]);
  const shown = useMemo(() => here.filter((s) => !hide.includes(s.division)), [here, hide]);
  const withPlayers = useMemo(() => new Set(sc.players.map((p) => p.school)), [sc.players]);
  const picked = pick ? school(pick) : undefined;
  const players = picked ? sc.players.filter((p) => p.school === picked.id) : [];
  const toggle = (d: Division) => setHide((h) => (h.includes(d) ? h.filter((x) => x !== d) : [...h, d]));

  if (!st) {
    return (
      <section className="view">
        <div>
          <h1>School map</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>Tap a state to see its football schools.</p>
        </div>
        <div className="card"><div className="mapbox"><SchoolsUsMap counts={counts} onSelect={(c) => go(c, null)} /></div></div>
      </section>
    );
  }

  const divs = [...DIVISIONS, "Other" as const].filter((d) => here.some((s) => s.division === d));
  return (
    <section className="view">
      <div>
        <button type="button" className="linkbtn" onClick={() => go(null, null)}>← All states</button>
        <h1 style={{ marginTop: 6 }}>{NAMES[st].n}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{here.length} football {here.length === 1 ? "school" : "schools"}. Tap a flag.</p>
      </div>

      <div className="legend flagkey">
        {divs.map((d) => (
          <button key={d} type="button" aria-pressed={!hide.includes(d)} onClick={() => toggle(d)}>
            <span className={`flagdot ${d}`} />{DIV_LABEL[d]} <b>{here.filter((s) => s.division === d).length}</b>
          </button>
        ))}
        <span><span className="flagdot has" />Players tracked</span>
      </div>

      <div className="card"><div className="mapbox">
        <StateSchoolMap code={st} schools={shown} selected={pick} withPlayers={withPlayers}
          onSchool={(id) => go(st, id)} onState={(c) => go(c, null)} />
      </div></div>

      {picked && (
        <div className="card" ref={card} style={{ scrollMarginTop: 12 }}>
          <div className="coachhead">
            <div>
              <h2 style={{ margin: 0 }}>{picked.name}</h2>
              <small className="muted">{[DIV_LABEL[picked.division], picked.conference, cityOf(picked.id)].filter(Boolean).join(" · ")}</small>
            </div>
            <button type="button" className="linkbtn" onClick={() => go(st, null)}>Close</button>
          </div>
          <SchoolDepth s={picked} ps={players} pos="All" />
        </div>
      )}
      {picked && <SchoolCalls s={picked} />}

      <div className="schoollist">
        {divs.filter((d) => !hide.includes(d)).map((d) => (
          <div key={d} className="card sec">
            <h2 style={{ margin: 0 }}><span className={`flagdot ${d}`} /> {DIV_LABEL[d]}</h2>
            <div className="schoolbtns">
              {shown.filter((s) => s.division === d).map((s) => {
                const n = sc.players.filter((p) => p.school === s.id).length;
                return (
                  <button key={s.id} type="button" aria-pressed={pick === s.id} onClick={() => go(st, s.id)}>
                    <b>{s.name}</b>
                    <small className="muted">{[cityOf(s.id), s.conference].filter(Boolean).join(" · ")}{!onMap(s.id) && " · not on map"}</small>
                    {n > 0 && <span className="chip">{n} {n === 1 ? "player" : "players"}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
