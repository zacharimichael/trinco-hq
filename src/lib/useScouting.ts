"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { allSchools, missingHsPlayers, missingRosterPlayers, newPlayer, schoolById, shownPos, staffFor, type Player, type Pos, type SchoolStaff, type Scouting } from "./players";

/** Scouting data plus the edits the player and depth chart screens need. */
export function useScouting() {
  const { state, update, mode } = useStore();
  // Screens only see players at the shown positions (kickers and punters are hidden for now). Edits still go to the full saved data,
  // so hidden players are kept as they are.
  const all = state.scouting;
  const sc = useMemo(() => ({ ...all, players: all.players.filter(shownPos) }), [all]);
  // Scouting is agency-wide and saved by the owner and anyone they shared full access with. Agents see it read-only.
  const canEdit = mode === "demo" || state.me?.role === "owner" || state.me?.role === "editor";
  const edit = (fn: (s: Scouting) => void) => update((d) => fn(d.scouting));

  return {
    sc,
    canEdit,
    schools: allSchools(sc),
    school: schoolById(sc),
    staffOf: (schoolId: string): SchoolStaff => staffFor(sc.staff, schoolId),
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
    /** Adds every real player at the shown positions from the 2026 rosters that isn't on the depth charts yet. */
    addRosterPlayers: () => edit((s) => { s.players.push(...missingRosterPlayers(s)); }),
    /** Adds high school long snappers (classes of 2027 and 2028) from the Kohl's and Rubio lists that aren't saved yet. */
    addHsPlayers: () => edit((s) => { s.players.push(...missingHsPlayers(s)); }),
    removePlayer: (id: string) => edit((s) => { s.players = s.players.filter((x) => x.id !== id); }),
    edit,
  };
}
