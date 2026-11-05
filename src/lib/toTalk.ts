import type { AppState } from "./model";
import type { Player, Talk } from "./players";

/** Calls with the player or their family count as having talked to them. Coach calls about them don't. */
export const SPOKE_WHO: Talk["who"][] = ["Player", "Parent"];
/** True once a call with the player or a parent is in their call log. */
export const talkedTo = (p: Pick<Player, "talks">) => p.talks.some((t) => SPOKE_WHO.includes(t.who));
/** When the player or a parent was last talked to (ISO), or null. */
export const lastTalk = (p: Pick<Player, "talks">) => p.talks.filter((t) => SPOKE_WHO.includes(t.who)).map((t) => t.date).sort().pop() ?? null;

/** Ticks a player off the "Players to talk to" list. Called when a call with them is logged. */
export function checkOff(d: AppState, playerId: string, when = new Date().toISOString()) {
  for (const c of d.calls ?? []) if (c.first && !c.done && c.player === playerId) Object.assign(c, { done: true, doneOn: when });
}
