// Builds src/data/hs-long-snappers.json: high school long snappers in the classes of 2027 and 2028.
// Run: node scripts/build-hs-long-snappers.mjs
//
// Sources, read on Nov 4, 2026 (the sites block scripts, so the lists below were copied from the pages by hand):
// - Kohl's Kicking national long snapper ratings: https://www.kohlskicking.com/national-player-ratings/long-snappers/2027 and /2028
//   Numbered players are ranked. The groups after them are listed without a number (group 2, 3, 4 in page order).
//   Kohl's shows state and commitments/offers only. No high school, height, weight or star rating is on the list pages.
//   A * after a school means preferred walk-on.
// - Rubio Long Snapping blog, "Top Available 2027 Long Snappers" and "Top 2028 Available Long Snappers" (Jun 12, 2025):
//   https://rubiosblog.com/?p=12252 and https://rubiosblog.com/?p=12254, plus the Players of the Week on rubiolongsnapping.com.
// - Special Teams University (specialteamsu.com) publishes no high school class lists, only college All-Americans.
import { writeFileSync } from "node:fs";

const CHECKED = "2026-11-04";

// "Last, First | ST | commitment or offers | profile slug", one per line. A line starting with "#" starts the next unnumbered group.
const KOHLS = {
  2027: `
Kraft, Sean|NC|Notre Dame|sean-kraft
McKeown, Sam|OK|Tennessee|sam-mc-keown
Logan, Braylon|AZ|Washington|braylon-logan
Underwood, Javis|NE|Wake Forest|javis-underwood
Helms, Holden|TX|Offered: Air Force, West Point|holden-helms
Snoonian, Dante|MA|Yale|dante-snoonian
Autrey, Braden|GA|Vanderbilt*|
Sousa, Salvatore|PA|Offered: Mercyhurst, Robert Morris, Akron|salvatore-sousa
Lemke, Sean|WI|Offered: Colgate, UW-Whitewater|sean-lemke
Nellis, Adrik|WI|Minnesota-Duluth|
Wolfenden, Brody|AZ|Air Force|brody-wolfenden
Swirczynski, Owen|AZ|Montana|owen-swirczynski
Lane, Jaydee|MS|Florida|jaydee-lane
Rossow, Maxx|FL|Eastern Michigan*|maxx-rossow
Powell, Clayton|LA|Penn State|clayton-powell
Flatt, Warren|IL|West Virginia|warren-flatt
Heggie, Paul|IL||paul-heggie
Brett, Caden|GA||
Berwald, Logan|OH||logan-berwald
Klugh, Colin|NJ||colin-klugh
Kosin, Brooks|MI||brooks-kosin
Schapman, Michael|FL|Colgate|michael-schapman
Weadon, Tyler|CO||tyler-weadon
Wilson, Jackson|LA||jackson-wilson-2
Rossman, Owen|AZ|Offered: Arizona|owen-rossman
McDonnell, Jack|TX||jack-mc-donnell
Holland, Grant|TX||grant-holland
Kiesau, Daxon|IA||
Redburn, Hogan|TX||hogan-redburn
Gerrish, Kyle|CA|Offered: Air Force, Arizona|kyle-gerrish
Edwards, Eli|GA||eli-edwards
Calvin, Sam|TX||sam-calvin
Volz, Brady|IN||brady-volz
Mody, Michael|AZ||michael-mody
McCracken, Chip|NC|App State|chip-mccracken
Crye, Patrick|AL||patrick-crye
Fielding, Carter|TX||
Brasel, Jackson|KY|Offered: Bethel, Campbellsville, Culver Stockton|jackson-brasel
Henslee, Tucker|GA||tucker-henslee
Peters, Stanley|FL||stanley-peters
Kirichkow, Aiden|IL|UW-Whitewater|aiden-kirichkow
Coen, Brennan|CO||brennan-coen
Wenthe, Powell|IA|Upper Iowa|powell-wenthe
Gould, Jordan|FL|Offered: Schreiner|jordan-gould
Rinck, Jackson|VA|Offered: 4 schools|jackson-rinck
Miller, Jackson|OK||
Zarnoth, Charlie|WI||charlie-zarnoth
Lala, Landon|TX||landon-lala
Hewett, Zain|GA||zain-hewett
Parker, Caleb|TX||
Hieken, Jack|MO|Washington University*|
Bonfanti, Mason|FL||
Golenor, Drake|TN||
Albin, Brayson|AL|Offered: North Carolina*, Western Kentucky|brayson-albin
Stanley, John|GA|North Carolina|john-stanley
Hampton, Maddox|TN||maddox-hampton
Monak, Timmy|IL||timmy-monak
Barrett, Charlie|TX||charlie-barrett
McKim, Ethan|TX||ethan-mc-kim
Gladden, Gus|TN||gus-gladden
Tunison, Brody|FL||
Keeter, Emmitt|NC||emmitt-keeter
Ward, James|MD||james-ward
Arnold, Nolan|TN||nolan-arnold
Jolley, Tyler|TN||tyler-jolley
Gaine, Connor|NY|Offered: Ohio*, Buffalo*|connor-gaine
Garrard, Conner|AL||
#
Alons, Johnathan|IA|Northern State|
Andrews, Nolan|IL||
Bartek, Gabriel|NE||gabriel-bartek
Belew, Nolan|TN||
Bellos, Patrick|TX||
Boyd, Landon|GA||
Burton, Jonathan|IA||jonathan-burton
Cacciotti, Rocco|PA||rocco-cacciotti
Casteel, Cole|TN||cole-casteel
Clark, Ace|GA||
Clifford, Mason|VA||mason-clifford
Connelly, Jackson|OH||jackson-connelly
Cox, James|AL||
Davis, Wilson|GA||wilson-davis
Ebersole, Jace|PA||
Elizondo, Joseph|TX||joseph-elizondo
Ellis, Jackson|TX||
Erdos, Reid|TX||reid-erdos
Ferrar, Samuel|TX||samuel-ferrar
Floyd, Bobby|GA||
Hopkins, Troy|TX||
Humphries, Elijah|CO||
Jackson, Jeremiah|VA||jeremiah-jackson
Kaplan, Isaac|MI|Duke*|isaac-kaplan
King, Jackson|IL|Offered: UW-Whitewater|
MacIntosh, Ben|MI||
MacNutt, Kaleb|MO||kaleb-mac-nutt
Macy, Clayton|MO||clayton-macy
Madden, Evan|SC||evan-madden
Moseley, William|GA||william-moseley
Motes, Aadon|AL||
O'Brien, Collin|OH||
Pierson, Connor|CO||
Race, Morgan|IL|Offered: 3 schools|
Scott, Sean|TX||sean-scott
Smith, Aaron|IN||aaron-smith-2
Tabor, Luke|TX||
Thompson, Isaiah|IA||isaiah-thompson
Tsai, Tyan|OH||
Waguespack, Jackson|TX||
Warner, Ethen|AR||ethen-warner
Watson, Jack|AL|Offered: 2 schools|
Whitmire, Layton|NM||layton-whitmire
Wigington, Isaac|WY||isaac-wigington
Wood, Rosten|AZ||rosten-wood
Yeager, Josh|FL||josh-yeager
#
Abercrombie, Grant|GA||
Anderson, Turner|AK||
Andrew, Bryce|PA||
Beckman, Pierce|IA|Offered: Northern Iowa*|pierce-beckman
Blankenship, Noah|OH||
Boedeker, Jack|IA||jack-boedeker
Brake, Dawson|OK||
Clausheide, Luke|AL||
Coates, Aaron|PA||
Coble, Jackson|NC||
Collins, Maximus|AZ||
Combs, Owen|NC||owen-combs
Curtis, Aiden|IA||aiden-curtis
Deal, Jackson|AL||jackson-deal
Del Valle, John|FL||john-del-valle
Donegan, Carter|CO||
Durham, Noah|AZ|Offered: Ottawa|
Eichler, Connor|FL||connor-eichler
Fisher, Hayden|PA||
Foss, Gavin|OH||gavin-foss
Frazier, Adam|TN||adam-brooks-frazier
Gaona, Jacinto|TX||
Gates, Lennon|LA||
Haddad, Hudson|GA||hudson-haddad
Helmer, Sean|MD||sean-helmer
Hickey, Levi|KY||
Hoerter, Andrew|KY|Offered: Eastern Kentucky*|
Horner, Samuel|TX||samuel-horner
Hunsucker, Cash|TX||cash-hunsucker
Jennings, Derrick|VA||derrick-jennings
Johnson, Daniel|GA||daniel-johnson
Kass, Tyler|FL||
Kiser, Tate|FL||tate-kiser
Kogler, Cody|TX||
Krohn, Scott|VA||scott-krohn
Lancaster, Milum|NC||milum-lancaster
Lopez, Michael|AZ||michael-lopez
Lovelady, Ridge|AL||
Moeller, Nicholas|TX||
Moriarty, Joshua|MD||joshua-moriarty
O'Donnell, Brendan|NJ||
Panza, Thomas|FL||
Potgieter, Jace|TX||
Pouslen, Hank|UT||
Powers, Kade|KY|Offered: 3 schools|
Presley, Eli|TX||
Rosenberg, Logan|FL||
Ragland, Durgan|TN||
Ralenkotter, Ashton|AZ||ashton-ralenkotter
Rawson, Jamison|AL||
Robinson, Keaton|IN||keaton-robinson
Russelburg, Brandt|IA||
Saffaf, Kareem|MO||kareem-saffaf
Sandifer, John|FL||john-sandifer
Servente, Lorenzo|CA||lorenzo-servente
Singer, Evan|NY||evan-singer
Smith, Jalen|AZ||jalen-smith
Smith, Archer|AL||archer-smith
Stamp, Thomas|PA||
Stranix, Jake|PA||
Swift, Preston|TX||
Swingle, Collin|MO||collin-swingle
Tanguay, Peter|MA||peter-tanguay
Taylor, Ryan|KS||
Townsend, Haydn|PA||
Traxler, Jacob|PA||
Tutterrow, Nicholas|TX||
Underwood, Hudson|TN||hudson-underwood
VanJelgerhuis, Troy|IN||
Vrdolyak, Peter|IL||peter-vrdolyak
Wagner, Colton|OH||colton-wagner
Walker, Gage|OK||
Warren, Davis|TN||davis-warren
Wassil, Zach|FL||
White, Charlie|TN||charlie-white
Wytcherley, Jason|AZ||jason-wytcherley
Fehler, Johnny|TX||
Adams, Trevon|AZ||
Atkins, Will|SC||will-atkins
`,
  2028: `
Christie, Billy|NJ||william-christie
Tholen, Teddy|KS|Offered: Oklahoma|
Dolan, Brayden|TN|Offered: Cincinnati, Arkansas, Minnesota, SMU|
Sales, Anthony|NC|Offered: Duke|anthony-sales
Kramer, Alex|CO||alex-kramer
Cummings, Nathan|AZ||
Portera, Tyce|NJ|Offered: Long Island University|tyce-portera
Lindsey, Cooper|TX||
Molen, Roman|MT||roman-molen
Moorman, Cooper|FL|Offered: Stetson|cooper-moorman
Grabinski, Nicholas|NJ||nicholas-grabinski
Vigneau, Connor|MA||connor-vigneau
Arellano, Marcelo|NY||marcelo-arellano
Vento, Westin|WI||westin-vento
Barnett, Wesley|TX||wesley-barnett
Adams, Andy|KY||andy-adams
Johnson, Waylon|LA||waylon-johnson
Broussard, Blake|LA||blake-broussard
Horner, Colton|MA||colton-horner
Chapman, Brayden|SC||brayden-chapman
Kozloski, Logan|WI||
Wetzler, Lee|GA||lee-wetzler
Frandsen, Colton|UT||
Ferber, Evan|FL||evan-ferber
Chapman, Cyler|FL||cyler-chapman
Caplan, Dylan|IL||dylan-caplan
Weyrauch, Austin|IL||austin-weyrauch
Person, Clayborn|MO||clayborn-person
Peterson, Logan|PA||logan-peterson-2
#
Abshire, Andrew|TX||
Andersen, Luke|PA||
Bonnette, Vincent|NV||
Boyd, Chandler|AL||chandler-boyd
Brady, Nicholas|TN||nicholas-brady
Brown, Andreas|TX||andreas-brown
Coffman, Eli|IN||eli-coffman
Corriveau, Caleb|CT||caleb-corriveau
Davis, Maxton|MO||maxton-davis
Deason, Cole|MA||cole-deason
Dubak, Brady|SC||
Feinberg, Ari|NJ||
Felvey, Samuel|VA||
Franchella, Nicholas|MD||nicholas-franchella
Grillo, Matthew|DE||matthew-grillo
Gulino, Luke|LA||luke-gulino
Hamilton, Dylan|CA||dylan-hamilton
Higgins, Jake|WI||jake-higgins
Hoenie, Jackson|MI||
Holbin, Tavis|AZ||tavis-holbin
Jones, Collier|AR||collier-jones
Keller, Carson|KS||
Lacasse, Judd|MD||
Lauria, Vincent|AZ||vincent-lauria
Lutz, Brandon|KS||brandon-lutz
Mekoliavitch, Hunter|FL||hunter-mekoliavitch
Millwee, Andrew|TX||andrew-millwee
Mulhall, Douglas|KY||douglas-mulhall
Munson, Jake|TX||
Myers, Cohen|FL||
Pippin, Matthew|VA||
Purscell, Jake|IA||
Register, Cody|GA||cody-register
Speir, Colton|MS||colton-speir
Speltz, Taejen|IA||taejen-speltz
Streif, Anthony|MS||christin-streif
Sullivan, Shane|MA||
Swanson, Will|TX||will-swanson
Thomas, Bryson|AL||bryson-thomas
Vickers, Derek|MI||derek-vickers
Wilmeth, Caleb|TX||caleb-wilmeth
Yurechko, Ian|OH||
Sanicola, Samson|WI||
#
Adkins, Maveric|WV||
Alcantar, Nolan|AZ||
Bohner, Pruitt|TX||
Burns, Braxton|TX||braxton-burns
Combs, Evan|VA||evan-combs
Cox, Logan|FL||
Curbow, AJ|MS||aj-curbow
Deaton, Landry|OK||
Fairbanks, Owen|FL||
Gates, Wills|TN||
Gerling, Brady|FL||brady-gerling
Gewalt, Jack|IL||jack-gewalt
Hardin, Jake|AL||jake-hardin
Harris, Logan|MS||logan-harris
Hilliard, Xiluss|IN||
Hopper, Chandler|AR||
Huffine, Logan|OK||logan-huffine
Jarnagin, Chase|CO||chase-jarnagin
Johnson, Brooks|TX||
Kessler, Zachary|MD||
King, Carter|AL||carter-king
Kirchoff, Zaxtyn|GA||
Marini, Nicholas|MA||
McFadden, Will|FL||
McGill, Patrick|IA||patrick-mc-gill
McManus, Jake|TX||jake-mc-manus
Naviglia, Thomas|PA||
Nichols, Jackson|TN||jackson-nichols
Petrescu, Austin|TN||
Pham, Graham|CA||
Redman, Johnathan|MD||
Scerpella, Niklaus|WI||niklaus-scerpella
Smith, Christopher|TN||
Stein, Kyler|TX||
Stice, Aiden|TX||
Sweeney, Patrick|CA||patrick-sweeney
Tetterton, Hudson|GA||hudson-tetterton
Velikovszki, Zsolt|FL||
Walker, Charlie|TX||charlie-walker
Washburn, Cash|GA||
West, Samuel|TX||samuel-west
White, Jacob|FL||
#
Batton, Kindin|NV||
Bennett, Bryson|FL||
Blumling, Liam|PA||
Bogdan, Parker|PA||parker-bogdan
Bryan, Will|GA||will-bryan
C'de Baca, Beau|CA||beau-cde-baca
Cannon, Charlie|TN||charlie-cannon
Carden, Tristan|GA||
Cartee, Roman|FL||
Dengel, Sam|OH||
Duhon, Dean|TX||
Dunn, Cayson|TN||
Farrugia, Dylan|AZ||
Ferriell, Joseph|OH||
Gilray, Braydon|TX||braydon-gilray
Grant, Rowan|NY||rowan-grant
Hughes, Sawyer|GA||
Koles, Matthew|MI||matthew-koles
Laudenslager, Lucas|PA||lucas-laudenslager
Meeks, Cole|AL||
Nichols, Jaedon|FL||
Nowinsky, Thomas|OH||thomas-nowinsky
Oliver, Tanner|AL||
Ouellette, Charles|FL||charles-ouellette-iii
O'Brien, Declan|AZ||
Pellegrin, Gage|TN||gage-pellegrin
Randall, Benjamin|IA||
Reeker, Cash|NE||
Robinson, Langston|TN||
Sepulveda, Robert|AL||
Tadvick, Jack|AZ||jack-tadvick
Testaverde, Vincent|SC||vincent-testaverde
Vaughan, Steven|KS||
Wilson, Chester|NC||chester-wilson
Wozniak, Jonathon|IL||jonathon-wozniak
`,
};

// Rubio's lists: "First Last | note". `same` names a Kohl's player when the names differ but look like the same person.
const RUBIO = {
  2027: {
    label: "Rubio Long Snapping: Top Available 2027 Long Snappers (Jun 12, 2025)", url: "https://rubiosblog.com/?p=12252",
    players: [
      ["Sean Kraft", "Rubio (Jun 2025) listed: Wake Forest, North Carolina, Arkansas St, Liberty, Notre Dame"],
      ["Jaydee Lane", "Rubio (Jun 2025) listed: Mississippi State, Copiah Lincoln College"],
      ["Zayden Lassiter", "Rubio (Jun 2025) listed: Georgia Southern"],
      ["Chase Abdul-Wahab"], ["Tyler Noble"], ["Brody Tunison"], ["Ethan Putz"], ["Robert Petersen"], ["Bubba O'Donnell"],
      ["Brayson Albin"], ["Jake Stranix"],
      ["Lane Hewig", "Rubio (Jun 2025) listed: Eastern Kentucky"],
      ["Joey Chiappini"], ["Clayton Macy"], ["Quinn Nikkel"], ["Kyle Gerrish"], ["Jackson Berg"], ["Keaton Middlebrooks"],
    ],
  },
  2028: {
    label: "Rubio Long Snapping: Top 2028 Available Long Snappers (Jun 12, 2025)", url: "https://rubiosblog.com/?p=12254",
    players: [
      ["Brady Dolan", "Rubio (Jun 2025) listed offers: Arkansas State, Alabama A&M, ULM", "Brayden Dolan"],
      ["Landry Deaton"],
    ],
  },
};
// Rubio Long Snapping home page, Players of the Week.
const RUBIO_POTW = [
  [2027, "Abram Stickels", "Rubio Player of the Week: won the LA camp, should push for a Top 12 invite"],
  [2028, "Graham Pham", "Rubio Player of the Week"],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const flip = (n) => { const [last, first] = n.split(",").map((x) => x.trim()); return first ? `${first} ${last}` : last; };
const pwo = (s) => s.replace(/\*/g, " (preferred walk-on)");
const recruiting = (s) => (!s ? "" : s.startsWith("Offered:") ? pwo(s) : `Committed: ${pwo(s)}`);

const out = [];
for (const cls of [2027, 2028]) {
  const byName = new Map();
  let group = 1;
  let rank = 0;
  for (const line of KOHLS[cls].trim().split("\n")) {
    if (line.startsWith("#")) { group++; continue; }
    const [n, state, rec, prof] = line.split("|").map((x) => x.trim());
    const name = flip(n);
    const p = {
      id: `hs-ls-${cls}-${slug(name)}`, name, hsClass: cls, hsState: state,
      kohlsRank: group === 1 ? ++rank : null, kohlsGroup: group, recruiting: recruiting(rec), rubio: false,
      sources: [{ label: `Kohl's Kicking ${cls} national long snapper ratings`, url: prof ? `https://www.kohlskicking.com/player-profiles/${prof}` : `https://www.kohlskicking.com/national-player-ratings/long-snappers/${cls}`, date: CHECKED }],
    };
    if (byName.has(name.toLowerCase())) throw new Error(`Duplicate ${name} in ${cls}`);
    byName.set(name.toLowerCase(), p);
    out.push(p);
  }
  const addRubio = (name, note, label, url, same) => {
    const hit = byName.get((same ?? name).toLowerCase());
    const src = { label, url, date: CHECKED };
    if (hit) {
      hit.rubio = true; hit.sources.push(src);
      if (note) hit.recruiting = [hit.recruiting, note].filter(Boolean).join(" · ");
      if (same) hit.recruiting = [hit.recruiting, `Rubio lists the name as ${name}`].filter(Boolean).join(" · ");
      return;
    }
    const p = { id: `hs-ls-${cls}-${slug(name)}`, name, hsClass: cls, hsState: "", kohlsRank: null, kohlsGroup: null, recruiting: note ?? "", rubio: true, sources: [src] };
    byName.set(name.toLowerCase(), p);
    out.push(p);
  };
  for (const [name, note, same] of RUBIO[cls].players) addRubio(name, note, RUBIO[cls].label, RUBIO[cls].url, same);
  for (const [c, name, note] of RUBIO_POTW) if (c === cls) addRubio(name, note, "Rubio Long Snapping: Players of the Week", "https://www.rubiolongsnapping.com/", undefined);
}

writeFileSync(new URL("../src/data/hs-long-snappers.json", import.meta.url), JSON.stringify(out, null, 0).replace(/\},\{/g, "},\n{") + "\n");
const n = (c) => out.filter((p) => p.hsClass === c);
console.log(`2027: ${n(2027).length} (${n(2027).filter((p) => p.kohlsRank).length} ranked, ${n(2027).filter((p) => p.rubio).length} on Rubio). 2028: ${n(2028).length} (${n(2028).filter((p) => p.kohlsRank).length} ranked, ${n(2028).filter((p) => p.rubio).length} on Rubio).`);
