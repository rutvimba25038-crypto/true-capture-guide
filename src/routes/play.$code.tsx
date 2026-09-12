import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PixelButton, PixelPanel, PixelTag } from "@/components/pixel";
import { useRoom } from "@/hooks/useRoom";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILD_COSTS,
  canAfford,
  emptyHand,
  pay,
  production,
  RESOURCES,
  rollDice,
  TERRAIN,
  type CatanState,
  type PlayerHand,
} from "@/lib/catan";
import { colorClass } from "@/lib/games";
import { getLocalPlayerId, type Player } from "@/lib/room";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — TableQuest" },
      {
        name: "description",
        content:
          "Your private player dashboard: resources, dice and build actions, visible only to you.",
      },
      { property: "og:title", content: "Your Dashboard — TableQuest" },
      {
        property: "og:description",
        content: "Play from your phone while the board stays on the shared screen.",
      },
    ],
  }),
  component: PlayScreen,
});

function PlayScreen() {
  const { code } = Route.useParams();
  const { room, players, loading, notFound } = useRoom(code);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const myId = getLocalPlayerId(code);
  const me = players.find((p) => p.id === myId) ?? null;

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center font-display text-xs pixel-blink">
        Connecting…
      </div>
    );
  }

  if (notFound || !room) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <PixelPanel large>
          <h1 className="text-base">Table {code} is gone</h1>
          <Link to="/join" className="mt-4 inline-block font-mono underline">
            Join another table
          </Link>
        </PixelPanel>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <PixelPanel large>
          <h1 className="text-base">You're not seated</h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Join table {code} to get your private dashboard.
          </p>
          <Link
            to="/join"
            search={{ code }}
            className="mt-4 inline-block font-mono underline"
          >
            Take a seat
          </Link>
        </PixelPanel>
      </div>
    );
  }

  const state = room.state as unknown as CatanState;
  const hand = ((me.private_state as { hand?: PlayerHand })?.hand ??
    emptyHand()) as PlayerHand;
  const myTurn = room.status === "playing" && state.turnSeat === me.seat;

  const saveHand = async (player: Player, next: PlayerHand) => {
    const { error } = await supabase
      .from("players")
      .update({ private_state: { ...player.private_state, hand: next } })
      .eq("id", player.id);
    if (error) throw error;
  };

  const pushLog = async (line: string, patch: Partial<CatanState> = {}) => {
    const { error } = await supabase
      .from("rooms")
      .update({
        state: { ...state, ...patch, log: [...(state.log ?? []), line].slice(-40) },
      })
      .eq("id", room.id);
    if (error) throw error;
  };

  const toggleReady = async () => {
    await supabase.from("players").update({ ready: !me.ready }).eq("id", me.id);
  };

  const doRoll = async () => {
    // Guard the action here too; the button state alone is not enough.
    if (!myTurn || busy || state.dice != null) return;

    setBusy(true);
    setNote(null);

    try {
      const dice = rollDice();
      const total = dice[0] + dice[1];
      const gained = production(state.board, total);

      await Promise.all(
        players.map((p) => {
          const h = ((p.private_state as { hand?: PlayerHand })?.hand ??
            emptyHand()) as PlayerHand;
          const next = { ...h };
          gained.forEach((r) => {
            next[r] += 1;
          });
          return saveHand(p, next);
        }),
      );

      await pushLog(
        total === 7
          ? `${me.name} rolled 7 — the robber stirs.`
          : `${me.name} rolled ${total}. ${gained.length} tile(s) produced.`,
        { dice },
      );
    } catch (err) {
      console.error("Could not roll dice:", err);
      setNote(
        err instanceof Error
          ? `Could not roll dice: ${err.message}`
          : "Could not roll dice. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const build = async (what: string) => {
    const cost = BUILD_COSTS[what]!;
    if (!canAfford(hand, cost)) {
      setNote(`Not enough resources for a ${what.toLowerCase()}.`);
      return;
    }
    setBusy(true);
    setNote(null);
    await saveHand(me, pay(hand, cost));
    await pushLog(`${me.name} built a ${what.toLowerCase()}.`);
    setBusy(false);
  };

  const endTurn = async () => {
    setBusy(true);
    const nextSeat = (state.turnSeat + 1) % players.length;
    const nextPlayer = players.find((p) => p.seat === nextSeat);
    await pushLog(`Turn passes to ${nextPlayer?.name ?? "the next settler"}.`, {
      turnSeat: nextSeat,
      dice: null,
    });
    setBusy(false);
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="flex items-center justify-between border-b-3 border-foreground bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-5 border-2 border-foreground", colorClass[me.color])} />
          <span className="font-display text-[11px]">{me.name}</span>
        </div>
        <span className="font-display text-[10px] text-muted-foreground">
          ROOM {room.code}
        </span>
      </header>

      <main className="mx-auto grid max-w-md gap-5 px-4 py-6">
        {room.status === "lobby" ? (
          <PixelPanel large className="grid gap-4 text-center">
            <h1 className="text-sm">Waiting room</h1>
            <p className="font-mono text-sm text-muted-foreground">
              The host starts the game from the big screen.
            </p>
            <PixelButton onClick={toggleReady} variant={me.ready ? "ghost" : "primary"}>
              {me.ready ? "I'm not ready" : "I'm ready"}
            </PixelButton>
            <ul className="grid gap-2 text-left">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 border-3 border-foreground px-3 py-2"
                >
                  <span
                    className={cn("size-4 border-2 border-foreground", colorClass[p.color])}
                  />
                  <span className="flex-1 font-mono text-sm">{p.name}</span>
                  <PixelTag tone={p.ready ? "live" : "muted"}>
                    {p.ready ? "Ready" : "…"}
                  </PixelTag>
                </li>
              ))}
            </ul>
          </PixelPanel>
        ) : (
          <>
            <PixelPanel
              large
              className={cn("text-center", myTurn ? "bg-primary/30" : "")}
            >
              <p className="font-display text-[10px] uppercase text-muted-foreground">
                {myTurn ? "Your turn" : "Waiting"}
              </p>
              <p className="mt-2 font-display text-lg">
                {myTurn
                  ? state.dice
                    ? `You rolled ${state.dice[0] + state.dice[1]}`
                    : "Roll the dice"
                  : (players.find((p) => p.seat === state.turnSeat)?.name ?? "—") +
                    " is playing"}
              </p>
            </PixelPanel>

            <PixelPanel large>
              <h2 className="text-sm">Your hand</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Private — only this phone sees it.
              </p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {RESOURCES.map((r) => (
                  <div
                    key={r.key}
                    className="border-3 border-foreground bg-background text-center"
                  >
                    <div className={cn("h-6 border-b-3 border-foreground", TERRAIN[r.tile].className)} />
                    <div className="py-2 font-display text-sm">{hand[r.key]}</div>
                    <div className="pb-2 font-mono text-[10px] text-muted-foreground">
                      {r.label}
                    </div>
                  </div>
                ))}
              </div>
            </PixelPanel>

            <PixelPanel large className="grid gap-3">
              <h2 className="text-sm">Actions</h2>
              <PixelButton
                size="lg"
                disabled={!myTurn || busy || state.dice != null}
                onClick={doRoll}
              >
                Roll dice
              </PixelButton>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(BUILD_COSTS).map((what) => (
                  <PixelButton
                    key={what}
                    variant="ghost"
                    disabled={!myTurn || busy}
                    onClick={() => build(what)}
                  >
                    {what}
                  </PixelButton>
                ))}
              </div>
              <PixelButton
                variant="dark"
                disabled={!myTurn || busy}
                onClick={endTurn}
              >
                End turn
              </PixelButton>
              {note ? (
                <p className="border-3 border-foreground bg-pixel-red/20 p-2 font-mono text-sm">
                  {note}
                </p>
              ) : null}
            </PixelPanel>
          </>
        )}
      </main>
    </div>
  );
}
