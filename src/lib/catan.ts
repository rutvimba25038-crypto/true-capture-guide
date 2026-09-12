export type ResourceKey = "lumber" | "brick" | "wool" | "grain" | "ore";

export const RESOURCES: { key: ResourceKey; label: string; tile: TerrainKey }[] = [
  { key: "lumber", label: "Lumber", tile: "forest" },
  { key: "brick", label: "Brick", tile: "hill" },
  { key: "wool", label: "Wool", tile: "pasture" },
  { key: "grain", label: "Grain", tile: "field" },
  { key: "ore", label: "Ore", tile: "mountain" },
];

export type TerrainKey =
  | "forest"
  | "hill"
  | "pasture"
  | "field"
  | "mountain"
  | "desert";

export const TERRAIN: Record<
  TerrainKey,
  { label: string; produces: ResourceKey | null; className: string }
> = {
  forest: { label: "Forest", produces: "lumber", className: "bg-catan-forest" },
  hill: { label: "Hills", produces: "brick", className: "bg-catan-hill" },
  pasture: { label: "Pasture", produces: "wool", className: "bg-catan-pasture" },
  field: { label: "Fields", produces: "grain", className: "bg-catan-field" },
  mountain: {
    label: "Mountains",
    produces: "ore",
    className: "bg-catan-mountain",
  },
  desert: { label: "Desert", produces: null, className: "bg-catan-desert" },
};

export type Tile = { terrain: TerrainKey; number: number | null };

export type CatanState = {
  board: Tile[];
  /** rows of the classic 3-4-5-4-3 hex layout */
  rows: number[];
  turnSeat: number;
  dice: [number, number] | null;
  log: string[];
};

export type PlayerHand = Record<ResourceKey, number>;

export const emptyHand = (): PlayerHand => ({
  lumber: 0,
  brick: 0,
  wool: 0,
  grain: 0,
  ore: 0,
});

const TERRAIN_BAG: TerrainKey[] = [
  ...Array<TerrainKey>(4).fill("forest"),
  ...Array<TerrainKey>(4).fill("pasture"),
  ...Array<TerrainKey>(4).fill("field"),
  ...Array<TerrainKey>(3).fill("hill"),
  ...Array<TerrainKey>(3).fill("mountain"),
  "desert",
];

const NUMBER_BAG = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
};

export const createCatanState = (): CatanState => {
  const terrains = shuffle(TERRAIN_BAG);
  const numbers = shuffle(NUMBER_BAG);
  let n = 0;
  const board: Tile[] = terrains.map((terrain) => ({
    terrain,
    number: terrain === "desert" ? null : (numbers[n++] ?? null),
  }));

  return {
    board,
    rows: [3, 4, 5, 4, 3],
    turnSeat: 0,
    dice: null,
    log: ["Game started. Good luck, settlers."],
  };
};

export const rollDice = (): [number, number] => [
  1 + Math.floor(Math.random() * 6),
  1 + Math.floor(Math.random() * 6),
];

/** Resources produced for a dice total, per terrain type. */
export const production = (board: Tile[], total: number): ResourceKey[] => {
  const out: ResourceKey[] = [];
  board.forEach((tile) => {
    if (tile.number === total) {
      const res = TERRAIN[tile.terrain].produces;
      if (res) out.push(res);
    }
  });
  return out;
};

export const BUILD_COSTS: Record<string, Partial<PlayerHand>> = {
  Road: { lumber: 1, brick: 1 },
  Settlement: { lumber: 1, brick: 1, wool: 1, grain: 1 },
  City: { grain: 2, ore: 3 },
  "Dev card": { wool: 1, grain: 1, ore: 1 },
};

export const canAfford = (hand: PlayerHand, cost: Partial<PlayerHand>) =>
  Object.entries(cost).every(([k, v]) => hand[k as ResourceKey] >= (v ?? 0));

export const pay = (hand: PlayerHand, cost: Partial<PlayerHand>): PlayerHand => {
  const next = { ...hand };
  Object.entries(cost).forEach(([k, v]) => {
    next[k as ResourceKey] -= v ?? 0;
  });
  return next;
};
