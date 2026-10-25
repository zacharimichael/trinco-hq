/**
 * FBS and FCS football schools for the 2026 season: [name, state].
 * Realignment moves every year, so the app also lets you add a school and the
 * list is easy to edit here.
 */
type Row = [string, string];

const FBS: Record<string, Row[]> = {
  SEC: [
    ["Alabama", "AL"], ["Arkansas", "AR"], ["Auburn", "AL"], ["Florida", "FL"],
    ["Georgia", "GA"], ["Kentucky", "KY"], ["LSU", "LA"], ["Mississippi State", "MS"],
    ["Missouri", "MO"], ["Oklahoma", "OK"], ["Ole Miss", "MS"], ["South Carolina", "SC"],
    ["Tennessee", "TN"], ["Texas", "TX"], ["Texas A&M", "TX"], ["Vanderbilt", "TN"],
  ],
  "Big Ten": [
    ["Illinois", "IL"], ["Indiana", "IN"], ["Iowa", "IA"], ["Maryland", "MD"], ["Michigan", "MI"],
    ["Michigan State", "MI"], ["Minnesota", "MN"], ["Nebraska", "NE"], ["Northwestern", "IL"],
    ["Ohio State", "OH"], ["Oregon", "OR"], ["Penn State", "PA"], ["Purdue", "IN"], ["Rutgers", "NJ"],
    ["UCLA", "CA"], ["USC", "CA"], ["Washington", "WA"], ["Wisconsin", "WI"],
  ],
  ACC: [
    ["Boston College", "MA"], ["California", "CA"], ["Clemson", "SC"], ["Duke", "NC"],
    ["Florida State", "FL"], ["Georgia Tech", "GA"], ["Louisville", "KY"], ["Miami", "FL"],
    ["NC State", "NC"], ["North Carolina", "NC"], ["Pittsburgh", "PA"], ["SMU", "TX"],
    ["Stanford", "CA"], ["Syracuse", "NY"], ["Virginia", "VA"], ["Virginia Tech", "VA"], ["Wake Forest", "NC"],
  ],
  "Big 12": [
    ["Arizona", "AZ"], ["Arizona State", "AZ"], ["Baylor", "TX"], ["BYU", "UT"], ["Cincinnati", "OH"],
    ["Colorado", "CO"], ["Houston", "TX"], ["Iowa State", "IA"], ["Kansas", "KS"], ["Kansas State", "KS"],
    ["Oklahoma State", "OK"], ["TCU", "TX"], ["Texas Tech", "TX"], ["UCF", "FL"], ["Utah", "UT"], ["West Virginia", "WV"],
  ],
  "Pac-12": [
    ["Boise State", "ID"], ["Colorado State", "CO"], ["Fresno State", "CA"], ["Oregon State", "OR"],
    ["San Diego State", "CA"], ["Texas State", "TX"], ["Utah State", "UT"], ["Washington State", "WA"],
  ],
  "Mountain West": [
    ["Air Force", "CO"], ["Hawaii", "HI"], ["Nevada", "NV"], ["New Mexico", "NM"], ["San Jose State", "CA"],
    ["UNLV", "NV"], ["Wyoming", "WY"], ["Northern Illinois", "IL"], ["UTEP", "TX"],
  ],
  American: [
    ["Army", "NY"], ["Charlotte", "NC"], ["East Carolina", "NC"], ["Florida Atlantic", "FL"], ["Memphis", "TN"],
    ["Navy", "MD"], ["North Texas", "TX"], ["Rice", "TX"], ["South Florida", "FL"], ["Temple", "PA"],
    ["Tulane", "LA"], ["Tulsa", "OK"], ["UAB", "AL"], ["UTSA", "TX"],
  ],
  "Sun Belt": [
    ["Appalachian State", "NC"], ["Arkansas State", "AR"], ["Coastal Carolina", "SC"], ["Georgia Southern", "GA"],
    ["Georgia State", "GA"], ["James Madison", "VA"], ["Louisiana", "LA"], ["Louisiana Tech", "LA"],
    ["Louisiana-Monroe", "LA"], ["Marshall", "WV"], ["Old Dominion", "VA"], ["South Alabama", "AL"],
    ["Southern Miss", "MS"], ["Troy", "AL"],
  ],
  "Conference USA": [
    ["Delaware", "DE"], ["FIU", "FL"], ["Jacksonville State", "AL"], ["Kennesaw State", "GA"], ["Liberty", "VA"],
    ["Middle Tennessee", "TN"], ["Missouri State", "MO"], ["New Mexico State", "NM"], ["Sam Houston", "TX"], ["Western Kentucky", "KY"],
  ],
  MAC: [
    ["Akron", "OH"], ["Ball State", "IN"], ["Bowling Green", "OH"], ["Buffalo", "NY"], ["Central Michigan", "MI"],
    ["Eastern Michigan", "MI"], ["Kent State", "OH"], ["Miami (OH)", "OH"], ["Ohio", "OH"], ["Toledo", "OH"],
    ["Western Michigan", "MI"], ["UMass", "MA"], ["Sacramento State", "CA"],
  ],
  "FBS Independent": [["Notre Dame", "IN"], ["UConn", "CT"]],
};

const FCS: Record<string, Row[]> = {
  "Big Sky": [
    ["Cal Poly", "CA"], ["Eastern Washington", "WA"], ["Idaho", "ID"], ["Idaho State", "ID"], ["Montana", "MT"],
    ["Montana State", "MT"], ["Northern Arizona", "AZ"], ["Northern Colorado", "CO"], ["Portland State", "OR"],
    ["UC Davis", "CA"], ["Weber State", "UT"],
  ],
  CAA: [
    ["Albany", "NY"], ["Bryant", "RI"], ["Campbell", "NC"], ["Elon", "NC"], ["Hampton", "VA"], ["Maine", "ME"],
    ["Monmouth", "NJ"], ["New Hampshire", "NH"], ["North Carolina A&T", "NC"], ["Rhode Island", "RI"],
    ["Stony Brook", "NY"], ["Towson", "MD"], ["Villanova", "PA"], ["William & Mary", "VA"],
  ],
  "Missouri Valley": [
    ["Illinois State", "IL"], ["Indiana State", "IN"], ["Murray State", "KY"], ["North Dakota", "ND"],
    ["North Dakota State", "ND"], ["Northern Iowa", "IA"], ["South Dakota", "SD"], ["South Dakota State", "SD"],
    ["Southern Illinois", "IL"], ["Youngstown State", "OH"],
  ],
  "Big South-OVC": [
    ["Charleston Southern", "SC"], ["Eastern Illinois", "IL"], ["Gardner-Webb", "NC"], ["Lindenwood", "MO"],
    ["Southeast Missouri", "MO"], ["Tennessee State", "TN"], ["Tennessee Tech", "TN"], ["UT Martin", "TN"], ["Western Illinois", "IL"],
  ],
  SoCon: [
    ["Chattanooga", "TN"], ["East Tennessee State", "TN"], ["Furman", "SC"], ["Mercer", "GA"], ["Samford", "AL"],
    ["The Citadel", "SC"], ["VMI", "VA"], ["Western Carolina", "NC"], ["Wofford", "SC"],
  ],
  Southland: [
    ["East Texas A&M", "TX"], ["Houston Christian", "TX"], ["Incarnate Word", "TX"], ["Lamar", "TX"], ["McNeese", "LA"],
    ["Nicholls", "LA"], ["Northwestern State", "LA"], ["Southeastern Louisiana", "LA"], ["Stephen F. Austin", "TX"], ["UTRGV", "TX"],
  ],
  UAC: [
    ["Abilene Christian", "TX"], ["Austin Peay", "TN"], ["Central Arkansas", "AR"], ["Eastern Kentucky", "KY"],
    ["North Alabama", "AL"], ["Southern Utah", "UT"], ["Tarleton State", "TX"], ["Utah Tech", "UT"], ["West Georgia", "GA"],
  ],
  Patriot: [
    ["Bucknell", "PA"], ["Colgate", "NY"], ["Fordham", "NY"], ["Georgetown", "DC"], ["Holy Cross", "MA"],
    ["Lafayette", "PA"], ["Lehigh", "PA"],
  ],
  Ivy: [
    ["Brown", "RI"], ["Columbia", "NY"], ["Cornell", "NY"], ["Dartmouth", "NH"], ["Harvard", "MA"],
    ["Penn", "PA"], ["Princeton", "NJ"], ["Yale", "CT"],
  ],
  Pioneer: [
    ["Butler", "IN"], ["Davidson", "NC"], ["Dayton", "OH"], ["Drake", "IA"], ["Marist", "NY"],
    ["Morehead State", "KY"], ["Presbyterian", "SC"], ["San Diego", "CA"], ["St. Thomas", "MN"],
    ["Stetson", "FL"], ["Valparaiso", "IN"],
  ],
  MEAC: [
    ["Delaware State", "DE"], ["Howard", "DC"], ["Morgan State", "MD"], ["Norfolk State", "VA"],
    ["North Carolina Central", "NC"], ["South Carolina State", "SC"],
  ],
  SWAC: [
    ["Alabama A&M", "AL"], ["Alabama State", "AL"], ["Alcorn State", "MS"], ["Arkansas-Pine Bluff", "AR"],
    ["Bethune-Cookman", "FL"], ["Florida A&M", "FL"], ["Grambling State", "LA"], ["Jackson State", "MS"],
    ["Mississippi Valley State", "MS"], ["Prairie View A&M", "TX"], ["Southern", "LA"], ["Texas Southern", "TX"],
  ],
  NEC: [
    ["Central Connecticut", "CT"], ["Duquesne", "PA"], ["LIU", "NY"], ["Mercyhurst", "PA"], ["New Haven", "CT"],
    ["Robert Morris", "PA"], ["Stonehill", "MA"], ["Wagner", "NY"],
  ],
};

export type Division = "FBS" | "FCS";
export interface School { id: string; name: string; division: Division; conference: string; state: string }

export const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const build = (division: Division, table: Record<string, Row[]>): School[] =>
  Object.entries(table).flatMap(([conference, rows]) =>
    rows.map(([name, state]) => ({ id: slug(`${division}-${name}`), name, division, conference, state })));

export const SCHOOLS: School[] = [...build("FBS", FBS), ...build("FCS", FCS)];
