"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa } from "d3-geo";
import US from "@/data/us-states.json";
import PLACES from "@/data/school-locations.json";
import type { School } from "@/data/schools";

const STATES = US as Record<string, { n: string; d: string; c: number[] }>;
const SPOTS = PLACES as unknown as Record<string, [number, number, string]>;
// Same projection us-atlas used to draw us-states.json, so a school lands on the right spot.
const project = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const SMALL = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"];

export const cityOf = (id: string) => SPOTS[id]?.[2] ?? "";
export const onMap = (id: string) => id in SPOTS;

/** Whole country. Tap a state to open it. */
export function SchoolsUsMap({ counts, onSelect }: { counts: Record<string, number>; onSelect: (code: string) => void }) {
  const props = (code: string) => ({
    className: "st pick",
    tabIndex: 0,
    role: "button",
    "aria-label": `${STATES[code].n}: ${counts[code] ?? 0} schools`,
    onClick: () => onSelect(code),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(code); }
    },
  });
  return (
    <svg viewBox="0 0 1040 610" className="usmap" role="img" aria-label="Map of the United States">
      {Object.entries(STATES).map(([code, s]) => <path key={code} d={s.d} {...props(code)}><title>{s.n}</title></path>)}
      {Object.entries(STATES).filter(([c]) => !SMALL.includes(c)).map(([c, s]) => <text key={c} x={s.c[0]} y={s.c[1]} className="lbl">{c}</text>)}
      {SMALL.map((c, i) => {
        const y = 150 + i * 34, s = STATES[c];
        return (
          <g key={c}>
            <line x1={s.c[0]} y1={s.c[1]} x2={975} y2={y} className="lead" />
            <g {...props(c)}>
              <rect x={975} y={y - 13} width={52} height={26} rx={7} />
              <text x={1001} y={y} className="lbl">{c}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/** Corners of a state's outline, padded and never smaller than DC needs. */
function frame(code: string) {
  const n = (STATES[code].d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const grow = (lo: number, hi: number, min: number) => {
    const pad = Math.max((hi - lo) * 0.1, (min - (hi - lo)) / 2, 0);
    return [lo - pad, hi + pad];
  };
  [x0, x1] = grow(x0, x1, 16);
  [y0, y1] = grow(y0, y1, 16);
  // Room above for the flags along the top edge.
  return { x: x0, y: y0 - (y1 - y0) * 0.04, w: x1 - x0, h: (y1 - y0) * 1.04 };
}

/** Schools close together would hide each other, so nudge them apart until every flag has room. */
function spread(pts: { id: string; x: number; y: number }[], u: number) {
  const at = pts.map((p, i) => ({ ...p, x: p.x + ((i % 3) - 1) * 0.01 * u, y: p.y + ((i % 5) - 2) * 0.01 * u }));
  // Flags are taller than wide, so they need more room up and down than side to side.
  const [rx, ry] = [u * 1.7, u * 2.4];
  for (let step = 0; step < 80; step++) {
    let moved = false;
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
      const a = at[i], b = at[j];
      const dx = (b.x - a.x) / rx, dy = (b.y - a.y) / ry, d = Math.hypot(dx, dy);
      if (d >= 1) continue;
      const push = (1 - d) / 2 / (d || 1);
      a.x -= dx * push * rx; a.y -= dy * push * ry;
      b.x += dx * push * rx; b.y += dy * push * ry;
      moved = true;
    }
    if (!moved) break;
  }
  return Object.fromEntries(at.map((p) => [p.id, [p.x, p.y] as [number, number]]));
}

/** One state, zoomed in, with a flag for every school. */
export function StateSchoolMap({ code, schools, selected, withPlayers, onSchool, onState }: {
  code: string; schools: School[]; selected: string | null; withPlayers: Set<string>;
  onSchool: (id: string) => void; onState: (code: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const f = useMemo(() => frame(code), [code]);
  // Flags keep a tappable size on a phone and don't crowd a wide screen.
  const box = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState(900);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPx(el.clientWidth || 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const u = (f.w / px) * Math.min(16, Math.max(11, px / 55));
  const spots = useMemo(() => {
    const pts = schools.filter((s) => onMap(s.id)).map((s) => {
      const [lat, lon] = SPOTS[s.id];
      const [x, y] = project([lon, lat]) ?? [0, 0];
      return { id: s.id, x, y };
    });
    return spread(pts, u);
  }, [schools, u]);
  const byId = new Map(schools.map((s) => [s.id, s]));
  const label = selected ?? hover;
  // Draw the picked one last so it sits on top.
  const order = Object.keys(spots).sort((a, b) => Number(a === selected) - Number(b === selected));

  return (
    <svg ref={box} viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`} className="usmap statemap" role="img" aria-label={`Map of ${STATES[code].n}`}>
      {Object.entries(STATES).map(([c, s]) => (
        <path key={c} d={s.d} className={c === code ? "st here" : "st near"}
          onClick={c === code ? undefined : () => onState(c)}><title>{s.n}</title></path>
      ))}
      {order.map((id) => {
        const s = byId.get(id)!;
        const [x, y] = spots[id];
        const sel = id === selected;
        const k = sel ? 1.35 : 1;
        return (
          <g key={id} className={`flag ${s.division} ${sel ? "sel" : ""}`} transform={`translate(${x} ${y}) scale(${u * k})`}
            tabIndex={0} role="button" aria-pressed={sel} aria-label={`${s.name}, ${s.division}`}
            onClick={() => onSchool(id)} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(id)} onBlur={() => setHover(null)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSchool(id); } }}>
            <title>{s.name}</title>
            <circle cx={0.5} cy={-1.1} r={1.3} className="hit" />
            <line x1={0} y1={0} x2={0} y2={-2.2} className="pole" />
            <path d="M0,-2.2 L1.5,-1.75 L0,-1.3 Z" className="cloth" />
            <circle cx={0} cy={0} r={0.22} className="foot" />
            {withPlayers.has(id) && <circle cx={1.5} cy={-2.3} r={0.42} className="has" />}
          </g>
        );
      })}
      {label && spots[label] && (() => {
        const [x, y] = spots[label];
        return <text x={x} y={y - u * 3.3} className="flaglbl" style={{ fontSize: u * 1.25, strokeWidth: u / 3 }}>{byId.get(label)?.name}</text>;
      })()}
    </svg>
  );
}
