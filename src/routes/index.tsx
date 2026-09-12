import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-pixel.jpg";
import { PixelButton, PixelPanel, PixelStrip, PixelTag } from "@/components/pixel";
import { SiteHeader } from "@/components/SiteHeader";
import { GAMES } from "@/lib/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TableQuest — One shared board, everyone on their phone" },
      {
        name: "description",
        content:
          "Play board games together in person: the big screen shows the board, each friend plays from their own phone. CATAN available now.",
      },
      {
        property: "og:title",
        content: "TableQuest — One shared board, everyone on their phone",
      },
      {
        property: "og:description",
        content:
          "Host a table on any screen, friends join by QR or 4-digit code. CATAN available now.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    n: "1",
    title: "Open a table",
    body: "Any laptop, TV or tablet becomes the shared board.",
  },
  {
    n: "2",
    title: "Everyone joins",
    body: "Scan the QR code or punch in the 4-digit room code.",
  },
  {
    n: "3",
    title: "Play in person",
    body: "Public board on the screen, your cards stay on your phone.",
  },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PixelStrip />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <PixelTag tone="live">Now playing · CATAN</PixelTag>
            <h1 className="mt-5 text-2xl leading-snug sm:text-3xl">
              One shared board. Everyone plays from their own phone.
            </h1>
            <p className="mt-5 max-w-md font-mono text-base text-muted-foreground">
              Put the board on the big screen, hand nobody a rulebook. Resources,
              cards and secret moves live in each player's pocket.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/host">
                <PixelButton size="lg">Host a game</PixelButton>
              </Link>
              <Link to="/join">
                <PixelButton size="lg" variant="ghost">
                  Join a game
                </PixelButton>
              </Link>
            </div>
          </div>
          <div className="border-4 border-foreground bg-card p-2 shadow-[8px_8px_0_0_var(--foreground)]">
            <img
              src={heroImage}
              alt="Pixel art of four friends around a table, the board on a TV and each player holding a phone"
              width={1280}
              height={896}
              className="w-full [image-rendering:pixelated]"
            />
          </div>
        </section>

        <PixelStrip />

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-lg">How it works</h2>
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <PixelPanel key={step.n}>
                <span className="grid size-9 place-items-center border-3 border-foreground bg-primary font-display text-sm">
                  {step.n}
                </span>
                <h3 className="mt-4 font-display text-xs">{step.title}</h3>
                <p className="mt-3 font-mono text-sm text-muted-foreground">
                  {step.body}
                </p>
              </PixelPanel>
            ))}
          </div>
        </section>

        <PixelStrip />

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg">Game shelf</h2>
            <p className="font-mono text-sm text-muted-foreground">
              New games in development.
            </p>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            {GAMES.map((game) => (
              <PixelPanel
                key={game.id}
                className={game.status === "soon" ? "opacity-70" : ""}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm">{game.name}</h3>
                  <PixelTag tone={game.status === "available" ? "live" : "muted"}>
                    {game.status === "available" ? "Play now" : "Soon"}
                  </PixelTag>
                </div>
                <p className="mt-3 min-h-12 font-mono text-sm text-muted-foreground">
                  {game.tagline}
                </p>
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  {game.minPlayers}–{game.maxPlayers} players · {game.duration}
                </p>
                {game.status === "available" ? (
                  <Link to="/host" className="mt-4 block">
                    <PixelButton className="w-full">Play now</PixelButton>
                  </Link>
                ) : (
                  <PixelButton className="mt-4 w-full" variant="ghost" disabled>
                    In development
                  </PixelButton>
                )}
              </PixelPanel>
            ))}
          </div>
        </section>
      </main>

      <PixelStrip />
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8">
        <span className="font-display text-[10px]">TABLEQUEST</span>
        <span className="font-mono text-sm text-muted-foreground">
          Board games for friends in the same room.
        </span>
      </footer>
    </div>
  );
}
