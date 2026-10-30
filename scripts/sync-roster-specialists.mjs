// Builds src/data/roster-specialists.ts: every long snapper and punter on a 2026 FBS or FCS roster.
// Source: the 2026 roster file cfbfastR-data publishes from CollegeFootballData (ESPN player ids).
// Run: node scripts/sync-roster-specialists.mjs [path-to-cfb_rosters_2026.csv]
// Without a path it downloads the file. Only real roster rows go in; nothing is made up.
import { readFileSync, writeFileSync } from "node:fs";

const SEASON = 2026;
const CSV_URL = `https://raw.githubusercontent.com/sportsdataverse/cfbfastR-data/main/rosters/csv/cfb_rosters_${SEASON}.csv`;
const SOURCE_PAGE = "https://github.com/sportsdataverse/cfbfastR-data/tree/main/rosters";

// The roster file's team names that differ from ours.
const ALIAS = {
  "App State": "Appalachian State", "Florida International": "FIU", Grambling: "Grambling State", "Hawai'i": "Hawaii",
  "Long Island University": "LIU", Massachusetts: "UMass", Pennsylvania: "Penn", "San José State": "San Jose State",
  "SE Louisiana": "Southeastern Louisiana", "Southeast Missouri State": "Southeast Missouri", "St. Thomas (MN)": "St. Thomas",
  UAlbany: "Albany", "UL Monroe": "Louisiana-Monroe", "UT Rio Grande Valley": "UTRGV",
};

// Long snappers checked by hand on the school's own 2026 roster page (Oct 30, 2026): class and past schools the file doesn't have.
// Missing from the file but on the school's 2026 roster: added with that page as the source.
const CHECKED = {
  Alabama: ["https://rolltide.com/sports/football/roster", { "Jay Williams": ["Jr"], "Eli Deutsch": ["Fr"], "Alex Rozier": ["5th"], "Ethan Stangle": ["5th", "Syracuse"] }],
  Arkansas: ["https://arkansasrazorbacks.com/sport/m-footbl/roster/", { "Adam Johnston": ["Sr", "Sacramento State"], "Max Schmidly": ["Sr"] }],
  Auburn: ["https://auburntigers.com/sports/football/roster", { "Travis Wakefield": ["Fr"], "Hudson Powell": ["5th", "Miami (OH)"], "Benton Cantey": ["So"] }],
  Florida: ["https://floridagators.com/sports/football/roster", { "Carter Milliron": ["5th", "Louisiana"], "Lincoln Anderson": ["Fr"], "Hunter Solwold": ["So", "Washington"] }],
  Georgia: ["https://georgiadogs.com/sports/football/roster", { "Will Snellings": ["R-Jr"] }],
  Illinois: ["https://fightingillini.com/sports/football/roster", { "Patrick Mahoney III": ["Sr"], "Zach Haber": ["Sr", "Arkansas"] }],
  Iowa: ["https://hawkeyesports.com/sports/football/roster/", { "Matty McLaughlin": ["Fr"], "Ike Speltz": ["Jr"] }],
  Kentucky: ["https://ukathletics.com/sports/football/roster", { "Cole Marszalek": ["Sr", "Jacksonville State"], "Spencer Radnoti": ["Jr", "Georgia State"], "Jack Wheeler": ["Fr"] }],
  LSU: ["https://lsusports.net/sports/football/roster", { "Mack Mulhern": ["R-Fr"], "Silas Hall": ["So"] }],
  Minnesota: ["https://gophersports.com/sports/football/roster", { "Jakob Lutz": ["R-Fr"], "Alan Soukup": ["Jr"] }],
  Missouri: ["https://mutigers.com/sports/football/roster", { "Sean Gross": ["So"], "Henry Crosby": ["So"], "Brett Le Blanc": ["Sr"] }],
  Nebraska: ["https://huskers.com/sports/football/roster", { "Kyson Gana": ["Fr"], "Jack Wills": ["So", "Michigan State"] }],
  "Norfolk State": ["https://nsuspartans.com/sports/football/roster", { "Benjamin Heffron": ["Sr", null, 72, 230], "Toby Willis": ["5th", null, 75, 230] }],
  Northwestern: ["https://nusports.com/sports/football/roster", { "Jack Florentine": ["R-So"], "Evan Boutorwick": ["R-So"] }],
  "Penn State": ["https://gopsusports.com/sports/football/roster", { "Blaise Sokach-Minnick": ["R-Sr"], "Andrew Dufault": ["R-So"] }],
  "South Carolina": ["https://gamecocksonline.com/sports/football/roster/", { "Gunnar Yocum": ["Jr"], "Emmet Rhoades": ["Sr", "Western Carolina"], "Kyler Farrow": ["So"], "Matthew Oh": ["Fr"] }],
  "Texas A&M": ["https://12thman.com/sports/football/roster", { "Shea Freibaum": ["Sr", "Oklahoma State"], "Gray Evans": ["So"], "Boomer Graham": ["Jr"] }],
  Vanderbilt: ["https://vucommodores.com/sports/football/roster/", { "Kaden Schickel": ["5th", "James Madison;Michigan State"], "Stone Owens": ["So"] }],
  "West Florida": ["https://goargos.com/sports/football/roster", { "George Shannon": ["R-Jr", null, 72, 210], "Jonah Mitchell": ["5th", null, 72, 235] }],
};

const CLASS = {
  Fr: "Freshman", So: "Sophomore", Jr: "Junior", Sr: "Senior", "R-Fr": "Redshirt Freshman", "R-So": "Redshirt Sophomore",
  "R-Jr": "Redshirt Junior", "R-Sr": "Redshirt Senior", "5th": "Redshirt Senior",
};
const YEAR = { 1: "Freshman", 2: "Sophomore", 3: "Junior", 4: "Senior", 5: "Redshirt Senior" };

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Our FBS and FCS school names and ids, read straight from schools.ts.
const src = readFileSync(new URL("../src/data/schools.ts", import.meta.url), "utf8");
const table = (name) => src.slice(src.indexOf(`const ${name}:`), src.indexOf("};", src.indexOf(`const ${name}:`)));
const ours = {};
for (const div of ["FBS", "FCS"]) for (const [, n] of table(div).matchAll(/\["([^"]+)", "[A-Z]{2}"\]/g)) ours[n] = slug(`${div}-${n}`);

const text = process.argv[2] ? readFileSync(process.argv[2], "utf8") : await (await fetch(CSV_URL)).text();
// Our position code for each roster file position. The file's id prefix stays as the long snappers' were.
const POS = { LS: "LS", P: "P" };
const rows = parseCsv(text).filter((r) => POS[r.position] && r.season === String(SEASON));

const out = [];
const seen = new Set();
const missingTeams = new Set();
const push = (pos, school, name, year, height, weight, espn, prior, from) => {
  const id = `${pos.toLowerCase()}-${school}-${slug(name)}`;
  if (seen.has(id)) return;
  seen.add(id);
  out.push({ id, pos, school, name, year, height, weight, espn, prior, from });
};

for (const r of rows) {
  const team = ALIAS[r.team] ?? r.team;
  const school = ours[team];
  if (!school) { missingTeams.add(r.team); continue; }
  const name = `${r.first_name} ${r.last_name}`.trim();
  const pos = POS[r.position];
  const check = pos === "LS" ? CHECKED[team]?.[1][name] : undefined;
  const [cls, prior] = check ?? [];
  push(pos, school, name, cls ? CLASS[cls] : YEAR[r.year] ?? null, Number(r.height) || null, Number(r.weight) || null,
    r.athlete_id || null, prior ? prior.split(";") : [], check ? CHECKED[team][0] : null);
}
for (const [team, [url, players]] of Object.entries(CHECKED)) {
  for (const [name, [cls, prior, height, weight]] of Object.entries(players)) {
    if (height === undefined) continue; // Only players the file is missing carry their own height and weight.
    push("LS", ours[team], name, CLASS[cls], height, weight, null, prior ? prior.split(";") : [], url);
  }
}

out.sort((a, b) => a.pos.localeCompare(b.pos) || a.school.localeCompare(b.school) || a.name.localeCompare(b.name));
const count = (pos) => { const ps = out.filter((p) => p.pos === pos); return [ps.length, new Set(ps.map((p) => p.school)).size]; };
const [ls, lsSchools] = count("LS"), [p, pSchools] = count("P");
const ts = `// Generated by scripts/sync-roster-specialists.mjs. Do not edit by hand; run the script again instead.
/**
 * Every long snapper and punter on a ${SEASON} FBS or FCS roster: ${ls} long snappers at ${lsSchools} schools
 * and ${p} punters at ${pSchools} schools. From the ${SEASON} roster file that cfbfastR-data publishes from
 * CollegeFootballData (ESPN player ids), updated Aug 30, ${SEASON}. Players marked with a school roster page
 * were checked there on Oct 30, ${SEASON}.
 */
import type { SchoolYear } from "@/lib/players";

export const ROSTER_SOURCE = { label: "${SEASON} roster file (CollegeFootballData via cfbfastR)", url: "${SOURCE_PAGE}", date: "${SEASON}-08-30" };
export const ROSTER_CHECKED_DATE = "${SEASON}-10-30";

export interface RosterPlayer {
  id: string; pos: "LS" | "P"; school: string; name: string; year: SchoolYear | null; height: number | null; weight: number | null;
  /** ESPN player id. */
  espn: string | null;
  priorSchools: string[];
  /** The school roster page this player was checked on, if any. */
  checked: string | null;
}

export const ROSTER_PLAYERS: RosterPlayer[] = [
${out.map((p) => `  ${JSON.stringify({ id: p.id, pos: p.pos, school: p.school, name: p.name, year: p.year, height: p.height, weight: p.weight, espn: p.espn, priorSchools: p.prior, checked: p.from })},`).join("\n")}
];
`;
writeFileSync(new URL("../src/data/roster-specialists.ts", import.meta.url), ts);
console.log(`${ls} long snappers at ${lsSchools} and ${p} punters at ${pSchools} of ${Object.keys(ours).length} FBS/FCS schools.`);
if (missingTeams.size) console.log("Not on our FBS/FCS list (skipped):", [...missingTeams].join(", "));
for (const pos of ["LS", "P"]) console.log(`FBS/FCS schools with no ${pos} found:`, Object.entries(ours).filter(([, id]) => !out.some((x) => x.pos === pos && x.school === id)).map(([n]) => n).join(", "));
