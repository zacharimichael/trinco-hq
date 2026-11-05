"use client";

import Link from "next/link";
import { CoachList } from "@/components/CoachList";
import { WHO_LABEL } from "@/lib/intake";
import { fmt } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { useScouting } from "@/lib/useScouting";

/** Coaching: the coaches you work with, and your latest calls with school staffs. */
export default function CoachingPage() {
  const { state } = useStore();
  const { school } = useScouting();
  const calls = [...(state.schoolCalls ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <section className="view">
      <div>
        <h1>Coaching</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>The coaches you work with. Find any school&apos;s staff on the <Link href="/schools">School map</Link>.</p>
      </div>

      <CoachList />

      <div className="card sec" id="coach-calls">
        <h2>Latest coach calls</h2>
        {!calls.length && <p className="muted" style={{ margin: 0 }}>No calls yet. Open a school on the <Link href="/schools">School map</Link> to log one.</p>}
        {calls.map((c) => {
          const s = school(c.school);
          return (
            <div className="step" key={c.id}>
              <span className="mark list">{c.who === "Other" ? "•" : c.who}</span>
              <div className="grow">
                <div className="t">{s ? <Link href={`/schools?s=${s.state}&school=${s.id}`}>{s.name}</Link> : "A school"}</div>
                <div className="d" style={{ whiteSpace: "pre-wrap" }}>{c.note}</div>
                <div className="d">{[WHO_LABEL[c.who], c.name].filter(Boolean).join(", ")} · {fmt(c.date)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
