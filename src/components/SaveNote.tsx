"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/**
 * After a change, says plainly whether it reached the database: "Saving…", then "✓ Saved", or "Not saved" with the reason and Try again.
 * Waits to see the save start before it says saved, so it never claims a save that didn't happen.
 */
export function useSaveNote() {
  const { save, retrySave, mode } = useStore();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "waiting" | "saving" | "done" | "error">("idle");
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    if (save.status === "saving") setPhase("saving");
    else if (phase === "saving" && save.status === "saved") setPhase("done");
    else if (save.status === "error") setPhase("error");
  }, [save.status, phase]);
  // Nothing to save to outside the live site, so don't wait forever there.
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setTimeout(() => setPhase(mode === "live" ? (save.status === "error" ? "error" : "done") : "done"), 3000);
    return () => clearTimeout(t);
  }, [phase, mode, save.status]);
  const view = phase === "idle" ? null
    : phase === "error" ? <p role="alert" style={{ margin: 0, color: "var(--stop)" }}><b>Not saved.</b> {save.message} <button type="button" className="linkbtn" onClick={retrySave}>Try again</button></p>
    : phase === "done" ? <p role="status" style={{ margin: 0 }}>✓ {text} Saved.</p>
    : <p role="status" className="muted" style={{ margin: 0 }}>Saving…</p>;
  return { start: (t: string) => { setText(t); setPhase("waiting"); }, clear: () => setPhase("idle"), view };
}

