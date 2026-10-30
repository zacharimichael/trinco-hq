/**
 * Every NCAA football school for the 2026 season: [name, state]. FBS and FCS checked against
 * fbschedules.com and theanalyst.com 2026 realignment lists (Oct 2026). Division II (160) and
 * Division III (244) from Wikipedia's "List of NCAA Division II/III football programs" (Oct 2026).
 * Map spots are in school-locations.json ([lat, lon, town]): campus points from the us-colleges
 * npm package's college list, a GeoNames town center for the few it lacks, and DC by hand.
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
    ["UNLV", "NV"], ["Wyoming", "WY"], ["Northern Illinois", "IL"], ["UTEP", "TX"], ["North Dakota State", "ND"],
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
    ["Southern Utah", "UT"], ["UC Davis", "CA"], ["Utah Tech", "UT"], ["Weber State", "UT"],
  ],
  CAA: [
    ["Albany", "NY"], ["Bryant", "RI"], ["Campbell", "NC"], ["Elon", "NC"], ["Hampton", "VA"], ["Maine", "ME"],
    ["Monmouth", "NJ"], ["New Hampshire", "NH"], ["North Carolina A&T", "NC"], ["Rhode Island", "RI"],
    ["Sacred Heart", "CT"], ["Stony Brook", "NY"], ["Towson", "MD"],
  ],
  "Missouri Valley": [
    ["Illinois State", "IL"], ["Indiana State", "IN"], ["Murray State", "KY"], ["North Dakota", "ND"],
    ["Northern Iowa", "IA"], ["South Dakota", "SD"], ["South Dakota State", "SD"],
    ["Southern Illinois", "IL"], ["Youngstown State", "OH"],
  ],
  "OVC-Big South": [
    ["Charleston Southern", "SC"], ["Eastern Illinois", "IL"], ["Gardner-Webb", "NC"], ["Lindenwood", "MO"],
    ["Southeast Missouri", "MO"], ["Tennessee State", "TN"], ["UT Martin", "TN"], ["Western Illinois", "IL"],
  ],
  SoCon: [
    ["Chattanooga", "TN"], ["East Tennessee State", "TN"], ["Furman", "SC"], ["Mercer", "GA"], ["Samford", "AL"],
    ["Tennessee Tech", "TN"], ["The Citadel", "SC"], ["VMI", "VA"], ["Western Carolina", "NC"], ["Wofford", "SC"],
  ],
  Southland: [
    ["East Texas A&M", "TX"], ["Houston Christian", "TX"], ["Incarnate Word", "TX"], ["Lamar", "TX"], ["McNeese", "LA"],
    ["Nicholls", "LA"], ["Northwestern State", "LA"], ["Southeastern Louisiana", "LA"], ["Stephen F. Austin", "TX"], ["UTRGV", "TX"],
  ],
  UAC: [
    ["Abilene Christian", "TX"], ["Austin Peay", "TN"], ["Central Arkansas", "AR"], ["Eastern Kentucky", "KY"],
    ["North Alabama", "AL"], ["Tarleton State", "TX"], ["West Florida", "FL"], ["West Georgia", "GA"],
  ],
  Patriot: [
    ["Bucknell", "PA"], ["Colgate", "NY"], ["Fordham", "NY"], ["Georgetown", "DC"], ["Holy Cross", "MA"],
    ["Lafayette", "PA"], ["Lehigh", "PA"], ["Richmond", "VA"], ["Villanova", "PA"], ["William & Mary", "VA"],
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
    ["Central Connecticut", "CT"], ["Chicago State", "IL"], ["Duquesne", "PA"], ["LIU", "NY"], ["Mercyhurst", "PA"], ["New Haven", "CT"],
    ["Robert Morris", "PA"], ["Stonehill", "MA"], ["Wagner", "NY"],
  ],
  "FCS Independent": [["Merrimack", "MA"]],
};

const D2: Record<string, Row[]> = {
  CIAA: [
    ["Bluefield State University", "WV"], ["Bowie State University", "MD"], ["Elizabeth City State University", "NC"],
    ["Fayetteville State University", "NC"], ["Johnson C. Smith University", "NC"], ["Lincoln University (PA)", "PA"],
    ["Livingstone College", "NC"], ["Shaw University", "NC"], ["Virginia State University", "VA"],
    ["Virginia Union University", "VA"], ["Winston-Salem State University", "NC"],
  ],
  Carolinas: [
    ["Barton College", "NC"], ["Chowan University", "NC"], ["Erskine College", "SC"], ["Ferrum College", "VA"],
    ["North Greenville University", "SC"], ["Shorter University", "GA"],
    ["University of North Carolina at Pembroke", "NC"],
  ],
  "G-MAC": [
    ["Ashland University", "OH"], ["Hillsdale College", "MI"], ["Kentucky Wesleyan College", "KY"],
    ["Lake Erie College", "OH"], ["Northwood University", "MI"], ["Ohio Dominican University", "OH"],
    ["Thomas More University", "KY"], ["Tiffin University", "OH"], ["University of Findlay", "OH"],
    ["Walsh University", "OH"],
  ],
  GAC: [
    ["Arkansas Tech University", "AR"], ["East Central University", "OK"], ["Harding University", "AR"],
    ["Henderson State University", "AR"], ["Northwestern Oklahoma State University", "OK"],
    ["Oklahoma Baptist University", "OK"], ["Ouachita Baptist University", "AR"],
    ["Southeastern Oklahoma State University", "OK"], ["Southern Arkansas University", "AR"],
    ["Southern Nazarene University", "OK"], ["Southwestern Oklahoma State University", "OK"],
    ["University of Arkansas at Monticello", "AR"],
  ],
  GLIAC: [
    ["Davenport University", "MI"], ["Ferris State University", "MI"], ["Grand Valley State University", "MI"],
    ["Michigan Technological University", "MI"], ["Northern Michigan University", "MI"],
    ["Roosevelt University", "IL"], ["Saginaw Valley State University", "MI"], ["Wayne State University", "MI"],
  ],
  GLVC: [
    ["Lincoln University (MO)", "MO"], ["McKendree University", "IL"],
    ["Missouri University of Science and Technology", "MO"], ["Quincy University", "IL"],
    ["Southwest Baptist University", "MO"], ["Truman State University", "MO"], ["University of Indianapolis", "IN"],
    ["Upper Iowa University", "IA"], ["William Jewell College", "MO"],
  ],
  GSC: [
    ["Delta State University", "MS"], ["University of West Alabama", "AL"], ["Valdosta State University", "GA"],
  ],
  Independent: [
    ["Northeastern State University", "OK"],
  ],
  LSC: [
    ["Angelo State University", "TX"], ["Central Washington University", "WA"],
    ["Eastern New Mexico University", "NM"], ["Midwestern State University", "TX"],
    ["Sul Ross State University", "TX"], ["Texas A&M University\u2013Kingsville", "TX"],
    ["University of Texas Permian Basin", "TX"], ["West Texas A&M University", "TX"],
    ["Western New Mexico University", "NM"], ["Western Oregon University", "OR"],
  ],
  MEC: [
    ["Concord University", "WV"], ["Fairmont State University", "WV"], ["Frostburg State University", "MD"],
    ["Glenville State University", "WV"], ["University of Charleston", "WV"], ["West Liberty University", "WV"],
    ["West Virginia State University", "WV"], ["West Virginia Wesleyan College", "WV"], ["Wheeling University", "WV"],
  ],
  MIAA: [
    ["Emporia State University", "KS"], ["Fort Hays State University", "KS"],
    ["Missouri Southern State University", "MO"], ["Missouri Western State University", "MO"],
    ["Northwest Missouri State University", "MO"], ["Pittsburg State University", "KS"],
    ["University of Central Missouri", "MO"], ["University of Central Oklahoma", "OK"],
    ["University of Nebraska at Kearney", "NE"], ["Washburn University", "KS"],
  ],
  "NE-10": [
    ["American International College", "MA"], ["Assumption University", "MA"], ["Bentley University", "MA"],
    ["Franklin Pierce University", "NH"], ["Pace University", "NY"], ["Post University", "CT"],
    ["Saint Anselm College", "NH"], ["Southern Connecticut State University", "CT"],
  ],
  NSIC: [
    ["Augustana University", "SD"], ["Bemidji State University", "MN"], ["Concordia University, Saint Paul", "MN"],
    ["Minnesota State University Moorhead", "MN"], ["Minnesota State University, Mankato", "MN"],
    ["Minot State University", "ND"], ["Northern State University", "SD"],
    ["Southwest Minnesota State University", "MN"], ["University of Jamestown", "ND"], ["University of Mary", "ND"],
    ["University of Minnesota Duluth", "MN"], ["University of Sioux Falls", "SD"], ["Wayne State College", "NE"],
    ["Winona State University", "MN"],
  ],
  PSAC: [
    ["Commonwealth University-Bloomsburg", "PA"], ["Commonwealth University-Lock Haven", "PA"],
    ["East Stroudsburg University", "PA"], ["Gannon University", "PA"], ["Indiana University of Pennsylvania", "PA"],
    ["Kutztown University", "PA"], ["Millersville University", "PA"], ["PennWest California", "PA"],
    ["PennWest Clarion", "PA"], ["PennWest Edinboro", "PA"], ["Seton Hill University", "PA"],
    ["Shepherd University", "WV"], ["Shippensburg University", "PA"], ["Slippery Rock University", "PA"],
    ["West Chester University", "PA"],
  ],
  RMAC: [
    ["Adams State University", "CO"], ["Black Hills State University", "SD"], ["Chadron State College", "NE"],
    ["Colorado Mesa University", "CO"], ["Colorado School of Mines", "CO"], ["Colorado State University Pueblo", "CO"],
    ["Fort Lewis College", "CO"], ["New Mexico Highlands University", "NM"],
    ["South Dakota School of Mines and Technology", "SD"], ["Western Colorado University", "CO"],
  ],
  SAC: [
    ["Anderson University", "SC"], ["Carson-Newman University", "TN"], ["Catawba College", "NC"],
    ["Emory and Henry University", "VA"], ["Lenoir-Rhyne University", "NC"], ["Mars Hill University", "NC"],
    ["Newberry College", "SC"], ["Tusculum University", "TN"], ["University of Virginia's College at Wise", "VA"],
    ["Wingate University", "NC"],
  ],
  SIAC: [
    ["Albany State University", "GA"], ["Allen University", "SC"], ["Benedict College", "SC"],
    ["Central State University", "OH"], ["Clark Atlanta University", "GA"], ["Edward Waters University", "FL"],
    ["Fort Valley State University", "GA"], ["Kentucky State University", "KY"], ["Lane College", "TN"],
    ["Miles College", "AL"], ["Morehouse College", "GA"], ["Savannah State University", "GA"],
    ["Tuskegee University", "AL"],
  ],
};

const D3: Record<string, Row[]> = {
  ARC: [
    ["Buena Vista", "IA"], ["Central (IA)", "IA"], ["Coe", "IA"], ["Dubuque", "IA"], ["Loras", "IA"],
    ["Nebraska Wesleyan", "NE"], ["Simpson", "IA"], ["Wartburg", "IA"],
  ],
  ASC: [
    ["East Texas Baptist", "TX"], ["Hardin-Simmons", "TX"], ["Howard Payne", "TX"], ["Mary Hardin-Baylor", "TX"],
    ["McMurry", "TX"], ["Schreiner", "TX"],
  ],
  CCIW: [
    ["Augustana (IL)", "IL"], ["Carroll (WI)", "WI"], ["Carthage", "WI"], ["Elmhurst", "IL"],
    ["Illinois Wesleyan", "IL"], ["Millikin", "IL"], ["North Central (IL)", "IL"], ["North Park", "IL"],
    ["Wheaton (IL)", "IL"],
  ],
  CNE: [
    ["Curry", "MA"], ["Endicott", "MA"], ["Husson", "ME"], ["Maine Maritime", "ME"], ["New England (ME)", "ME"],
    ["New England College", "NH"], ["Nichols", "MA"], ["Western New England", "MA"],
  ],
  Centennial: [
    ["Carnegie Mellon", "PA"], ["Dickinson", "PA"], ["Franklin & Marshall", "PA"], ["Gettysburg", "PA"],
    ["Johns Hopkins", "MD"], ["McDaniel", "MD"], ["Muhlenberg", "PA"], ["Ursinus", "PA"],
  ],
  "Empire 8": [
    ["Alfred", "NY"], ["Alfred State", "NY"], ["Brockport", "NY"], ["Cortland", "NY"], ["Hartwick", "NY"],
    ["Morrisville", "NY"], ["St. John Fisher", "NY"], ["Utica", "NY"],
  ],
  HCAC: [
    ["Anderson (IN)", "IN"], ["Bluffton", "OH"], ["Franklin", "IN"], ["Hanover", "IN"], ["Manchester", "IN"],
    ["Mount St. Joseph", "OH"], ["Rose-Hulman", "IN"],
  ],
  Independent: [
    ["Keystone", "PA"],
  ],
  Landmark: [
    ["Catholic University", "DC"], ["Juniata", "PA"], ["Lycoming", "PA"], ["Moravian", "PA"], ["Susquehanna", "PA"],
    ["Western Connecticut", "CT"], ["Wilkes", "PA"],
  ],
  Liberty: [
    ["Buffalo State", "NY"], ["Hilbert", "NY"], ["Hobart", "NY"], ["Ithaca", "NY"], ["RPI", "NY"], ["Rochester", "NY"],
    ["St. Lawrence", "NY"], ["Union", "NY"],
  ],
  MAC: [
    ["Albright", "PA"], ["Alvernia", "PA"], ["Delaware Valley", "PA"], ["Eastern", "PA"],
    ["Fairleigh Dickinson-Florham", "NJ"], ["King's", "PA"], ["Lebanon Valley", "PA"], ["Misericordia", "PA"],
    ["Stevenson", "MD"], ["Widener", "PA"],
  ],
  MASCAC: [
    ["Bridgewater State", "MA"], ["Dean", "MA"], ["Fitchburg State", "MA"], ["Framingham State", "MA"],
    ["Massachusetts Maritime", "MA"], ["Plymouth State", "NH"], ["UMass Dartmouth", "MA"], ["Westfield State", "MA"],
    ["Worcester State", "MA"],
  ],
  MIAA: [
    ["Adrian", "MI"], ["Albion", "MI"], ["Alma", "MI"], ["Calvin", "MI"], ["Hope", "MI"], ["Kalamazoo", "MI"],
    ["Olivet", "MI"], ["Trine", "IN"],
  ],
  MIAC: [
    ["Augsburg", "MN"], ["Bethel", "MN"], ["Carleton", "MN"], ["Concordia (Moorhead)", "MN"],
    ["Gustavus Adolphus", "MN"], ["Hamline", "MN"], ["Macalester", "MN"], ["Saint John's (MN)", "MN"],
    ["St. Olaf", "MN"], ["St. Scholastica", "MN"],
  ],
  MWC: [
    ["Beloit", "WI"], ["Chicago", "IL"], ["Cornell (IA)", "IA"], ["Grinnell", "IA"], ["Illinois College", "IL"],
    ["Knox", "IL"], ["Lake Forest", "IL"], ["Lawrence", "WI"], ["Luther", "IA"], ["Monmouth (IL)", "IL"],
    ["Ripon", "WI"],
  ],
  NACC: [
    ["Aurora", "IL"], ["Benedictine", "IL"], ["Concordia (IL)", "IL"], ["Concordia (WI)", "WI"], ["Eureka", "IL"],
    ["Lakeland", "WI"], ["Rockford", "IL"], ["St. Norbert", "WI"], ["Wisconsin Lutheran", "WI"],
  ],
  NCAC: [
    ["DePauw", "IN"], ["Denison", "OH"], ["John Carroll", "OH"], ["Kenyon", "OH"], ["Oberlin", "OH"],
    ["Ohio Wesleyan", "OH"], ["Wabash", "IN"], ["Washington (St. Louis)", "MO"], ["Wittenberg", "OH"],
    ["Wooster", "OH"],
  ],
  NESCAC: [
    ["Amherst", "MA"], ["Bates", "ME"], ["Bowdoin", "ME"], ["Colby", "ME"], ["Hamilton", "NY"], ["Middlebury", "VT"],
    ["Trinity (CT)", "CT"], ["Tufts", "MA"], ["Wesleyan", "CT"], ["Williams", "MA"],
  ],
  NEWMAC: [
    ["Coast Guard", "CT"], ["MIT", "MA"], ["Merchant Marine", "NY"], ["Norwich", "VT"], ["SUNY-Maritime", "NY"],
    ["Salve Regina", "RI"], ["Springfield", "MA"], ["WPI", "MA"],
  ],
  NJAC: [
    ["Christopher Newport", "VA"], ["Kean", "NJ"], ["Montclair State", "NJ"], ["Rowan", "NJ"], ["Salisbury", "MD"],
    ["TCNJ", "NJ"], ["Vermont State Castleton", "VT"], ["William Paterson", "NJ"],
  ],
  NWC: [
    ["George Fox", "OR"], ["Lewis & Clark", "OR"], ["Linfield", "OR"], ["Pacific (OR)", "OR"],
    ["Pacific Lutheran", "WA"], ["Puget Sound", "WA"], ["Whitworth", "WA"], ["Willamette", "OR"],
  ],
  OAC: [
    ["Baldwin Wallace", "OH"], ["Capital", "OH"], ["Heidelberg", "OH"], ["Marietta", "OH"], ["Mount Union", "OH"],
    ["Muskingum", "OH"], ["Ohio Northern", "OH"], ["Otterbein", "OH"], ["Wilmington", "OH"],
  ],
  ODAC: [
    ["Averett", "VA"], ["Bridgewater", "VA"], ["Guilford", "NC"], ["Hampden-Sydney", "VA"], ["Randolph-Macon", "VA"],
    ["Roanoke", "VA"], ["Shenandoah", "VA"], ["Washington & Lee", "VA"],
  ],
  PAC: [
    ["Allegheny", "PA"], ["Bethany", "WV"], ["Case Western Reserve", "OH"], ["Geneva", "PA"], ["Grove City", "PA"],
    ["Hiram", "OH"], ["Saint Francis", "PA"], ["St. Vincent", "PA"], ["Thiel", "PA"], ["Washington & Jefferson", "PA"],
    ["Waynesburg", "PA"], ["Westminster (PA)", "PA"],
  ],
  SAA: [
    ["Berry", "GA"], ["Centre", "KY"], ["Maryville (TN)", "TN"], ["Millsaps", "MS"], ["Rhodes", "TN"],
    ["Sewanee", "TN"], ["Southwestern", "TX"], ["Trinity (TX)", "TX"],
  ],
  SCAC: [
    ["Austin", "TX"], ["Centenary", "LA"], ["Gallaudet", "DC"], ["Hendrix", "AR"], ["Lyon", "AR"],
    ["Texas Lutheran", "TX"],
  ],
  SCIAC: [
    ["Azusa Pacific", "CA"], ["Cal Lutheran", "CA"], ["Chapman", "CA"], ["Claremont-Mudd-Scripps", "CA"],
    ["La Verne", "CA"], ["Pomona-Pitzer", "CA"], ["Redlands", "CA"], ["Whittier", "CA"],
  ],
  UMAC: [
    ["Crown", "MN"], ["Greenville", "IL"], ["Martin Luther", "MN"], ["Minnesota Morris", "MN"],
    ["Northwestern (MN)", "MN"], ["Westminster (MO)", "MO"],
  ],
  "USA South": [
    ["Belhaven", "MS"], ["Brevard", "NC"], ["Greensboro", "NC"], ["Huntingdon", "AL"], ["LaGrange", "GA"],
    ["Methodist", "NC"], ["North Carolina Wesleyan", "NC"], ["Southern Virginia", "VA"],
  ],
  WIAC: [
    ["Wisconsin-Eau Claire", "WI"], ["Wisconsin-La Crosse", "WI"], ["Wisconsin-Oshkosh", "WI"],
    ["Wisconsin-Platteville", "WI"], ["Wisconsin-River Falls", "WI"], ["Wisconsin-Stevens Point", "WI"],
    ["Wisconsin-Stout", "WI"], ["Wisconsin-Whitewater", "WI"],
  ],
};

/** "Other" is any school that isn't NCAA: NAIA, JUCO, or one added by hand. */
export type Division = "FBS" | "FCS" | "D2" | "D3" | "Other";
export const DIVISIONS = ["FBS", "FCS", "D2", "D3"] as const;
export interface School { id: string; name: string; division: Division; conference: string; state: string }

export const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const build = (division: Division, table: Record<string, Row[]>): School[] =>
  Object.entries(table).flatMap(([conference, rows]) =>
    rows.map(([name, state]) => ({ id: slug(`${division}-${name}`), name, division, conference, state })));

export const SCHOOLS: School[] = [...build("FBS", FBS), ...build("FCS", FCS), ...build("D2", D2), ...build("D3", D3)];
