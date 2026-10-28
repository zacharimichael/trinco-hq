"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Choice, ContactFields, Text } from "@/components/Fields";
import type { Division, School } from "@/data/schools";
import { COACH_LABEL, customSchool, money, yearShort, nilNow, nilTotal, overall, POS_LABEL, POS_SHORT, POSITIONS, positionsFor, type CoachRole, type Player, type Pos } from "@/lib/players";
import { useScouting } from "@/lib/useScouting";
import { SortTh, useSort } from "@/components/SortTh";

const BOARDS = ["By school", "By conference", "Top earners", "All-Americans", "All-Conference", "Starters", "Backups"] as const;
type Board = (typeof BOARDS)[number];
const ROLES: CoachRole[] = ["HC", "GM", "ST"];

/** Starters first, then backups, then everyone else; best rating first inside each. */
const depthOrder = (a: Player, b: Player) => {
  const r = (p: Player) => (p.depth === "Starter" ? 0 : p.depth === "Backup" ? 1 : 2);
  return r(a) - r(b) || (overall(b) ?? 0) - (overall(a) ?? 0);
};

export default function DepthPage() {
  const { sc, schools, school } = useScouting();
  const [div, setDiv] = useState<Division | "All">("All");
  const [pos, setPos] = useState<Pos | "All">("All");
  const [board, setBoard] = useState<Board>("By school");
  const [conf, setConf] = useState("");

  const inDiv = schools.filter((s) => div === "All" || s.division === div);
  const confs = [...new Set(inDiv.map((s) => s.conference))];
  const conference = confs.includes(conf) ? conf : "";
  const players = sc.players.filter((p) => {
    const s = school(p.school);
    return s && (div === "All" || s.division === div) && (!conference || s.conference === conference) && (pos === "All" || p.pos === pos);
  });
  const inBoard: Record<Exclude<Board, "By school" | "By conference">, (p: Player) => boolean> = {
    "Top earners": (p) => nilNow(p) > 0,
    "All-Americans": (p) => p.allAmerican,
    "All-Conference": (p) => p.allConference,
    Starters: (p) => p.depth === "Starter",
    Backups: (p) => p.depth === "Backup",
  };
  const nowTotal = players.reduce((a, p) => a + nilNow(p), 0);

  return (
    <section className="view">
      <div>
        <h1>Depth charts</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Every FBS and FCS school. LS, K and P.</p>
      </div>

      <div className="tiles">
        <div className="tile2"><span className="big">{players.length}</span>Players tracked</div>
        <div className="tile2"><span className="big">{money(nowTotal)}</span>NIL paid this year</div>
        <div className="tile2"><span className="big">{players.filter((p) => p.depth === "Starter").length}</span>Starters</div>
        <div className="tile2"><span className="big">{players.filter((p) => p.allAmerican).length}</span>All-Americans</div>
      </div>

      <div className="filters">
        <div className="seg"><div>
          {(["All", "FBS", "FCS"] as const).map((x) => <button key={x} type="button" aria-pressed={div === x} onClick={() => setDiv(x)}>{x}</button>)}
        </div></div>
        <div className="seg"><div>
          {(["All", ...POSITIONS] as const).map((x) => <button key={x} type="button" aria-pressed={pos === x} onClick={() => setPos(x)}>{x === "All" ? "All positions" : POS_SHORT[x]}</button>)}
        </div></div>
        <select aria-label="Conference" className="search" id="conf-filter" value={conference} onChange={(e) => setConf(e.target.value)}>
          <option value="">All conferences</option>
          {confs.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <nav className="boardtabs" aria-label="Lists">
        {BOARDS.map((b) => <button key={b} type="button" aria-pressed={board === b} onClick={() => setBoard(b)}>{b}</button>)}
      </nav>

      {board === "By school"
        ? <BySchool schools={inDiv.filter((s) => !conference || s.conference === conference)} players={players} pos={pos} />
        : board === "By conference"
        ? <ByConference confs={conference ? [conference] : confs} players={players} pos={pos} school={school} />
        : <Leaderboard players={players.filter(inBoard[board]).sort((a, b) => nilNow(b) - nilNow(a) || depthOrder(a, b))} school={school} key={board} />}
    </section>
  );
}

function Leaderboard({ players: rows, school }: { players: Player[]; school: (id: string) => School | undefined }) {
  const { sort, by, apply } = useSort<"name" | "pos" | "school" | "nil" | "total", Player>({ key: "nil", desc: true }, {
    name: (p) => p.name.toLowerCase(),
    pos: (p) => POS_SHORT[p.pos],
    school: (p) => school(p.school)?.name ?? "",
    nil: nilNow,
    total: nilTotal,
  });
  const players = apply(rows);
  return (
    <div className="card tablewrap">
      <table>
        <thead><tr><th className="num">#</th><SortTh k="name" label="Player" sort={sort} by={by} /><SortTh k="pos" label="Pos" sort={sort} by={by} /><SortTh k="school" label="School" sort={sort} by={by} /><th>Role / Year</th><SortTh k="nil" label="NIL now" num sort={sort} by={by} /><SortTh k="total" label="Total" num sort={sort} by={by} /></tr></thead>
        <tbody>
          {players.map((p, i) => {
            const s = school(p.school);
            return (
              <tr key={p.id}>
                <td className="num muted">{i + 1}</td>
                <td><Link href={`/players/${p.id}`}><b>{p.name || "New player"}</b></Link>
                  <div className="dots" style={{ marginTop: 4 }}>
                    {p.client && <span className="chip mine">My athlete</span>}
                    {p.allAmerican && <span className="chip">All-American</span>}
                    {p.allConference && <span className="chip">All-Conf</span>}
                    {p.transfer && <span className="chip move">🔁 {p.transfer}</span>}
                  </div></td>
                <td>{POS_SHORT[p.pos]}</td>
                <td>{s?.name}<br /><small className="muted">{s?.division} · {s?.conference}</small></td>
                <td>{p.depth ?? "—"}{p.year && <><br /><small className="muted">{p.year}</small></>}</td>
                <td className="num"><b>{money(nilNow(p))}</b></td>
                <td className="num">{money(nilTotal(p))}</td>
              </tr>
            );
          })}
          {!players.length && <tr><td colSpan={7} className="muted">Nobody here yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/** Every conference's specialists side by side, by position. */
function ByConference({ confs, players, pos, school }: { confs: string[]; players: Player[]; pos: Pos | "All"; school: (id: string) => School | undefined }) {
  const shown = pos === "All" ? positionsFor(players) : [pos];
  const groups = confs.map((c) => ({ c, ps: players.filter((p) => school(p.school)?.conference === c) })).filter((g) => g.ps.length);
  if (!groups.length) return <p className="muted">Nobody here yet.</p>;
  return (
    <div className="schoollist">
      {groups.map(({ c, ps }) => (
        <div key={c} className="card sec">
          <div className="coachhead">
            <h2>{c}</h2>
            <span className="chip">{ps.length} {ps.length === 1 ? "player" : "players"} · {money(ps.reduce((a, p) => a + nilNow(p), 0))}</span>
          </div>
          <div className="depthgrid">
            {shown.map((x) => (
              <div key={x} className="pcol">
                <div className="phead">{POS_LABEL[x]}</div>
                {ps.filter((p) => p.pos === x).sort(depthOrder).map((p) => (
                  <Link key={p.id} href={`/players/${p.id}`} className="pcard">
                    <b>{p.name || "New player"}</b>
                    <small>{school(p.school)?.name}</small>
                    <small>{[yearShort(p.year), p.depth ?? "Unranked"].filter(Boolean).join(" · ")} · {money(nilNow(p))}{overall(p) != null && ` · ${overall(p)}`}</small>
                    {(p.allAmerican || p.allConference || p.client || p.transfer) && <small>{[p.client && "My athlete", p.allAmerican && "All-American", p.allConference && "All-Conf", p.transfer && `🔁 ${p.transfer}`].filter(Boolean).join(" · ")}</small>}
                  </Link>
                ))}
                {!ps.some((p) => p.pos === x) && <small className="muted">None yet</small>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BySchool({ schools, players, pos }: { schools: School[]; players: Player[]; pos: Pos | "All" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const at = (id: string) => players.filter((p) => p.school === id);
  const list = schools
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()))
    .map((s) => ({ s, ps: at(s.id) }))
    .sort((a, b) => b.ps.length - a.ps.length || a.s.name.localeCompare(b.s.name));

  return (
    <div className="sec">
      <div className="filters">
        <input className="search" aria-label="Find a school" placeholder="Find a school" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="schoollist">
        {list.map(({ s, ps }) => (
          <div key={s.id} className="card school">
            <button type="button" className="schoolhead" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span className="grow"><b>{s.name}</b><small>{s.division} · {s.conference} · {s.state}</small></span>
              {ps.length > 0 && <span className="chip">{ps.length} {ps.length === 1 ? "player" : "players"} · {money(ps.reduce((a, p) => a + nilNow(p), 0))}</span>}
              <span aria-hidden>{open === s.id ? "▴" : "▾"}</span>
            </button>
            {open === s.id && <SchoolDepth s={s} ps={ps} pos={pos} />}
          </div>
        ))}
      </div>
      <AddSchool />
    </div>
  );
}

/** For schools that move up to FCS/FBS or aren't on the list yet. */
function AddSchool() {
  const { canEdit, edit, schools } = useScouting();
  const [name, setName] = useState("");
  const [division, setDivision] = useState<Division | null>("FCS");
  const [conference, setConference] = useState("");
  const [st, setSt] = useState("");
  if (!canEdit) return null;
  const add = () => {
    if (!name.trim() || !division) return;
    const sch = customSchool(name.trim(), division, conference.trim() || "Other", st.trim().toUpperCase());
    if (schools.some((x) => x.id === sch.id)) return;
    edit((s) => { s.extraSchools.push(sch); });
    setName(""); setConference(""); setSt("");
  };
  return (
    <details className="card">
      <summary className="linkbtn">School missing? Add it</summary>
      <div className="sec" style={{ marginTop: 12 }}>
        <div className="formgrid">
          <Text label="School" value={name} onChange={setName} />
          <Text label="Conference" value={conference} onChange={setConference} />
          <Text label="State (2 letters)" value={st} onChange={setSt} placeholder="TX" />
        </div>
        <Choice label="Division" options={["FBS", "FCS"] as const} value={division} onChange={setDivision} />
        <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={add} disabled={!name.trim()}>Add school</button>
      </div>
    </details>
  );
}

function SchoolDepth({ s, ps, pos }: { s: School; ps: Player[]; pos: Pos | "All" }) {
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
