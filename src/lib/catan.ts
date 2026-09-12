export type ResourceKey = "lumber" | "brick" | "wool" | "grain" | "ore";
export type TerrainKey = "forest" | "hill" | "pasture" | "field" | "mountain" | "desert";
export type BuildingType = "settlement" | "city";
export type DevCard = "knight" | "roadBuilding" | "yearOfPlenty" | "monopoly" | "victoryPoint";
export type GamePhase = "setup" | "play" | "robber-discard" | "robber-move" | "game-over";

export const RESOURCES: { key: ResourceKey; label: string; tile: TerrainKey }[] = [
  { key: "lumber", label: "Lumber", tile: "forest" },
  { key: "brick", label: "Brick", tile: "hill" },
  { key: "wool", label: "Wool", tile: "pasture" },
  { key: "grain", label: "Grain", tile: "field" },
  { key: "ore", label: "Ore", tile: "mountain" },
];

export const TERRAIN: Record<TerrainKey, { label: string; produces: ResourceKey | null; className: string }> = {
  forest: { label: "Forest", produces: "lumber", className: "bg-catan-forest" },
  hill: { label: "Hills", produces: "brick", className: "bg-catan-hill" },
  pasture: { label: "Pasture", produces: "wool", className: "bg-catan-pasture" },
  field: { label: "Fields", produces: "grain", className: "bg-catan-field" },
  mountain: { label: "Mountains", produces: "ore", className: "bg-catan-mountain" },
  desert: { label: "Desert", produces: null, className: "bg-catan-desert" },
};

export type Tile = { terrain: TerrainKey; number: number | null };
export type PlayerHand = Record<ResourceKey, number>;
export type PublicBuilding = { intersectionId: string; seat: number; type: BuildingType };
export type PublicRoad = { edgeId: string; seat: number };
export type TradeOffer = { fromSeat: number; toSeat: number; give: Partial<PlayerHand>; want: Partial<PlayerHand> };

export type CatanState = {
  board: Tile[];
  rows: number[];
  turnSeat: number;
  dice: [number, number] | null;
  log: string[];
  phase: GamePhase;
  setupOrder: number[];
  setupIndex: number;
  setupStep: "settlement" | "road";
  structures: PublicBuilding[];
  roads: PublicRoad[];
  robberTile: number;
  devDeck: DevCard[];
  playedDevThisTurn: boolean;
  longestRoadSeat: number | null;
  largestArmySeat: number | null;
  trade: TradeOffer | null;
  winnerSeat: number | null;
};

export type GeometryIntersection = { id: string; x: number; y: number; tiles: number[] };
export type GeometryEdge = { id: string; a: string; b: string; tiles: number[] };
export type BoardGeometry = { intersections: GeometryIntersection[]; edges: GeometryEdge[]; tileVertices: string[][]; centers: { x: number; y: number }[] };

export const emptyHand = (): PlayerHand => ({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });
export const emptyOffer = (): PlayerHand => emptyHand();

const TERRAIN_BAG: TerrainKey[] = [
  ...Array<TerrainKey>(4).fill("forest"), ...Array<TerrainKey>(4).fill("pasture"),
  ...Array<TerrainKey>(4).fill("field"), ...Array<TerrainKey>(3).fill("hill"),
  ...Array<TerrainKey>(3).fill("mountain"), "desert",
];
const NUMBER_BAG = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
};

export const createDevDeck = (): DevCard[] => shuffle([
  ...Array<DevCard>(14).fill("knight"), ...Array<DevCard>(2).fill("roadBuilding"),
  ...Array<DevCard>(2).fill("yearOfPlenty"), ...Array<DevCard>(2).fill("monopoly"),
  ...Array<DevCard>(5).fill("victoryPoint"),
]);

export const createCatanState = (playerCount = 4): CatanState => {
  const terrains = shuffle(TERRAIN_BAG);
  const numbers = shuffle(NUMBER_BAG);
  let n = 0;
  const board = terrains.map((terrain) => ({ terrain, number: terrain === "desert" ? null : (numbers[n++] ?? null) }));
  const robberTile = board.findIndex((t) => t.terrain === "desert");
  const order = Array.from({ length: playerCount }, (_, i) => i);
  return {
    board, rows: [3,4,5,4,3], turnSeat: 0, dice: null,
    log: ["Set-up: each player places a settlement and an adjacent road. The order then reverses."],
    phase: "setup", setupOrder: [...order, ...[...order].reverse()], setupIndex: 0, setupStep: "settlement",
    structures: [], roads: [], robberTile: Math.max(0, robberTile), devDeck: createDevDeck(),
    playedDevThisTurn: false, longestRoadSeat: null, largestArmySeat: null, trade: null, winnerSeat: null,
  };
};

export const rollDice = (): [number, number] => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];

const pointKey = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`;

export const getBoardGeometry = (rows: number[] = [3,4,5,4,3]): BoardGeometry => {
  const centers: { x: number; y: number }[] = [];
  const tileVertices: string[][] = [];
  const intersectionMap = new Map<string, GeometryIntersection>();
  const edgeMap = new Map<string, GeometryEdge>();
  let tileIndex = 0;
  const max = Math.max(...rows);
  rows.forEach((count, row) => {
    for (let col = 0; col < count; col += 1) {
      const x = 500 + (col - (count - 1) / 2) * 138;
      const y = 110 + row * 120;
      centers.push({ x, y });
      const verts: string[] = [];
      for (let k = 0; k < 6; k += 1) {
        const angle = (-90 + k * 60) * Math.PI / 180;
        const vx = x + 80 * Math.cos(angle);
        const vy = y + 80 * Math.sin(angle);
        const id = pointKey(vx, vy);
        verts.push(id);
        if (!intersectionMap.has(id)) intersectionMap.set(id, { id, x: Math.round(vx), y: Math.round(vy), tiles: [] });
        intersectionMap.get(id)!.tiles.push(tileIndex);
      }
      for (let k = 0; k < 6; k += 1) {
        const a = verts[k]!, b = verts[(k + 1) % 6]!;
        const id = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edgeMap.has(id)) edgeMap.set(id, { id, a, b, tiles: [] });
        edgeMap.get(id)!.tiles.push(tileIndex);
      }
      tileVertices.push(verts);
      tileIndex += 1;
    }
  });
  return { intersections: [...intersectionMap.values()], edges: [...edgeMap.values()], tileVertices, centers };
};

export const BUILD_COSTS: Record<string, Partial<PlayerHand>> = {
  Road: { lumber: 1, brick: 1 },
  Settlement: { lumber: 1, brick: 1, wool: 1, grain: 1 },
  City: { grain: 2, ore: 3 },
  "Dev card": { wool: 1, grain: 1, ore: 1 },
};

export const canAfford = (hand: PlayerHand, cost: Partial<PlayerHand>) => Object.entries(cost).every(([k, v]) => hand[k as ResourceKey] >= (v ?? 0));
export const pay = (hand: PlayerHand, cost: Partial<PlayerHand>): PlayerHand => {
  const next = { ...hand };
  Object.entries(cost).forEach(([k, v]) => { next[k as ResourceKey] -= v ?? 0; });
  return next;
};

export const adjacentEdges = (geometry: BoardGeometry, intersectionId: string) => geometry.edges.filter((e) => e.a === intersectionId || e.b === intersectionId);
export const edgeTouchesIntersection = (edge: GeometryEdge, id: string) => edge.a === id || edge.b === id;

export const canPlaceSettlement = (state: CatanState, seat: number, intersectionId: string, setup = false) => {
  const g = getBoardGeometry(state.rows);
  if (state.structures.some((s) => s.intersectionId === intersectionId)) return false;
  const touching = adjacentEdges(g, intersectionId);
  if (touching.some((e) => state.structures.some((s) => s.intersectionId === (e.a === intersectionId ? e.b : e.a)))) return false;
  if (setup) return true;
  return touching.some((e) => state.roads.some((r) => r.seat === seat && r.edgeId === e.id));
};

export const canPlaceRoad = (state: CatanState, seat: number, edgeId: string, free = false) => {
  const g = getBoardGeometry(state.rows);
  const edge = g.edges.find((e) => e.id === edgeId);
  if (!edge || state.roads.some((r) => r.edgeId === edgeId)) return false;
  const endpoints = [edge.a, edge.b];
  return endpoints.some((id) => {
    const building = state.structures.find((s) => s.intersectionId === id);
    if (building?.seat === seat) return true;
    if (building && building.seat !== seat) return false;
    return adjacentEdges(g, id).some((e) => state.roads.some((r) => r.seat === seat && r.edgeId === e.id));
  });
};

export const productionForRoll = (state: CatanState, total: number): Map<number, PlayerHand> => {
  const g = getBoardGeometry(state.rows);
  const out = new Map<number, PlayerHand>();
  if (total === 7) return out;
  state.structures.forEach((s) => {
    const intersection = g.intersections.find((i) => i.id === s.intersectionId);
    if (!intersection) return;
    intersection.tiles.forEach((tileIndex) => {
      const tile = state.board[tileIndex];
      if (!tile || tileIndex === state.robberTile || tile.number !== total) return;
      const resource = TERRAIN[tile.terrain].produces;
      if (!resource) return;
      const hand = out.get(s.seat) ?? emptyHand();
      hand[resource] += s.type === "city" ? 2 : 1;
      out.set(s.seat, hand);
    });
  });
  return out;
};

export const setupResourcesForIntersection = (state: CatanState, intersectionId: string): PlayerHand => {
  const g = getBoardGeometry(state.rows);
  const result = emptyHand();
  const intersection = g.intersections.find((i) => i.id === intersectionId);
  intersection?.tiles.forEach((tileIndex) => {
    const resource = TERRAIN[state.board[tileIndex]!.terrain].produces;
    if (resource) result[resource] += 1;
  });
  return result;
};

export const robberTargets = (state: CatanState, tileIndex: number, movingSeat: number): number[] => {
  const g = getBoardGeometry(state.rows);
  const vertices = new Set(g.tileVertices[tileIndex] ?? []);
  return [...new Set(state.structures.filter((s) => s.seat !== movingSeat && vertices.has(s.intersectionId)).map((s) => s.seat))];
};

export const resourceCount = (hand: PlayerHand) => Object.values(hand).reduce((a, b) => a + b, 0);
export const halfDiscardCount = (hand: PlayerHand) => Math.floor(resourceCount(hand) / 2);

export const longestRoadLength = (state: CatanState, seat: number): number => {
  const g = getBoardGeometry(state.rows);
  const roads = state.roads.filter((r) => r.seat === seat).map((r) => g.edges.find((e) => e.id === r.edgeId)!).filter(Boolean);
  if (!roads.length) return 0;
  const opponentBlocks = new Set(state.structures.filter((s) => s.seat !== seat).map((s) => s.intersectionId));
  const byNode = new Map<string, GeometryEdge[]>();
  roads.forEach((e) => [e.a, e.b].forEach((n) => byNode.set(n, [...(byNode.get(n) ?? []), e])));
  const dfs = (node: string, used: Set<string>, length: number): number => {
    if (opponentBlocks.has(node) && length > 0) return length;
    let best = length;
    for (const edge of byNode.get(node) ?? []) {
      if (used.has(edge.id)) continue;
      const next = edge.a === node ? edge.b : edge.a;
      const copy = new Set(used); copy.add(edge.id);
      best = Math.max(best, dfs(next, copy, length + 1));
    }
    return best;
  };
  return Math.max(...[...byNode.keys()].map((n) => dfs(n, new Set(), 0)));
};

export const publicVictoryPoints = (state: CatanState, seat: number) => {
  const pieces = state.structures.filter((s) => s.seat === seat).reduce((sum, s) => sum + (s.type === "city" ? 2 : 1), 0);
  return pieces + (state.longestRoadSeat === seat ? 2 : 0) + (state.largestArmySeat === seat ? 2 : 0);
};