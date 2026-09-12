import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { PixelButton, PixelPanel } from "@/components/pixel";
import { SiteHeader } from "@/components/SiteHeader";
import { getRoomByCode, joinRoom } from "@/lib/room";

type JoinSearch = { code?: string };

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): JoinSearch => ({
    code: typeof search["code"] === "string" ? search["code"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Join a Game — TableQuest" },
      {
        name: "description",
        content:
          "Scan the QR code or type the 4-digit room code to join a game from your phone.",
      },
      { property: "og:title", content: "Join a Game — TableQuest" },
      {
        property: "og:description",
        content: "Enter a room code and turn your phone into your player dashboard.",
      },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const search = useSearch({ from: "/join" });
  const navigate = useNavigate();
  const [code, setCode] = useState(search.code ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const room = await getRoomByCode(code.trim());
      if (!room) throw new Error("No table found with that code.");
      if (room.status !== "lobby")
        throw new Error("That game has already started.");
      await joinRoom(room, name.trim() || "Player");
      navigate({ to: "/play/$code", params: { code: room.code } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader label="Join" />
      <main className="mx-auto grid max-w-md gap-6 px-4 py-12">
        <h1 className="text-center text-xl">Join a game</h1>
        <PixelPanel large className="grid gap-5">
          <form onSubmit={submit} className="grid gap-5">
            <label className="grid gap-2">
              <span className="font-display text-[10px] uppercase">Room code</span>
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                placeholder="4827"
                className="border-3 border-foreground bg-background px-4 py-4 text-center font-display text-3xl tracking-[0.3em] outline-none focus:bg-primary/20"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-display text-[10px] uppercase">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 14))}
                placeholder="Rutvi"
                className="border-3 border-foreground bg-background px-4 py-3 font-mono text-lg outline-none focus:bg-primary/20"
              />
            </label>
            {error ? (
              <p className="border-3 border-foreground bg-pixel-red/20 p-3 font-mono text-sm">
                {error}
              </p>
            ) : null}
            <PixelButton
              type="submit"
              size="lg"
              disabled={busy || code.length !== 4}
            >
              {busy ? "Joining…" : "Take a seat"}
            </PixelButton>
          </form>
        </PixelPanel>
        <p className="text-center font-mono text-sm text-muted-foreground">
          The code is on the big screen. Private cards stay on your phone.
        </p>
      </main>
    </div>
  );
}
