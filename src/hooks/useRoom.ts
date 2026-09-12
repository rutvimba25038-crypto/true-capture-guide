import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlayers, getRoomByCode, type Player, type Room } from "@/lib/room";

/** Live room + player list for a join code. Re-fetches on any realtime change. */
export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    const found = await getRoomByCode(code);
    if (!found) {
      setNotFound(true);
      setLoading(false);
      return null;
    }
    setRoom(found);
    setPlayers(await getPlayers(found.id));
    setLoading(false);
    return found;
  }, [code]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    refresh().then((found) => {
      if (!found || cancelled) return;
      channel = supabase
        .channel(`room-${found.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${found.id}` },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${found.id}` },
          () => void refresh(),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { room, players, loading, notFound, refresh };
}
