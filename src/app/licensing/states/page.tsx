"use client";

import { useRouter } from "next/navigation";
import { fmt, gaps, LABEL, RULES, section, status, TRACKED } from "@/lib/rules";
import { useStore } from "@/lib/store";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** "issued_at + 2y" → "Every 2 years", "May 31 of each even year" → "May 31, even years". */
function renewText(rule?: string) {
  const rel = rule?.match(/issued_at\s*\+\s*(\d+)y/);
  if (rel) return rel[1] === "1" ? "Every year" : `Every ${rel[1]} years`;
  const m = rule?.match(/^([A-Za-z]+\.? \d{1,2}) of each (even|odd) year/);
  if (m) return `${m[1]}, ${m[2]} years`;
  return rule ? "Not confirmed" : "";
}

/** Every state's rules side by side. Tap a row to open that state on the map. */
export default function AllStatesPage() {
  const { state } = useStore();
  const router = useRouter();
  const need = TRACKED.filter((c) => RULES[c].license_required);
  const rulesOnly = TRACKED.filter((c) => !RULES[c].license_required && RULES[c].law?.type !== "none");
  const noLaw = TRACKED.filter((c) => RULES[c].law?.type === "none");
  const open = TRACKED.reduce((n, c) => n + gaps(c).length, 0);

  return (
    <section className="view">
      <div>
        <h1>All states</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>What each state requires. Tap a state to start.</p>
      </div>
      <div className="summary">
        <span className="pill ath"><b>{need.length}</b> Need a license</span>
        <span className="pill ath"><b>{rulesOnly.length}</b> No license, but rules</span>
        <span className="pill ath"><b>{noLaw.length}</b> No agent law</span>
        <span className="pill wip"><b>{open}</b> Still being confirmed</span>
      </div>
      <div className="card sec">
        <div className="tablewrap"><table id="all-states">
          <thead><tr><th>State</th><th>You need</th><th className="num">To start</th><th>Renews</th><th>You</th><th>Checked</th></tr></thead>
          <tbody>{[...TRACKED].sort((a, b) => RULES[a].name.localeCompare(RULES[b].name)).map((c) => {
            const R = RULES[c];
            const cost = (section(c, "get_licensed")?.steps ?? []).reduce((n, st) => n + (st.type === "payment" ? st.amount_usd ?? 0 : 0), 0);
            const renew = section(c, "renew")?.steps[0];
            const s = status(c, state.done);
            const g = gaps(c).length;
            return (
              <tr key={c} className="pickrow" data-state={c} tabIndex={0} onClick={() => router.push(`/licensing?s=${c}`)}
                onKeyDown={(e) => { if (e.key === "Enter") router.push(`/licensing?s=${c}`); }}>
                <td><b>{R.name}</b>{g > 0 && <div><span className="gapchip">{g} to confirm</span></div>}</td>
                <td>{R.license_required ? "License" : R.law?.type === "none" ? "Nothing to file" : "Follow the rules"}</td>
                <td className="num">{cost ? money(cost) : "—"}</td>
                <td>{R.license_required ? <>{renewText(renew?.due_rule) || "Not confirmed"}{renew?.amount_usd != null && <div className="muted" style={{ fontSize: 13 }}>{money(renew.amount_usd)}</div>}</> : "—"}</td>
                <td><span className={`dot ${s.key}`} style={{ display: "inline-block", verticalAlign: "middle" }} /> <span style={{ fontSize: 14 }}>{LABEL[s.key]}</span></td>
                <td className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{fmt(`${R.last_researched}T00:00:00`)}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>No state&apos;s rules have been checked by a lawyer yet. Costs to start don&apos;t include fingerprints or bonds.</p>
      </div>
    </section>
  );
}
