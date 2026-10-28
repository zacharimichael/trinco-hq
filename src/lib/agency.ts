import type { AppState, Deal } from "./model";

/** What the agency and its agents make on each deal, using each agent's split. Deals the owner closes stay 100% with the agency. */
export function dealMoney(s: AppState) {
  const split = (agent: string) => (agent === "You" ? 0 : s.team.find((t) => t.name === agent)?.split ?? s.agency.split);
  const cut = (d: Deal) => (d.amount * d.fee) / 100;
  const house = (d: Deal) => (cut(d) * (100 - split(d.agent))) / 100;
  const paid = s.deals.filter((d) => d.status === "Paid");
  return {
    cut,
    house,
    earned: paid.reduce((n, d) => n + house(d), 0),
    toAgents: paid.reduce((n, d) => n + cut(d) - house(d), 0),
    coming: s.deals.filter((d) => d.status !== "Paid").reduce((n, d) => n + house(d), 0),
  };
}
