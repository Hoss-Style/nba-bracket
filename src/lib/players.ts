// Key players for each NBA team - used for Finals MVP autocomplete
// Updated April 16, 2026 to reflect current playoff rosters after trade deadline

export const TEAM_PLAYERS: Record<string, string[]> = {
  // --- WESTERN CONFERENCE ---
  OKC: [
    "Shai Gilgeous-Alexander",
    "Jalen Williams",
    "Chet Holmgren",
    "Lu Dort",
    "Isaiah Hartenstein",
    "Alex Caruso",
    "Aaron Wiggins",
    "Kenrich Williams",
    "Cason Wallace",
    "Isaiah Joe",
  ],
  SAS: [
    "Victor Wembanyama",
    "De'Aaron Fox",
    "Devin Vassell",
    "Stephon Castle",
    "Harrison Barnes",
    "Keldon Johnson",
    "Dylan Harper",
    "Julian Champagnie",
    "Jeremy Sochan",
  ],
  DEN: [
    "Nikola Jokic",
    "Jamal Murray",
    "Michael Porter Jr.",
    "Aaron Gordon",
    "Christian Braun",
    "Peyton Watson",
    "Julian Strawther",
  ],
  LAL: [
    "Luka Doncic",
    "LeBron James",
    "Austin Reaves",
    "Marcus Smart",
    "Deandre Ayton",
    "Rui Hachimura",
    "Dalton Knecht",
    "Gabe Vincent",
    "Jaxson Hayes",
    "Maxi Kleber",
  ],
  HOU: [
    "Kevin Durant",
    "Fred VanVleet",
    "Alperen Sengun",
    "Jabari Smith Jr.",
    "Amen Thompson",
    "Reed Sheppard",
    "Clint Capela",
    "Tari Eason",
    "Cam Whitmore",
    "Steven Adams",
    "Dorian Finney-Smith",
  ],
  MIN: [
    "Anthony Edwards",
    "Julius Randle",
    "Rudy Gobert",
    "Jaden McDaniels",
    "Mike Conley",
    "Donte DiVincenzo",
    "Naz Reid",
    "Rob Dillingham",
    "Ayo Dosunmu",
  ],
  POR: [
    "Damian Lillard",
    "Scoot Henderson",
    "Jrue Holiday",
    "Deni Avdija",
    "Shaedon Sharpe",
    "Donovan Clingan",
    "Jerami Grant",
    "Toumani Camara",
    "Robert Williams III",
    "Kris Murray",
    "Matisse Thybulle",
  ],
  // --- EASTERN CONFERENCE ---
  DET: [
    "Cade Cunningham",
    "Ausar Thompson",
    "Tobias Harris",
    "Jalen Duren",
    "Tim Hardaway Jr.",
    "Malik Beasley",
    "Isaiah Stewart",
    "Kevin Huerter",
    "Dario Saric",
  ],
  BOS: [
    "Jayson Tatum",
    "Jaylen Brown",
    "Derrick White",
    "Payton Pritchard",
    "Nikola Vucevic",
    "Sam Hauser",
  ],
  NYK: [
    "Jalen Brunson",
    "Karl-Anthony Towns",
    "Mikal Bridges",
    "OG Anunoby",
    "Josh Hart",
    "Miles McBride",
    "Mitchell Robinson",
    "Precious Achiuwa",
  ],
  CLE: [
    "Donovan Mitchell",
    "James Harden",
    "Evan Mobley",
    "Jarrett Allen",
    "Max Strus",
    "Caris LeVert",
    "Sam Merrill",
    "Isaac Okoro",
    "Craig Porter Jr.",
    "Dean Wade",
    "Dennis Schroder",
    "Keon Ellis",
  ],
  TOR: [
    "Scottie Barnes",
    "RJ Barrett",
    "Brandon Ingram",
    "Immanuel Quickley",
    "Jakob Poeltl",
    "Jamal Shead",
    "Ja'Kobe Walter",
    "Ochai Agbaji",
  ],
  ATL: [
    "Jalen Johnson",
    "Dyson Daniels",
    "Zaccharie Risacher",
    "CJ McCollum",
    "Onyeka Okongwu",
    "Bogdan Bogdanovic",
    "Corey Kispert",
    "Nickeil Alexander-Walker",
    "Jonathan Kuminga",
    "Buddy Hield",
  ],
  PHI: [
    "Tyrese Maxey",
    "Joel Embiid",
    "Paul George",
    "Kelly Oubre Jr.",
    "VJ Edgecombe",
    "Andre Drummond",
    "Cameron Payne",
    "Quentin Grimes",
    "Adem Bona",
  ],
  // --- PLAY-IN 8-SEED CONTENDERS ---
  PHX: [
    "Devin Booker",
    "Jalen Green",
    "Dillon Brooks",
    "Royce O'Neale",
    "Mark Williams",
    "Khaman Maluach",
    "Ryan Dunn",
    "Oso Ighodaro",
  ],
  GSW: [
    "Stephen Curry",
    "Brandin Podziemski",
    "Kristaps Porzingis",
    "Al Horford",
    "Andrew Wiggins",
    "Kevon Looney",
    "Buddy Hield",
    "Pat Spencer",
  ],
  ORL: [
    "Paolo Banchero",
    "Franz Wagner",
    "Jalen Suggs",
    "Wendell Carter Jr.",
    "Jonathan Isaac",
    "Cole Anthony",
    "Gary Harris",
    "Moritz Wagner",
    "Goga Bitadze",
  ],
  CHA: [
    "LaMelo Ball",
    "Brandon Miller",
    "Kon Knueppel",
    "Collin Sexton",
    "Tre Mann",
    "Spencer Dinwiddie",
    "Pat Connaughton",
    "Mason Plumlee",
  ],
};

export function getPlayersForTeams(teamAbbrs: string[]): string[] {
  const players: string[] = [];
  for (const abbr of teamAbbrs) {
    const teamPlayers = TEAM_PLAYERS[abbr];
    if (teamPlayers) {
      players.push(...teamPlayers);
    }
  }
  return players;
}

export function searchPlayers(query: string, teamAbbrs: string[]): string[] {
  if (!query.trim()) return [];
  const available = getPlayersForTeams(teamAbbrs);
  const q = query.toLowerCase();
  return available.filter((p) => p.toLowerCase().includes(q));
}
