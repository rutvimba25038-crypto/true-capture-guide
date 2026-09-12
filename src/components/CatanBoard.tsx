import { TERRAIN, type CatanState } from "@/lib/catan";
import { cn } from "@/lib/utils";

/**
 * Shared-screen board. Classic CATAN styling: parchment sea, terrain hexes,
 * circular number tokens with red pips on 6 and 8.
 */
export function CatanBoard({ state }: { state: CatanState }) {
  const rows = state.rows ?? [3, 4, 5, 4, 3];
  let index = 0;
  const grouped = rows.map((count) => {
    const slice = state.board.slice(index, index + count);
    index += count;
    return slice;
  });

  return (
    <div className="border-4 border-foreground bg-catan-sea p-6 shadow-[8px_8px_0_0_var(--foreground)]">
      <div className="flex flex-col items-center gap-1 rounded-none bg-catan-parchment/20 py-4">
        {grouped.map((row, r) => (
          <div key={r} className="-my-3 flex gap-1">
            {row.map((tile, i) => {
              const hot = tile.number === 6 || tile.number === 8;
              return (
                <div
                  key={`${r}-${i}`}
                  className={cn(
                    "hex-tile grid h-24 w-22 place-items-center sm:h-28 sm:w-26 lg:h-32 lg:w-30",
                    TERRAIN[tile.terrain].className,
                  )}
                >
                  {tile.number ? (
                    <div className="grid size-10 place-items-center rounded-full border-2 border-foreground bg-catan-parchment lg:size-12">
                      <span
                        className={cn(
                          "font-display text-[11px] lg:text-sm",
                          hot ? "text-pixel-red" : "text-foreground",
                        )}
                      >
                        {tile.number}
                      </span>
                    </div>
                  ) : (
                    <span className="font-display text-[9px] text-foreground/70">
                      DESERT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
