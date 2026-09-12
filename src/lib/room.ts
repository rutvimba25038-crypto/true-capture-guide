import { supabase } from "@/integrations/supabase/client";
import { createCatanState, emptyHand } from "./catan";
import { PLAYER_COLORS } from "./games";

export type Room = {
  id: string;
  code: string;
  game_id: string;
  status: string;
  state: Record<string, unknown>;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  color: string;
  seat: number;
  is_host: boolean;
  ready: boolean;
  private_state: Record<string, unknown>;
  created_at: string;
};

const randomCode = () => String(1000 + Math.floor(Math.random() * 9000));

export const createRoom = async (gameId: string): Promise<Room> => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code: randomCode(),
        game_id: gameId,
        status: "lobby",
        state: gameId === "catan" ? createCatanState() : {},
      })
      .select()
      .single();
    if (!error && data) return data as Room;
    if (error && !error.message.includes("duplicate")) throw error;
  }
  throw new Error("Could not create a room, please try again.");
};

export const getRoomByCode = async (code: string) => {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data as Room | null) ?? null;
};

export const getPlayers = async (roomId: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("seat", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Player[];
};

export const joinRoom = async (room: Room, name: string) => {
  const existing = await getPlayers(room.id);
  if (existing.length >= 4) throw new Error("This table is full (4 players max).");
  const seat = existing.length;
  const { data, error } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name,
      seat,
      color: PLAYER_COLORS[seat % PLAYER_COLORS.length]!,
      is_host: existing.length === 0,
      private_state: { hand: emptyHand() },
    })
    .select()
    .single();
  if (error) throw error;
  const player = data as Player;
  setLocalPlayerId(room.code, player.id);
  return player;
};

const key = (code: string) => `tablequest:player:${code}`;

export const setLocalPlayerId = (code: string, id: string) => {
  if (typeof window !== "undefined") window.localStorage.setItem(key(code), id);
};

export const getLocalPlayerId = (code: string) => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key(code));
};
