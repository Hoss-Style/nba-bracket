// Key players for each NBA team - used for Finals MVP autocomplete
// Updated March 30, 2026 to reflect current 2025-26 playoff rosters

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
  DEN: [
    "Nikola Jokic",
    "Jamal Murray",
    "Michael Porter Jr.",
    "Aaron Gordon",
    "Christian Braun",
    "Peyton Watson",
    "Julian Strawther",
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
  ],
  HOU: [
    "Kevin Durant",
    "Fred VanVleet",
    "Alperen Sengun",
    "Jabari Smith Jr.",
    "Amen Thompson",
    "Tari Eason",
    "Cam Whitmore",
  ],
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
  LAC: [
    "Kawhi Leonard",
    "Darius Garland",
    "Ivica Zubac",
    "John Collins",
    "Brook Lopez",
    "Nicolas Batum",
    "Kris Dunn",
    "Derrick Jones Jr.",
  ],
  // --- EASTERN CONFERENCE ---
  DET: [
    "Cade Cunningham",
    "Jaden Ivey",
    "Ausar Thompson",
    "Tobias Harris",
    "Jalen Duren",
    "Tim Hardaway Jr.",
    "Malik Beasley",
    "Isaiah Stewart",
  ],
  BOS: [
    "Jayson Tatum",
    "Jaylen Brown",
    "Derrick White",
    "Jrue Holiday",
    "Payton Pritchard",
    "Sam Hauser",
    "Al Horford",
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
    "Kristaps Porzingis",
    "CJ McCollum",
    "Onyeka Okongwu",
    "De'Andre Hunter",
    "Bogdan Bogdanovic",
    "Corey Kispert",
    "Nickeil Alexander-Walker",
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
