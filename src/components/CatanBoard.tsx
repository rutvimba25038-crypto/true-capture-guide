import { getBoardGeometry, type CatanState } from "@/lib/catan";

type Props = {
  state: CatanState;
  interactive?: boolean;
  onIntersection?: (id: string) => void;
  onEdge?: (id: string) => void;
  onTile?: (index: number) => void;
  seatColors?: Record<number, string>;
  highlightedIntersections?: string[];
  highlightedEdges?: string[];
};

const terrainFill: Record<string, string> = {
  forest: "#4f7f42", hill: "#b65b3d", pasture: "#88b65c", field: "#e1b94b",
  mountain: "#85878b", desert: "#d7a96b",
};
const playerFill = (seat: number, colors?: Record<number, string>) => colors?.[seat] ?? ["#e05252","#4d83d8","#e0b43e","#58a56a"][seat % 4]!;

export function CatanBoard({ state, interactive = false, onIntersection, onEdge, onTile, seatColors, highlightedIntersections = [], highlightedEdges = [] }: Props) {
  const geometry = getBoardGeometry(state.rows);
  const pointsForTile = (index: number) => (geometry.tileVertices[index] ?? []).map((id) => {
    const p = geometry.intersections.find((i) => i.id === id)!;
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="overflow-auto border-4 border-foreground bg-catan-sea p-2 shadow-[8px_8px_0_0_var(--foreground)]">
      <svg viewBox="0 0 1000 700" className="min-w-[680px] w-full" role="img" aria-label="Catan board">
        <rect width="1000" height="700" fill="#7bb9d8" />
        {state.board.map((tile, index) => {
          const center = geometry.centers[index]!;
          const hot = tile.number === 6 || tile.number === 8;
          return (
            <g key={index} onClick={() => interactive && onTile?.(index)} className={interactive && onTile ? "cursor-pointer" : ""}>
              <polygon points={pointsForTile(index)} fill={terrainFill[tile.terrain]} stroke="#242424" strokeWidth="4" />
              {tile.number ? <>
                <circle cx={center.x} cy={center.y} r="24" fill="#f3e7c8" stroke="#242424" strokeWidth="3" />
                <text x={center.x} y={center.y + 7} textAnchor="middle" fontSize="22" fontWeight="700" fill={hot ? "#d94a4a" : "#242424"}>{tile.number}</text>
              </> : <text x={center.x} y={center.y + 5} textAnchor="middle" fontSize="14" fontWeight="700">DESERT</text>}
              {state.robberTile === index && <text x={center.x} y={center.y - 34} textAnchor="middle" fontSize="28">🦹</text>}
            </g>
          );
        })}
        {geometry.edges.map((edge) => {
          const a = geometry.intersections.find((i) => i.id === edge.a)!;
          const b = geometry.intersections.find((i) => i.id === edge.b)!;
          const road = state.roads.find((r) => r.edgeId === edge.id);
          return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={road ? playerFill(road.seat, seatColors) : highlightedEdges.includes(edge.id) ? "#ffffff" : "rgba(36,36,36,.16)"} strokeWidth={road ? 12 : highlightedEdges.includes(edge.id) ? 10 : 5}
            strokeLinecap="round" onClick={() => interactive && onEdge?.(edge.id)} className={interactive && onEdge ? "cursor-pointer" : ""} />;
        })}
        {geometry.intersections.map((point) => {
          const building = state.structures.find((s) => s.intersectionId === point.id);
          return <g key={point.id} onClick={() => interactive && onIntersection?.(point.id)} className={interactive && onIntersection ? "cursor-pointer" : ""}>
            {building ? building.type === "city"
              ? <rect x={point.x - 13} y={point.y - 13} width="26" height="26" rx="3" fill={playerFill(building.seat, seatColors)} stroke="#242424" strokeWidth="4" />
              : <circle cx={point.x} cy={point.y} r="11" fill={playerFill(building.seat, seatColors)} stroke="#242424" strokeWidth="4" />
              : <circle cx={point.x} cy={point.y} r={highlightedIntersections.includes(point.id) ? 13 : interactive ? 7 : 4} fill={highlightedIntersections.includes(point.id) ? "#ffffff" : "rgba(255,255,255,.45)"} stroke={highlightedIntersections.includes(point.id) ? "#e0b43e" : "#242424"} strokeWidth={highlightedIntersections.includes(point.id) ? 5 : 2} />}
          </g>;
        })}
      </svg>
    </div>
  );
}