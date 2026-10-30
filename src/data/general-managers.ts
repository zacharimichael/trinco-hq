import managers from "./general-managers.json";

/**
 * Football general managers for the 2026 season, by school id: 43 FBS schools.
 * Read from each school's own football staff page on Oct 30, 2026, keeping only pages that showed the 2026 staff.
 * Many schools have no GM; assistant GMs are left out.
 */
export const GENERAL_MANAGERS: Record<string, { name: string; url: string }> = managers;
