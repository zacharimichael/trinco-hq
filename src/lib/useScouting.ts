"use client";

import { useStore } from "./store";
import { allSchools, blankStaff, newPlayer, schoolById, type Player, type Pos, type SchoolStaff, type Scouting } from "./players";

/** Scouting data plus the edits the player and depth chart screens need. */
export function useScouting() {
  const { state, update, mode } = useStore();
  const sc = state.scouting;
  // Scouting is agency-wide and saved by the owner. Agents see it read-only.
  const canEdit = mode === "demo" || state.me?.role === "owner";
  const edit = (fn: (s: Scouting) => void) => update((d) => fn(d.scouting));

  return {
    sc,
    canEdit,
    schools: allSchools(sc),
    school: schoolById(sc),
    staffOf: (schoolId: string): SchoolStaff => sc.staff[schoolId] ?? blankStaff(),
    setStaff: (schoolId: string, staff: SchoolStaff) => edit((s) => { s.staff[schoolId] = staff; }),
    setPlayer: (id: string, patch: Partial<Player>) => edit((s) => {
      const p = s.players.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    }),
    addPlayer: (pos: Pos, school = "") => {
      const p = newPlayer(pos, school);
      edit((s) => { s.players.push(p); });
      return p.id;
    },
    removePlayer: (id: string) => edit((s) => { s.players = s.players.filter((x) => x.id !== id); }),
    edit,
  };
}
