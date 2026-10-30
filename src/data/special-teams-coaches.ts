import coaches from "./special-teams-coaches.json";

/**
 * Special teams coordinators for the 2026 season, by school id: 102 FBS and FCS schools.
 * Read from each school's own football staff page on Oct 30, 2026. Only pages that showed the 2026 staff
 * were used; schools whose page still showed 2025, hid names or wouldn't load are left out (the app offers a search instead).
 */
export const ST_COACHES: Record<string, { name: string; url: string }> = coaches;
