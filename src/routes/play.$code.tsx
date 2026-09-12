import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CatanBoard } from "@/components/CatanBoard";
import { PixelButton, PixelPanel, PixelTag } from "@/components/pixel";
import { useRoom } from "@/hooks/useRoom";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILD_COSTS, canAfford, canPlaceRoad, canPlaceSettlement, emptyHand, emptyOffer,
  halfDiscardCount, longestRoadLength, pay, productionForRoll, publicVictoryPoints,
  RESOURCES, resourceCount, robberTargets, rollDice, setupResourcesForIntersection,
  TERRAIN, type CatanState, type DevCard, type PlayerHand,
} from "@/lib/catan";
import { colorClass } from "@/lib/games";
import { getLocalPlayerId, type Player } from "@/lib/room";
import { cn } from "@/lib/utils";

type DevEntry = { card: DevCard; fresh?: boolean };
type ActionMode = "road" | "settlement" | "city" | "robber" | null;
const devLabel: Record<DevCard, string> = {
  knight: "Knight", roadBuilding: "Road Building", yearOfPlenty: "Year of Plenty",
  monopoly: "Monopoly", victoryPoint: "Victory Point",
};

export const Route = createFileRoute("/play/$code")({ component: PlayScreen });

function PlayScreen() {
  const { code } = Route.useParams();
  const { room, players, loading, notFound } = useRoom(code);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mode, setMode] = useState<ActionMode>(null);
  const [discard, setDiscard] = useState<PlayerHand>(emptyHand());
  const [bankGive, setBankGive] = useState<keyof PlayerHand>("lumber");
  const [bankGet, setBankGet] = useState<keyof PlayerHand>("brick");
  const [tradeTo, setTradeTo] = useState<number>(0);
  const [tradeGive, setTradeGive] = useState<keyof PlayerHand>("lumber");
  const [tradeWant, setTradeWant] = useState<keyof PlayerHand>("brick");
  const [tradeGiveQty, setTradeGiveQty] = useState(1);
  const [tradeWantQty, setTradeWantQty] = useState(1);
  const [devResource, setDevResource] = useState<keyof PlayerHand>("lumber");
  const [devResource2, setDevResource2] = useState<keyof PlayerHand>("brick");

  const myId = getLocalPlayerId(code);
  const me = players.find((p) => p.id === myId) ?? null;

  if (loading) return <div className="grid min-h-screen place-items-center font-display text-xs pixel-blink">Connecting…</div>;
  if (notFound || !room) return <div className="grid min-h-screen place-items-center px-4"><PixelPanel large><h1>Table {code} is gone</h1><Link to="/join" className="underline">Join another table</Link></PixelPanel></div>;
  if (!me) return <div className="grid min-h-screen place-items-center px-4"><PixelPanel large><h1>You're not seated</h1><Link to="/join" search={{ code }} className="underline">Take a seat</Link></PixelPanel></div>;

  const state = room.state as unknown as CatanState;
  const hand = ((me.private_state as { hand?: PlayerHand }).hand ?? emptyHand()) as PlayerHand;
  const devCards = (((me.private_state as { devCards?: DevEntry[] }).devCards ?? []) as DevEntry[]);
  const knightsPlayed = Number((me.private_state as { knightsPlayed?: number }).knightsPlayed ?? 0);
  const myTurn = room.status === "playing" && state.turnSeat === me.seat && state.phase !== "game-over";
  const activeName = players.find((p) => p.seat === state.turnSeat)?.name ?? "—";
  const seatColors = Object.fromEntries(players.map((p) => [p.seat, p.color]));
  const privateState = (player: Player) => player.private_state as { hand?: PlayerHand; devCards?: DevEntry[]; knightsPlayed?: number };

  const updateRoom = async (next: CatanState) => {
    const { error } = await supabase.from("rooms").update({ state: next }).eq("id", room.id);
    if (error) throw error;
  };
  const savePlayer = async (player: Player, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("players").update({ private_state: { ...player.private_state, ...patch } }).eq("id", player.id);
    if (error) throw error;
  };
  const logState = (patch: Partial<CatanState>, line: string): CatanState => ({
    ...state, ...patch, log: [...(state.log ?? []), line].slice(-60),
  });

  const toggleReady = async () => {
    await supabase.from("players").update({ ready: !me.ready }).eq("id", me.id);
  };
  const goToNewGame = () => { window.location.href = "/"; };

  const refreshAwards = (base: CatanState): CatanState => {
    const lengths = players.map((p) => ({ seat: p.seat, len: longestRoadLength(base, p.seat) }));
    const currentLen = base.longestRoadSeat == null ? 0 : (lengths.find((x) => x.seat === base.longestRoadSeat)?.len ?? 0);
    const leader = lengths.reduce((best, x) => x.len > best.len ? x : best, { seat: -1, len: 0 });
    let longestRoadSeat = base.longestRoadSeat;
    if (leader.len >= 5 && leader.len > currentLen) longestRoadSeat = leader.seat;
    if (longestRoadSeat != null && (lengths.find((x) => x.seat === longestRoadSeat)?.len ?? 0) < 5) {
      const tied = lengths.filter((x) => x.len === Math.max(...lengths.map((z) => z.len)) && x.len >= 5);
      longestRoadSeat = tied.length === 1 ? tied[0]!.seat : null;
    }
    const armies = players.map((p) => ({ seat: p.seat, n: Number(privateState(p).knightsPlayed ?? 0) }));
    const currentArmy = base.largestArmySeat == null ? 0 : (armies.find((x) => x.seat === base.largestArmySeat)?.n ?? 0);
    const armyLeader = armies.reduce((best, x) => x.n > best.n ? x : best, { seat: -1, n: 0 });
    let largestArmySeat = base.largestArmySeat;
    if (armyLeader.n >= 3 && armyLeader.n > currentArmy) largestArmySeat = armyLeader.seat;
    return { ...base, longestRoadSeat, largestArmySeat };
  };

  const checkWin = async (next: CatanState, player = me, cards = devCards) => {
    const points = publicVictoryPoints(next, player.seat) + cards.filter((c) => c.card === "victoryPoint").length;
    if (points >= 10) {
      await updateRoom(logState({ ...next, phase: "game-over", winnerSeat: player.seat }, `${player.name} wins with ${points} victory points!`));
      return true;
    }
    return false;
  };

  const doRoll = async () => {
    if (!myTurn || busy || state.dice != null || state.phase !== "play") return;
    setBusy(true); setNote(null);
    try {
      const dice = rollDice(); const total = dice[0] + dice[1];
      if (total === 7) {
        const needsDiscard = players.some((p) => halfDiscardCount((privateState(p).hand ?? emptyHand()) as PlayerHand) > 0);
        const next = logState({ dice, phase: needsDiscard ? "robber-discard" : "robber-move", robberDiscardedSeats: [], robberPendingTile: null, robberTargetSeats: [] }, needsDiscard ? `${me.name} rolled 7. Players with more than 7 cards must discard half.` : `${me.name} rolled 7. Move the robber.`);
        await updateRoom(next);
      } else {
        const gains = productionForRoll(state, total);
        await Promise.all(players.map(async (p) => {
          const gain = gains.get(p.seat); if (!gain) return;
          const h = (privateState(p).hand ?? emptyHand()) as PlayerHand;
          const next = { ...h }; RESOURCES.forEach((r) => { next[r.key] += gain[r.key]; });
          await savePlayer(p, { hand: next });
        }));
        await updateRoom(logState({ dice }, `${me.name} rolled ${total}.`));
      }
    } catch (err) { setNote(err instanceof Error ? err.message : "Could not roll dice."); }
    finally { setBusy(false); }
  };

  const selectBuild = async (what: string) => {
    if (!myTurn || busy || state.phase !== "play") return;
    if (what === "Dev card") {
      if (!canAfford(hand, BUILD_COSTS[what]!)) return setNote("Not enough resources.");
      const card = state.devDeck[0]; if (!card) return setNote("The development deck is empty.");
      const cards = [...devCards, { card, fresh: card !== "victoryPoint" }];
      await savePlayer(me, { hand: pay(hand, BUILD_COSTS[what]!), devCards: cards });
      await updateRoom(logState({ devDeck: state.devDeck.slice(1) }, `${me.name} bought a development card.`));
      await checkWin({ ...state, devDeck: state.devDeck.slice(1) }, me, cards);
      return;
    }
    if (!canAfford(hand, BUILD_COSTS[what]!)) return setNote(`Not enough resources for a ${what.toLowerCase()}.`);
    setMode(what.toLowerCase() as ActionMode);
    setNote(`Select a legal ${what.toLowerCase()} location on the board.`);
  };

  const placeIntersection = async (id: string) => {
    if (!myTurn || busy) return;
    const setup = state.phase === "setup";
    const wantsSettlement = (setup && state.setupStep === "settlement") || (!setup && mode === "settlement");
    if (wantsSettlement) {
      if (!canPlaceSettlement(state, me.seat, id, setup)) return setNote("You cannot build a settlement there.");
      if (state.structures.filter((s) => s.seat === me.seat && s.type === "settlement").length >= 5 && !setup) return setNote("You have no settlement pieces left.");
      const secondSetup = setup && state.setupIndex >= players.length;
      const nextStructures = [...state.structures, { intersectionId: id, seat: me.seat, type: "settlement" as const }];
      if (!setup && !canAfford(hand, BUILD_COSTS.Settlement)) return setNote("Not enough resources.");
      if (!setup) await savePlayer(me, { hand: pay(hand, BUILD_COSTS.Settlement) });
      if (setup) {
        if (secondSetup) {
          const gain = setupResourcesForIntersection(state, id); const nextHand = { ...hand };
          RESOURCES.forEach((r) => { nextHand[r.key] += gain[r.key]; }); await savePlayer(me, { hand: nextHand });
        }
        await updateRoom(logState({ structures: nextStructures, setupStep: "road" }, `${me.name} placed a settlement.`));
      } else {
        const next = refreshAwards(logState({ structures: nextStructures }, `${me.name} built a settlement.`));
        await updateRoom(next); await checkWin(next);
      }
      setMode(null); return;
    }
    if (!setup && mode === "city") {
      const own = state.structures.find((s) => s.intersectionId === id && s.seat === me.seat && s.type === "settlement");
      if (!own) return setNote("A city must upgrade one of your settlements.");
      if (state.structures.filter((s) => s.seat === me.seat && s.type === "city").length >= 4) return setNote("You have no city pieces left.");
      if (!canAfford(hand, BUILD_COSTS.City)) return setNote("Not enough resources.");
      const structures = state.structures.map((s) => s.intersectionId === id ? { ...s, type: "city" as const } : s);
      await savePlayer(me, { hand: pay(hand, BUILD_COSTS.City) });
      const next = refreshAwards(logState({ structures }, `${me.name} upgraded a settlement to a city.`));
      await updateRoom(next); await checkWin(next); setMode(null);
    }
  };

  const placeEdge = async (id: string) => {
    if (!myTurn || busy) return;
    const setup = state.phase === "setup";
    const free = state.freeRoadSeat === me.seat && state.freeRoadsRemaining > 0;
    const wantsRoad = (setup && state.setupStep === "road") || mode === "road" || free;
    if (!wantsRoad || !canPlaceRoad(state, me.seat, id, free)) return setNote("You cannot build a road there.");
    if (!setup && state.roads.filter((r) => r.seat === me.seat).length >= 15) return setNote("You have no road pieces left.");
    if (setup) {
      const latest = [...state.structures].reverse().find((s) => s.seat === me.seat);
      const geometry = (await import("@/lib/catan")).getBoardGeometry(state.rows);
      const edge = geometry.edges.find((e) => e.id === id);
      if (!latest || !edge || (edge.a !== latest.intersectionId && edge.b !== latest.intersectionId)) return setNote("Your setup road must touch the settlement you just placed.");
    }
    if (!setup && !free && !canAfford(hand, BUILD_COSTS.Road)) return setNote("Not enough resources.");
    if (!setup && !free) await savePlayer(me, { hand: pay(hand, BUILD_COSTS.Road) });
    const roads = [...state.roads, { edgeId: id, seat: me.seat }];
    if (setup) {
      const nextIndex = state.setupIndex + 1;
      const done = nextIndex >= state.setupOrder.length;
      const nextSeat = done ? 0 : state.setupOrder[nextIndex]!;
      const next = logState({
        roads, setupIndex: nextIndex, setupStep: "settlement",
        phase: done ? "play" : "setup", turnSeat: nextSeat,
        dice: null,
      }, done ? "Set-up complete. Player 1 begins." : `${me.name} placed a road.`);
      await updateRoom(next);
    } else {
      const remaining = free ? state.freeRoadsRemaining - 1 : state.freeRoadsRemaining;
      const base = logState({ roads, freeRoadsRemaining: remaining, freeRoadSeat: remaining > 0 ? me.seat : null }, `${me.name} built a road.`);
      const next = refreshAwards(base); await updateRoom(next); await checkWin(next); setMode(remaining > 0 ? "road" : null);
    }
  };

  const submitDiscard = async () => {
    const required = halfDiscardCount(hand);
    if (resourceCount(discard) !== required) return setNote(`Discard exactly ${required} cards.`);
    if (RESOURCES.some((r) => discard[r.key] > hand[r.key])) return setNote("You cannot discard cards you do not have.");
    const nextHand = { ...hand }; RESOURCES.forEach((r) => { nextHand[r.key] -= discard[r.key]; });
    await savePlayer(me, { hand: nextHand });
    const discarded = [...new Set([...state.robberDiscardedSeats, me.seat])];
    const needs = players.filter((p) => halfDiscardCount((privateState(p).hand ?? emptyHand()) as PlayerHand) > 0).map((p) => p.seat);
    const complete = needs.every((seat) => discarded.includes(seat));
    await updateRoom(logState({ robberDiscardedSeats: discarded, phase: complete ? "robber-move" : "robber-discard" }, complete ? "All required discards are complete. Move the robber." : `${me.name} discarded cards.`));
    setDiscard(emptyHand());
  };

  const moveRobber = async (tile: number) => {
    if (!myTurn || state.phase !== "robber-move" || tile === state.robberTile) return;
    const targets = robberTargets(state, tile, me.seat);
    const patch: Partial<CatanState> = { robberTile: tile, robberPendingTile: tile, robberTargetSeats: targets };
    if (!targets.length) patch.phase = "play";
    await updateRoom(logState(patch, targets.length ? `${me.name} moved the robber and may steal a card.` : `${me.name} moved the robber.`));
  };

  const stealFrom = async (seat: number) => {
    if (!myTurn || state.phase !== "robber-move" || !state.robberTargetSeats.includes(seat)) return;
    const target = players.find((p) => p.seat === seat); if (!target) return;
    const targetHand = (privateState(target).hand ?? emptyHand()) as PlayerHand;
    const pool = RESOURCES.flatMap((r) => Array(targetHand[r.key]).fill(r.key));
    if (pool.length) {
      const resource = pool[Math.floor(Math.random() * pool.length)]!;
      const nextTarget = { ...targetHand, [resource]: targetHand[resource] - 1 };
      const nextMe = { ...hand, [resource]: hand[resource] + 1 };
      await Promise.all([savePlayer(target, { hand: nextTarget }), savePlayer(me, { hand: nextMe })]);
    }
    await updateRoom(logState({ phase: "play", robberTargetSeats: [], robberPendingTile: null }, pool.length ? `${me.name} stole a resource.` : `${me.name} found no cards to steal.`));
  };

  const playDev = async (index: number) => {
    const entry = devCards[index]; if (!entry || !myTurn || entry.fresh || state.playedDevThisTurn || entry.card === "victoryPoint") return;
    const cards = devCards.filter((_, i) => i !== index);
    if (entry.card === "knight") {
      await savePlayer(me, { devCards: cards, knightsPlayed: knightsPlayed + 1 });
      const simulated = { ...state, playedDevThisTurn: true, phase: "robber-move", robberTargetSeats: [] as number[] };
      const armies = players.map((p) => ({ seat: p.seat, n: p.id === me.id ? knightsPlayed + 1 : Number(privateState(p).knightsPlayed ?? 0) }));
      const current = simulated.largestArmySeat == null ? 0 : (armies.find((x) => x.seat === simulated.largestArmySeat)?.n ?? 0);
      const leader = armies.reduce((a, b) => b.n > a.n ? b : a);
      if (leader.n >= 3 && leader.n > current) simulated.largestArmySeat = leader.seat;
      await updateRoom(logState(simulated, `${me.name} played a Knight. Move the robber.`));
      return;
    }
    await savePlayer(me, { devCards: cards });
    if (entry.card === "roadBuilding") {
      await updateRoom(logState({ playedDevThisTurn: true, freeRoadsRemaining: 2, freeRoadSeat: me.seat }, `${me.name} played Road Building.`));
      setMode("road"); return;
    }
    if (entry.card === "yearOfPlenty") {
      const next = { ...hand }; next[devResource] += 1; next[devResource2] += 1;
      await savePlayer(me, { devCards: cards, hand: next });
      await updateRoom(logState({ playedDevThisTurn: true }, `${me.name} played Year of Plenty.`)); return;
    }
    if (entry.card === "monopoly") {
      await Promise.all(players.filter((p) => p.id !== me.id).map(async (p) => {
        const h = (privateState(p).hand ?? emptyHand()) as PlayerHand; const amount = h[devResource];
        if (amount) await savePlayer(p, { hand: { ...h, [devResource]: 0 } });
      }));
      const total = players.filter((p) => p.id !== me.id).reduce((sum, p) => sum + ((privateState(p).hand ?? emptyHand()) as PlayerHand)[devResource], 0);
      await savePlayer(me, { devCards: cards, hand: { ...hand, [devResource]: hand[devResource] + total } });
      await updateRoom(logState({ playedDevThisTurn: true }, `${me.name} played Monopoly.`));
    }
  };

  const bankTrade = async () => {
    if (!myTurn || state.phase !== "play" || bankGive === bankGet || hand[bankGive] < 4) return setNote("Bank trade is 4 of one resource for 1 other resource.");
    await savePlayer(me, { hand: { ...hand, [bankGive]: hand[bankGive] - 4, [bankGet]: hand[bankGet] + 1 } });
    await updateRoom(logState({}, `${me.name} traded with the bank.`));
  };

  const proposeTrade = async () => {
    const target = players.find((p) => p.seat === tradeTo);
    if (!myTurn || !target || tradeTo === me.seat || tradeGiveQty < 1 || tradeWantQty < 1 || hand[tradeGive] < tradeGiveQty) return setNote("Choose a valid trade.");
    const give = emptyOffer(), want = emptyOffer(); give[tradeGive] = tradeGiveQty; want[tradeWant] = tradeWantQty;
    await updateRoom(logState({ trade: { fromSeat: me.seat, toSeat: tradeTo, give, want } }, `${me.name} offered a trade to ${target.name}.`));
  };

  const respondTrade = async (accept: boolean) => {
    const trade = state.trade; if (!trade || trade.toSeat !== me.seat) return;
    if (!accept) return updateRoom(logState({ trade: null }, `${me.name} declined the trade.`));
    const from = players.find((p) => p.seat === trade.fromSeat); if (!from) return;
    const fromHand = (privateState(from).hand ?? emptyHand()) as PlayerHand;
    if (!canAfford(fromHand, trade.give) || !canAfford(hand, trade.want)) return setNote("One player no longer has the required cards.");
    const nextFrom = { ...fromHand }, nextMe = { ...hand };
    RESOURCES.forEach((r) => { const g = trade.give[r.key] ?? 0, w = trade.want[r.key] ?? 0; nextFrom[r.key] += w - g; nextMe[r.key] += g - w; });
    await Promise.all([savePlayer(from, { hand: nextFrom }), savePlayer(me, { hand: nextMe })]);
    await updateRoom(logState({ trade: null }, `${me.name} accepted ${from.name}'s trade.`));
  };

  const endTurn = async () => {
    if (!myTurn || state.phase !== "play") return;
    const nextSeat = (state.turnSeat + 1) % players.length;
    await savePlayer(me, { devCards: devCards.map((c) => ({ ...c, fresh: false })) });
    await updateRoom(logState({ turnSeat: nextSeat, dice: null, playedDevThisTurn: false, trade: null, freeRoadsRemaining: 0, freeRoadSeat: null }, `Turn passes to ${players.find((p) => p.seat === nextSeat)?.name ?? "the next settler"}.`));
    setMode(null);
  };

  const currentDiscardNeed = state.phase === "robber-discard" ? halfDiscardCount(hand) : 0;
  const pendingTrade = state.trade;
  const setupText = state.phase === "setup" ? `SET-UP: ${state.setupStep === "settlement" ? "place a settlement" : "place an adjacent road"}` : null;
  const points = publicVictoryPoints(state, me.seat) + devCards.filter((c) => c.card === "victoryPoint").length;

  return <div className="min-h-screen pb-10">
    <header className="flex items-center justify-between gap-3 border-b-3 border-foreground bg-card px-4 py-3">
      <div className="flex items-center gap-2"><span className={cn("size-5 border-2 border-foreground", colorClass[me.color])} /><span className="font-display text-[11px]">{me.name}</span></div>
      <div className="flex items-center gap-3"><PixelButton size="sm" variant="ghost" onClick={goToNewGame}>New game</PixelButton><span className="font-display text-[10px] text-muted-foreground">ROOM {room.code}</span></div>
    </header>

    <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[1.25fr_.9fr]">
      {room.status === "lobby" ? <div className="lg:col-span-2"><PixelPanel large className="grid gap-4 text-center"><h1>Waiting room</h1><p className="font-mono text-sm text-muted-foreground">Ready up, then start from the shared screen.</p><PixelButton onClick={toggleReady} variant={me.ready ? "ghost" : "primary"}>{me.ready ? "I'm not ready" : "I'm ready"}</PixelButton><ul className="grid gap-2 text-left">{players.map((p) => <li key={p.id} className="flex items-center gap-2 border-3 border-foreground px-3 py-2"><span className="flex-1 font-mono">{p.name}</span><PixelTag tone={p.ready ? "live" : "muted"}>{p.ready ? "Ready" : "…"}</PixelTag></li>)}</ul></PixelPanel></div> : <>
        <div className="grid gap-4">
          <CatanBoard state={state} interactive={myTurn && (state.phase === "setup" || mode != null || state.phase === "robber-move")} onIntersection={placeIntersection} onEdge={placeEdge} onTile={moveRobber} seatColors={seatColors} />
          <p className="font-mono text-xs text-muted-foreground">Tap intersections to place settlements/cities, road lines to build roads, and tiles to move the robber.</p>
        </div>
        <div className="grid content-start gap-4">
          <PixelPanel large className={cn("text-center", myTurn ? "bg-primary/20" : "")}>
            <p className="font-display text-[10px] text-muted-foreground">{setupText ?? (myTurn ? "YOUR TURN" : `${activeName.toUpperCase()} IS PLAYING`)}</p>
            <p className="mt-2 font-display text-xl">{state.phase === "game-over" ? `${players.find((p) => p.seat === state.winnerSeat)?.name ?? "Someone"} wins!` : state.dice ? `Rolled ${state.dice[0] + state.dice[1]}` : "Roll when ready"}</p>
            <p className="mt-2 font-mono text-xs">Victory points: {points} · Longest Road: {state.longestRoadSeat === me.seat ? "✓" : "—"} · Largest Army: {state.largestArmySeat === me.seat ? "✓" : "—"}</p>
          </PixelPanel>

          <PixelPanel large>
            <h2>Your hand</h2><div className="mt-3 grid grid-cols-5 gap-1">{RESOURCES.map((r) => <div key={r.key} className="border-2 border-foreground text-center"><div className={cn("h-5 border-b-2 border-foreground", TERRAIN[r.tile].className)} /><div className="py-1 font-display">{hand[r.key]}</div><div className="pb-1 font-mono text-[9px]">{r.label}</div></div>)}</div>
          </PixelPanel>

          {state.phase === "robber-discard" && currentDiscardNeed > 0 ? <PixelPanel large className="grid gap-3"><h2>Discard {currentDiscardNeed} cards</h2>{RESOURCES.map((r) => <label key={r.key} className="flex items-center justify-between font-mono text-sm">{r.label}<input type="number" min="0" max={hand[r.key]} value={discard[r.key]} onChange={(e) => setDiscard({ ...discard, [r.key]: Math.max(0, Number(e.target.value)) })} className="w-16 border-2 border-foreground p-1 text-center" /></label>)}<PixelButton onClick={submitDiscard}>Discard selected cards</PixelButton></PixelPanel> : null}

          {state.phase === "robber-move" && myTurn ? <PixelPanel large className="grid gap-3"><h2>Robber</h2><p className="font-mono text-sm">Tap a different tile. Then choose a player adjacent to that tile.</p>{state.robberTargetSeats.length ? <div className="grid gap-2">{state.robberTargetSeats.map((seat) => <PixelButton key={seat} variant="ghost" onClick={() => stealFrom(seat)}>Steal from {players.find((p) => p.seat === seat)?.name}</PixelButton>)}</div> : null}</PixelPanel> : null}

          {pendingTrade?.toSeat === me.seat ? <PixelPanel large className="grid gap-3"><h2>Trade offer</h2><p className="font-mono text-sm">{players.find((p) => p.seat === pendingTrade.fromSeat)?.name} offers {RESOURCES.filter((r) => (pendingTrade.give[r.key] ?? 0) > 0).map((r) => `${pendingTrade.give[r.key]} ${r.label}`).join(", ")} for {RESOURCES.filter((r) => (pendingTrade.want[r.key] ?? 0) > 0).map((r) => `${pendingTrade.want[r.key]} ${r.label}`).join(", ")}.</p><div className="grid grid-cols-2 gap-2"><PixelButton onClick={() => respondTrade(true)}>Accept</PixelButton><PixelButton variant="ghost" onClick={() => respondTrade(false)}>Decline</PixelButton></div></PixelPanel> : null}

          <PixelPanel large className="grid gap-3">
            <h2>Actions</h2>
            <PixelButton size="lg" disabled={!myTurn || busy || state.dice != null || state.phase !== "play"} onClick={doRoll}>Roll dice</PixelButton>
            <div className="grid grid-cols-2 gap-2">{Object.keys(BUILD_COSTS).map((what) => <PixelButton key={what} variant={mode === what.toLowerCase() ? "primary" : "ghost"} disabled={!myTurn || busy || state.phase !== "play"} onClick={() => void selectBuild(what)}>{what}</PixelButton>)}</div>
            <PixelButton variant="dark" disabled={!myTurn || busy || state.phase !== "play"} onClick={endTurn}>End turn</PixelButton>
            {note ? <p className="border-2 border-foreground bg-pixel-red/20 p-2 font-mono text-xs">{note}</p> : null}
          </PixelPanel>

          <PixelPanel large className="grid gap-2"><h2>Bank trade</h2><div className="grid grid-cols-2 gap-2"><ResourceSelect value={bankGive} onChange={setBankGive} /><ResourceSelect value={bankGet} onChange={setBankGet} /></div><PixelButton variant="ghost" disabled={!myTurn || state.phase !== "play"} onClick={bankTrade}>Trade 4 for 1</PixelButton></PixelPanel>

          <PixelPanel large className="grid gap-2"><h2>Trade with a player</h2><select value={tradeTo} onChange={(e) => setTradeTo(Number(e.target.value))} className="border-2 border-foreground p-2">{players.filter((p) => p.id !== me.id).map((p) => <option key={p.id} value={p.seat}>{p.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><ResourceSelect value={tradeGive} onChange={setTradeGive} /><input type="number" min="1" value={tradeGiveQty} onChange={(e) => setTradeGiveQty(Number(e.target.value))} className="border-2 border-foreground p-2" /></div><div className="grid grid-cols-2 gap-2"><ResourceSelect value={tradeWant} onChange={setTradeWant} /><input type="number" min="1" value={tradeWantQty} onChange={(e) => setTradeWantQty(Number(e.target.value))} className="border-2 border-foreground p-2" /></div><PixelButton variant="ghost" disabled={!myTurn || state.phase !== "play" || !!pendingTrade} onClick={proposeTrade}>Propose trade</PixelButton></PixelPanel>

          <PixelPanel large className="grid gap-2"><h2>Development cards</h2>{devCards.length ? devCards.map((entry, i) => <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 border-2 border-foreground p-2"><span className="font-mono text-sm">{devLabel[entry.card]}{entry.fresh ? " (next turn)" : ""}</span>{entry.card !== "victoryPoint" ? <PixelButton size="sm" variant="ghost" disabled={!myTurn || entry.fresh || state.playedDevThisTurn || state.phase !== "play"} onClick={() => playDev(i)}>Play</PixelButton> : <span className="font-mono text-xs">+1 VP</span>}</div>) : <p className="font-mono text-sm text-muted-foreground">No development cards.</p>}
            <div className="grid grid-cols-2 gap-2"><ResourceSelect value={devResource} onChange={setDevResource} /><ResourceSelect value={devResource2} onChange={setDevResource2} /></div><p className="font-mono text-[10px] text-muted-foreground">Selections are used for Year of Plenty (two resources) and Monopoly (first resource).</p></PixelPanel>
        </div>
      </>}
    </main>
  </div>;
}

function ResourceSelect({ value, onChange }: { value: keyof PlayerHand; onChange: (v: keyof PlayerHand) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value as keyof PlayerHand)} className="border-2 border-foreground bg-background p-2 font-mono text-sm">{RESOURCES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>;
}