import { createFileRoute } from "@tanstack/react-router";
import { CatanBoard } from "@/components/CatanBoard";
import { PixelButton, PixelPanel, PixelStrip, PixelTag } from "@/components/pixel";
import { QrCode } from "@/components/QrCode";
import { useRoom } from "@/hooks/useRoom";
import { supabase } from "@/integrations/supabase/client";
import type { CatanState, PlayerHand } from "@/lib/catan";
import { createCatanState, emptyHand, publicVictoryPoints } from "@/lib/catan";
import { colorClass } from "@/lib/games";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/room/$code")({
  head: () => ({
    meta: [
      { title: "Shared Board — TableQuest" },
      {
        name: "description",
        content:
          "The shared game screen: board, room code, QR code and every player's public status.",
      },
      { property: "og:title", content: "Shared Board — TableQuest" },
      {
        property: "og:description",
        content: "Put this screen on the TV and let everyone join from their phone.",
      },
    ],
  }),
  component: RoomScreen,
});

function RoomScreen() {
  const { code } = Route.useParams();
  const { room, players, loading, notFound } = useRoom(code);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${code}`
      : `/join?code=${code}`;

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center font-display text-xs pixel-blink">
        Loading table…
      </div>
    );
  }

  if (notFound || !room) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <PixelPanel large className="text-center">
          <h1 className="text-base">No table {code}</h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            That room has closed or the code is wrong.
          </p>
        </PixelPanel>
      </div>
    );
  }

  const state = room.state as unknown as CatanState;
  const playing = room.status === "playing";
  const current = players.find((p) => p.seat === state?.turnSeat);

  const startGame = async () => {
    const fresh = createCatanState(players.length);
    const { error } = await supabase
      .from("rooms")
      .update({ status: "playing", state: fresh })
      .eq("id", room.id);
    if (error) console.error("Could not start game:", error);
  };

  const goToNewGame = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="flex items-center justify-between gap-3 border-b-3 border-foreground bg-card px-5 py-3">
        <span className="font-display text-xs">TABLEQUEST</span>
        <span className="font-display text-[10px] uppercase text-muted-foreground">
          {playing ? "Catan · in play" : "Catan · waiting room"}
        </span>
        <div className="flex items-center gap-3">
          <PixelButton size="sm" variant="ghost" onClick={goToNewGame}>
            New game
          </PixelButton>
          <span className="font-display text-[10px]">
            ROOM <span className="text-pixel-red">{room.code}</span>
          </span>
        </div>
      </header>
      <PixelStrip />

      {!playing ? (
        <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.1fr_1fr]">
          <PixelPanel large className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-lg">Scan to join</h1>
            <QrCode value={joinUrl} size={230} />
            <div>
              <p className="font-display text-[10px] uppercase text-muted-foreground">
                or enter code
              </p>
              <p className="mt-2 font-display text-6xl tracking-[0.15em] text-pixel-red">
                {room.code}
              </p>
            </div>
            <p className="font-mono text-sm text-muted-foreground">{joinUrl}</p>
          </PixelPanel>

          <PixelPanel large className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base">Players</h2>
              <PixelTag tone="warn">{players.length} / 4</PixelTag>
            </div>
            <ul className="grid gap-3">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 border-3 border-foreground bg-background px-3 py-3"
                >
                  <span
                    className={cn("size-6 border-2 border-foreground", colorClass[p.color])}
                  />
                  <span className="flex-1 font-mono text-lg">{p.name}</span>
                  {p.is_host ? <PixelTag>Host</PixelTag> : null}
                  <PixelTag tone={p.ready ? "live" : "muted"}>
                    {p.ready ? "Ready" : "Waiting"}
                  </PixelTag>
                </li>
              ))}
              {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, i) => (
                <li
                  key={`empty-${i}`}
                  className="border-3 border-dashed border-foreground/40 px-3 py-3 font-mono text-sm text-muted-foreground"
                >
                  Empty seat
                </li>
              ))}
            </ul>
            <PixelButton
              size="lg"
              disabled={players.length < 3}
              onClick={startGame}
              className="mt-auto"
            >
              {players.length < 3 ? "Need 3+ players" : "Start game"}
            </PixelButton>
          </PixelPanel>
        </main>
      ) : (
        <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-5">
            <CatanBoard state={state} />
          </div>
          <div className="grid content-start gap-5">
            <PixelPanel large>
              <h2 className="text-sm">Turn</h2>
              <p className="mt-3 font-display text-2xl text-pixel-red">
                {current?.name ?? "—"}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Die value={state.dice?.[0] ?? null} />
                <Die value={state.dice?.[1] ?? null} />
                <span className="font-display text-sm">
                  {state.dice ? state.dice[0] + state.dice[1] : "--"}
                </span>
              </div>
            </PixelPanel>

            <PixelPanel large>
              <h2 className="text-sm">Settlers</h2>
              <ul className="mt-4 grid gap-3">
                {players.map((p) => {
                  const hand =
                    ((p.private_state as { hand?: PlayerHand })?.hand ?? emptyHand());
                  const cards = Object.values(hand).reduce((a, b) => a + b, 0);
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 border-3 border-foreground px-3 py-2",
                        p.seat === state.turnSeat ? "bg-primary/30" : "bg-background",
                      )}
                    >
                      <span
                        className={cn(
                          "size-5 border-2 border-foreground",
                          colorClass[p.color],
                        )}
                      />
                      <span className="flex-1 font-mono">{p.name}</span>
                      <span className="font-display text-[10px]">{cards} cards · {publicVictoryPoints(state, p.seat)} VP</span>
                    </li>
                  );
                })}
              </ul>
            </PixelPanel>

            <PixelPanel large>
              <h2 className="text-sm">Log</h2>
              <ul className="mt-3 grid gap-2 font-mono text-sm text-muted-foreground">
                {[...(state.log ?? [])].slice(-6).reverse().map((line, i) => (
                  <li key={i}>› {line}</li>
                ))}
              </ul>
            </PixelPanel>
          </div>
        </main>
      )}
    </div>
  );
}

function Die({ value }: { value: number | null }) {
  return (
    <span className="grid size-12 place-items-center border-3 border-foreground bg-card font-display text-lg">
      {value ?? "-"}
    </span>
  );
}
