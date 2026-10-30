"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Choice, ContactFields } from "@/components/Fields";
import type { School } from "@/data/schools";
import { COACH_LABEL, money, nilNow, overall, POS_LABEL, positionsFor, yearShort, type CoachRole, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";

const ROLES: CoachRole[] = ["HC", "GM", "ST"];

/** Starters first, then backups, then everyone else; best rating first inside each. */
export const depthOrder = (a: Player, b: Player) => {
  const r = (p: Player) => (p.depth === "Starter" ? 0 : p.depth === "Backup" ? 1 : 2);
  return r(a) - r(b) || (overall(b) ?? 0) - (overall(a) ?? 0);
};

/** One school's LS, K and P depth chart plus its head coach, GM and special teams coach. */
export function SchoolDepth({ s, ps, pos }: { s: School; ps: Player[]; pos: Pos | "All" }) {
  const router = useRouter();
  const { canEdit, addPlayer, staffOf, setStaff } = useScouting();
  const [editing, setEditing] = useState(false);
  const staff = staffOf(s.id);
  const shown = pos === "All" ? positionsFor(ps) : [pos];

  return (
    <div className="sec" style={{ marginTop: 14 }}>
      <div className="depthgrid">
        {shown.map((x) => (
          <div key={x} className="pcol">
            <div className="phead">{POS_LABEL[x]}</div>
            {ps.filter((p) => p.pos === x).sort(depthOrder).map((p) => (
              <Link key={p.id} href={`/players/${p.id}`} className="pcard">
                <b>{p.name || "New player"}</b>
                <small>{[yearShort(p.year), p.depth ?? "Unranked"].filter(Boolean).join(" · ")} · {money(nilNow(p))}{overall(p) != null && ` · ${overall(p)}`}</small>
                {(p.allAmerican || p.allConference || p.client || p.transfer) && <small>{[p.client && "My athlete", p.allAmerican && "All-American", p.allConference && "All-Conf", p.transfer && `🔁 ${p.transfer}`].filter(Boolean).join(" · ")}</small>}
              </Link>
            ))}
            {canEdit && <button type="button" className="btn ghost" onClick={() => router.push(`/players/${addPlayer(x, s.id)}`)}>+ Add</button>}
          </div>
        ))}
      </div>

      <div className="coaches">
        {ROLES.map((r) => (
          <div key={r} className={`coach ${staff.decider === r ? "decider" : ""}`}>
            <div className="coachhead"><b>{COACH_LABEL[r]}</b>{staff.decider === r && <span className="badge go">Decision maker</span>}</div>
            {editing ? <ContactFields value={staff[r]} onChange={(c) => setStaff(s.id, { ...staff, [r]: c })} />
              : <small className="muted">{[staff[r].name, staff[r].phone, staff[r].email].filter(Boolean).join(" · ") || "Not added yet"}</small>}
          </div>
        ))}
        {editing && <Choice label="Who makes the decision?" options={ROLES.map((r) => COACH_LABEL[r])} value={staff.decider ? COACH_LABEL[staff.decider] : null}
          onChange={(v) => setStaff(s.id, { ...staff, decider: ROLES.find((r) => COACH_LABEL[r] === v) ?? null })} />}
        {canEdit && <button type="button" className="linkbtn" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit contacts"}</button>}
      </div>
    </div>
  );
}
