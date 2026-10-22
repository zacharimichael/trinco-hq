"use client";

import { DAY, approvalId, dueText, startOfToday } from "@/lib/rules";
import type { Todo } from "@/lib/tasks";
import { useStore } from "@/lib/store";
import { useTaskRunner } from "./TaskRunner";

export function TodoRow({ t }: { t: Todo }) {
  const { update } = useStore();
  const run = useTaskRunner();
  const today = startOfToday();
  const soon = !!t.due && (t.due.getTime() - today.getTime()) / DAY <= 3;

  const start = () => {
    if (!t.task) return;
    const task = t.task;
    run(task, (draft) => {
      if (t.athleteId) {
        const a = draft.athletes.find((x) => x.id === t.athleteId)!;
        a.done[task.id] = true;
        if (task.id === "contract") a.signed = new Date().toISOString();
      } else if (task.id === "agency_agreement") {
        if (draft.me) draft.me.stage = 2;
      } else draft.done[task.id] = true;
    });
  };

  return (
    <div className="todo">
      <span className={`dot ${!t.wait && !t.later && soon ? "stop" : "wip"}`} />
      <span className="grow">
        <b>{t.title}</b>
        <small>
          {t.where}
          {t.due && !t.later && <> · <span className={`due ${soon ? "soon" : ""}`}>{dueText(t.due)}</span></>}
          {t.wait && <> · <button className="linkbtn" onClick={() => update((d) => { d.done[approvalId(t.wait!)] = true; d.licensedOn = { ...d.licensedOn, [t.wait!]: new Date().toISOString() }; })}>Demo: approve it</button></>}
        </small>
      </span>
      {t.wait ? <span className="waitchip">● Waiting</span>
        : t.later ? <span className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{dueText(t.due)}</span>
        : <button className="btn" data-todo={t.key} onClick={start}>Start</button>}
    </div>
  );
}
