import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hotelErrorKey, type HotelErrorKey } from "@/lib/hotel-errors";
import type { BoardStatus } from "@/lib/room-board";
import { addDays } from "@/lib/room-board";

export type BoardRoomDTO = { id: string; number: string; typeName: string; inService: boolean; dirty: boolean };
export type BoardStayDTO = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: BoardStatus;
  guestName: string;
};

export type MutationResult<T = undefined> = { ok: true; data: T } | { ok: false; error: HotelErrorKey };

function fail(message: string | undefined): { ok: false; error: HotelErrorKey } {
  return { ok: false, error: hotelErrorKey(message) };
}

/** Rooms in board order. RLS limits them to the caller's hotel. */
export const listRooms = cache(async (): Promise<BoardRoomDTO[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ht_rooms")
    .select("id, number, in_service, housekeeping, ht_room_types(name)")
    .order("number");
  if (error) throw new Error("rooms_unavailable");
  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.number,
    typeName: r.ht_room_types?.name ?? "",
    inService: r.in_service,
    dirty: r.housekeeping === "dirty",
  }));
});

/** Stays touching [from, from + days), plus tonight's stays for the summary. */
export async function listBoardStays(from: string, days: number, today: string): Promise<BoardStayDTO[]> {
  const end = addDays(from, days);
  const rangeStart = from < today ? from : today;
  const rangeEnd = end > addDays(today, 1) ? end : addDays(today, 1);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ht_stays")
    .select("id, room_id, check_in, check_out, status, customers(name)")
    .in("status", ["reserved", "in_house", "checked_out"])
    .lt("check_in", rangeEnd)
    .gt("check_out", rangeStart)
    .order("check_in")
    .limit(2000);
  if (error) throw new Error("stays_unavailable");
  return (data ?? []).map((s) => ({
    id: s.id,
    roomId: s.room_id,
    checkIn: s.check_in,
    checkOut: s.check_out,
    status: s.status as BoardStatus,
    guestName: s.customers?.name ?? "",
  }));
}

export type NewStayRateDTO = { roomId: string; rate: number | null };

/** Default nightly rate for each room, shown on the new-stay form. */
export async function listRoomRates(): Promise<NewStayRateDTO[]> {
  const supabase = await createClient();
  const [{ data: rooms, error: e1 }, { data: plans, error: e2 }] = await Promise.all([
    supabase.from("ht_rooms").select("id, room_type_id"),
    supabase.from("ht_rate_plans").select("room_type_id, nightly_rate").eq("is_default", true).eq("active", true),
  ]);
  if (e1 || e2) throw new Error("rates_unavailable");
  const byType = new Map((plans ?? []).map((p) => [p.room_type_id, Number(p.nightly_rate)]));
  return (rooms ?? []).map((r) => ({ roomId: r.id, rate: byType.get(r.room_type_id) ?? null }));
}

export type StayDetailDTO = {
  id: string;
  roomNumber: string;
  roomTypeName: string;
  guestName: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  status: "reserved" | "in_house" | "checked_out" | "cancelled" | "no_show";
  nightlyRate: number;
  adults: number;
  children: number;
  idType: string | null;
  idNumber: string | null;
  nationality: string | null;
  source: string;
  totals: { nights: number; room: number; charges: number; paid: number; balance: number };
  charges: { id: string; kind: string; description: string | null; amount: number; reversible: boolean; createdAt: string }[];
  payments: { id: string; amount: number; createdAt: string }[];
};

export const getStay = cache(async (id: string): Promise<StayDetailDTO | null> => {
  const supabase = await createClient();
  const { data: s, error } = await supabase
    .from("ht_stays")
    .select(
      "id, check_in, check_out, status, nightly_rate, adults, children, id_type, id_number, nationality, source, customers(name, phone), ht_rooms(number, ht_room_types(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("stay_unavailable");
  if (!s) return null;

  const [totals, charges, payments] = await Promise.all([
    supabase.rpc("ht_stay_totals", { p_stay: id }),
    supabase.from("ht_stay_charges").select("id, kind, description, amount, reverses_id, created_at").eq("stay_id", id).order("created_at"),
    supabase.from("ht_stay_payments").select("id, amount, created_at").eq("stay_id", id).order("created_at"),
  ]);
  if (totals.error || charges.error || payments.error) throw new Error("stay_unavailable");
  const t = totals.data?.[0];
  if (!t) return null;

  const reversed = new Set((charges.data ?? []).map((c) => c.reverses_id).filter(Boolean));
  return {
    id: s.id,
    roomNumber: s.ht_rooms?.number ?? "",
    roomTypeName: s.ht_rooms?.ht_room_types?.name ?? "",
    guestName: s.customers?.name ?? "",
    guestPhone: s.customers?.phone ?? null,
    checkIn: s.check_in,
    checkOut: s.check_out,
    status: s.status as StayDetailDTO["status"],
    nightlyRate: Number(s.nightly_rate),
    adults: s.adults,
    children: s.children,
    idType: s.id_type,
    idNumber: s.id_number,
    nationality: s.nationality,
    source: s.source,
    totals: {
      nights: t.nights,
      room: Number(t.room_total),
      charges: Number(t.charges_total),
      paid: Number(t.paid_total),
      balance: Number(t.balance),
    },
    charges: (charges.data ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      description: c.description,
      amount: Number(c.amount),
      reversible: Number(c.amount) > 0 && !c.reverses_id && !reversed.has(c.id),
      createdAt: c.created_at,
    })),
    payments: (payments.data ?? []).map((p) => ({ id: p.id, amount: Number(p.amount), createdAt: p.created_at })),
  };
});

export async function createStay(input: {
  room: string;
  guestName: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nightlyRate?: number;
  source: string;
  checkInNow: boolean;
  clientRef: string;
}): Promise<MutationResult<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ht_create_stay", {
    p_room: input.room,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guest_name: input.guestName,
    p_guest_phone: input.guestPhone,
    p_nightly_rate: input.nightlyRate,
    p_adults: input.adults,
    p_children: input.children,
    p_source: input.source,
    p_check_in_now: input.checkInNow,
    p_client_ref: input.clientRef,
  });
  if (error || !data) return fail(error?.message);
  return { ok: true, data };
}

export async function checkInStay(input: { stay: string; idType: string; idNumber: string; nationality?: string }): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_check_in", {
    p_stay: input.stay,
    p_id_type: input.idType,
    p_id_number: input.idNumber,
    p_nationality: input.nationality,
  });
  return error ? fail(error.message) : { ok: true, data: undefined };
}

export async function addCharge(input: { stay: string; kind: string; description?: string; amount: number; clientRef: string }): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_add_charge", {
    p_stay: input.stay,
    p_kind: input.kind,
    p_amount: input.amount,
    p_description: input.description,
    p_client_ref: input.clientRef,
  });
  return error ? fail(error.message) : { ok: true, data: undefined };
}

export async function reverseCharge(charge: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_reverse_charge", { p_charge: charge });
  return error ? fail(error.message) : { ok: true, data: undefined };
}

type PayMethod = "cash" | "telebirr" | "cbe_birr" | "bank" | "other";

export async function payStay(input: { stay: string; amount: number; method: PayMethod; reference?: string; clientRef: string }): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_pay_stay", {
    p_stay: input.stay,
    p_amount: input.amount,
    p_method: input.method,
    p_reference: input.reference,
    p_client_ref: input.clientRef,
  });
  return error ? fail(error.message) : { ok: true, data: undefined };
}

export async function checkOutStay(input: { stay: string; amount: number; method: PayMethod; reference?: string; leaveBalance: boolean }): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_check_out", {
    p_stay: input.stay,
    p_amount: input.amount,
    p_method: input.method,
    p_reference: input.reference,
    p_leave_balance: input.leaveBalance,
  });
  return error ? fail(error.message) : { ok: true, data: undefined };
}

export async function cancelStay(stay: string, noShow: boolean): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_cancel_stay", { p_stay: stay, p_no_show: noShow });
  return error ? fail(error.message) : { ok: true, data: undefined };
}

export async function loadDemoData(): Promise<MutationResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ht_load_demo_data");
  return error ? fail(error.message) : { ok: true, data: undefined };
}
