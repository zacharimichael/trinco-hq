"use client";

import US from "@/data/us-states.json";
import { LABEL, RULES, type StatusKey } from "@/lib/rules";

const STATES = US as Record<string, { n: string; d: string; c: number[] }>;
// Too small to tap on the map, so they also get a labeled button to the right.
const SMALL = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"];

export function UsMap({ statuses, counts = {}, selected, onSelect }: { statuses: Record<string, StatusKey>; counts?: Record<string, number>; selected?: string | null; onSelect: (code: string) => void }) {
  const tracked = (c: string) => c in statuses && c in RULES;
  // Every state opens in the panel; states still being researched say "coming soon".
  const props = (code: string) => ({
    className: `st ${tracked(code) ? `tracked ${statuses[code]}` : "pick"}${selected === code ? " sel" : ""}`,
    tabIndex: 0,
    role: "button",
    "aria-pressed": selected === code,
    "aria-label": `${STATES[code].n}: ${tracked(code) ? LABEL[statuses[code]] : "coming soon"}${counts[code] ? `, ${counts[code]} athletes` : ""}`,
    onClick: () => onSelect(code),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(code);
      }
    },
  });

  return (
    <svg viewBox="0 0 1040 610" className="usmap" role="img" aria-label="Map of the United States">
      {Object.entries(STATES).map(([code, s]) => (
        <path key={code} id={`tile-${code}`} d={s.d} {...props(code)}><title>{s.n}</title></path>
      ))}
      {Object.entries(STATES).filter(([c]) => !SMALL.includes(c)).map(([c, s]) => (
        <text key={c} x={s.c[0]} y={s.c[1]} className={`lbl ${tracked(c) ? "on" : ""}`}>{c}</text>
      ))}
      {SMALL.map((c, i) => {
        const y = 150 + i * 34, s = STATES[c];
        return (
          <g key={c}>
            <line x1={s.c[0]} y1={s.c[1]} x2={975} y2={y} className="lead" />
            <g {...props(c)}>
              <rect x={975} y={y - 13} width={52} height={26} rx={7} />
              <text x={1001} y={y} className={`lbl ${tracked(c) ? "on" : ""}`}>{c}</text>
            </g>
          </g>
        );
      })}
      {/* My athletes per state: a small count badge on the state (or its button). */}
      {Object.entries(counts).filter(([c, n]) => n > 0 && STATES[c]).map(([c, n]) => {
        const i = SMALL.indexOf(c);
        const [x, y] = i >= 0 ? [1027, 150 + i * 34 - 13] : [STATES[c].c[0] + 14, STATES[c].c[1] - 12];
        return (
          <g key={`n-${c}`} className="athcount" aria-hidden>
            <circle cx={x} cy={y} r={10} />
            <text x={x} y={y}>{n}</text>
          </g>
        );
      })}
    </svg>
  );
}
