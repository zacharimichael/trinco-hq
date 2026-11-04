/**
 * Junior college (JUCO) long snappers. Nobody publishes a JUCO long snapper ranking and JUCO roster sites block reading,
 * so these are the snappers Kohl's Kicking lists as committed to a junior college in its 2025 and 2026 national
 * long snapper ratings (read Nov 4, 2026). They may have moved on since; check before relying on it.
 */
export interface JucoLongSnapper { id: string; name: string; school: string; hsState: string; hsClass: number; kohlsRank: number | null; url: string }

const k = (cls: number) => `https://www.kohlskicking.com/national-player-ratings/long-snappers/${cls}`;
export const JUCO_LONG_SNAPPERS: JucoLongSnapper[] = [
  { id: "juco-ls-dimitri-towkaniuk", name: "Dimitri Towkaniuk", school: "Modesto Junior College (CA)", hsState: "CA", hsClass: 2026, kohlsRank: 20, url: k(2026) },
  { id: "juco-ls-thad-nettles", name: "Thad Nettles", school: "Iowa Western CC (IA)", hsState: "IA", hsClass: 2026, kohlsRank: 21, url: k(2026) },
  { id: "juco-ls-aidan-shamburger", name: "Aidan Shamburger", school: "East Mississippi CC (MS)", hsState: "MS", hsClass: 2026, kohlsRank: 49, url: k(2026) },
  { id: "juco-ls-avery-williams", name: "Avery Williams", school: "Butler CC (KS)", hsState: "KS", hsClass: 2026, kohlsRank: null, url: k(2026) },
  { id: "juco-ls-parker-sleiter", name: "Parker Sleiter", school: "Iowa Western CC (IA)", hsState: "IA", hsClass: 2025, kohlsRank: 24, url: k(2025) },
  { id: "juco-ls-logan-menken", name: "Logan Menken", school: "Iowa Western CC (IA)", hsState: "IA", hsClass: 2025, kohlsRank: 51, url: k(2025) },
  { id: "juco-ls-austin-cornett", name: "Austin Cornett", school: "Hutchinson CC (KS)", hsState: "KS", hsClass: 2025, kohlsRank: 56, url: k(2025) },
];
export const JUCO_IDS = new Set(JUCO_LONG_SNAPPERS.map((p) => p.id));
