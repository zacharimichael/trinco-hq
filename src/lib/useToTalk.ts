"use client";

import type { CallItem } from "./model";
import { newId, type Player } from "./players";
import { useStore } from "./store";

/** The "Players to talk to" list: players z hasn't spoken to yet. Lives in the call list (state.calls, first: true). */
export function useToTalk() {
  const { state, update } = useStore();
  const items = (state.calls ?? []).filter((c) => c.first && c.player);
  const open = items.filter((c) => !c.done);
  const done = items.filter((c) => c.done).sort((a, b) => (b.doneOn ?? "").localeCompare(a.doneOn ?? ""));
  const onList = (id: string) => open.some((c) => c.player === id);
  const set = (id: string, patch: Partial<CallItem>) => update((d) => { const c = d.calls?.find((x) => x.id === id); if (c) Object.assign(c, patch); });
  return {
    open, done, onList,
    /** Puts players on the list (skips anyone already on it). */
    add: (ps: Pick<Player, "id" | "name">[]) => update((d) => {
      const calls = (d.calls ??= []);
      const now = new Date().toISOString();
      for (const p of ps) {
        if (calls.some((c) => c.first && !c.done && c.player === p.id)) continue;
        calls.push({ id: newId("c"), name: p.name, phone: "", why: "First call", due: null, player: p.id, done: false, first: true, added: now });
      }
    }),
    remove: (playerId: string) => update((d) => { d.calls = (d.calls ?? []).filter((c) => !(c.first && !c.done && c.player === playerId)); }),
    talked: (id: string) => set(id, { done: true, doneOn: new Date().toISOString() }),
    undo: (id: string) => set(id, { done: false, doneOn: undefined }),
    drop: (id: string) => update((d) => { d.calls = (d.calls ?? []).filter((c) => c.id !== id); }),
  };
}
