import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PixelButton, PixelPanel, PixelTag } from "@/components/pixel";
import { SiteHeader } from "@/components/SiteHeader";
import { GAMES } from "@/lib/games";
import { createRoom, joinRoom } from "@/lib/room";

export const Route = createFileRoute("/host")({
  head: () => ({
    meta: [
      { title: "Host a Game — TableQuest" },
      {
        name: "description",
        content:
          "Pick a board game and open a table. Your screen shows the board, everyone else plays from their phone.",
      },
      { property: "og:title", content: "Host a Game — TableQuest" },
      {
        property: "og:description",
        content: "Choose a game and open a table for your friends in seconds.",
      },
    ],
  }),
  component: HostPage,
});

function HostPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostName, setHostName] = useState("");

  const start = async (gameId: string) => {
    setBusy(gameId);
    setError(null);
    try {
      const room = await createRoom(gameId);
      await joinRoom(room, hostName.trim() || "Host");
      navigate({ to: "/room/$code", params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open a table.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader label="Host" />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-xl">Choose a game</h1>
        <p className="mt-3 max-w-xl font-mono text-sm text-muted-foreground">
          This device becomes the shared board. Everyone else joins from their phone
          with the code you get next.
        </p>

        <PixelPanel className="mt-6 grid gap-2 sm:max-w-sm">
          <span className="font-display text-[10px] uppercase">Your name</span>
          <input
            value={hostName}
            onChange={(e) => setHostName(e.target.value.slice(0, 14))}
            placeholder="Host"
            className="border-3 border-foreground bg-background px-3 py-2 font-mono outline-none focus:bg-primary/20"
          />
        </PixelPanel>

        {error ? (
          <p className="mt-4 border-3 border-foreground bg-pixel-red/20 p-3 font-mono text-sm">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {GAMES.map((game) => (
            <PixelPanel
              key={game.id}
              className={game.status === "soon" ? "opacity-70" : ""}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-sm">{game.name}</h2>
                <PixelTag tone={game.status === "available" ? "live" : "muted"}>
                  {game.status === "available" ? "Available" : "Soon"}
                </PixelTag>
              </div>
              <p className="mt-3 min-h-12 font-mono text-sm text-muted-foreground">
                {game.tagline}
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {game.minPlayers}–{game.maxPlayers} players · {game.duration}
              </p>
              <PixelButton
                className="mt-4 w-full"
                variant={game.status === "available" ? "primary" : "ghost"}
                disabled={game.status !== "available" || busy !== null}
                onClick={() => start(game.id)}
              >
                {busy === game.id
                  ? "Opening…"
                  : game.status === "available"
                    ? "Host game"
                    : "In development"}
              </PixelButton>
            </PixelPanel>
          ))}
        </div>
      </main>
    </div>
  );
}
