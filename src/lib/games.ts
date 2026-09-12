export type GameStatus = "available" | "soon";

export type GameDefinition = {
  id: string;
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  status: GameStatus;
  releaseNote?: string;
};

/**
 * Game registry. Adding a new playable game means adding an entry here plus a
 * board renderer + controller for that id — nothing else is Catan-specific.
 */
export const GAMES: GameDefinition[] = [
  {
    id: "catan",
    name: "CATAN",
    tagline: "Settle the island. Trade, build, and race to 10 points.",
    minPlayers: 3,
    maxPlayers: 4,
    duration: "60–90 min",
    status: "available",
  },
  {
    id: "soon-1",
    name: "COMING SOON",
    tagline: "New game in development.",
    minPlayers: 2,
    maxPlayers: 6,
    duration: "—",
    status: "soon",
    releaseNote: "In development",
  },
  {
    id: "soon-2",
    name: "COMING SOON",
    tagline: "More games are on the way.",
    minPlayers: 2,
    maxPlayers: 8,
    duration: "—",
    status: "soon",
    releaseNote: "In development",
  },
];

export const getGame = (id: string) => GAMES.find((g) => g.id === id);

export const PLAYER_COLORS = ["red", "blue", "orange", "green"] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const colorClass: Record<string, string> = {
  red: "bg-pixel-red",
  blue: "bg-pixel-blue",
  orange: "bg-pixel-orange",
  green: "bg-pixel-green",
};
