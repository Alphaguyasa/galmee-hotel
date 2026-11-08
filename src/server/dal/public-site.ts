import "server-only";
import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/anon";

export type PublicSiteDTO = {
  tenantId: string;
  slug: string;
  name: string;
  headline: string | null;
  about: string | null;
  address: string | null;
  phone: string | null;
  roomTypes: { id: string; name: string; description: string | null; capacity: number; rate: number | null }[];
};

export const getPublicSite = cache(async (slug: string): Promise<PublicSiteDTO | null> => {
  const supabase = createAnonClient();
  const { data: site, error } = await supabase
    .from("ht_sites")
    .select("tenant_id, slug, display_name, headline, about, address, phone")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error("site_unavailable");
  if (!site) return null;
  const [{ data: types, error: e1 }, { data: plans, error: e2 }] = await Promise.all([
    supabase.from("ht_room_types").select("id, name, description, capacity, sort_order").eq("tenant_id", site.tenant_id).order("sort_order"),
    supabase.from("ht_rate_plans").select("room_type_id, nightly_rate").eq("tenant_id", site.tenant_id).eq("is_default", true).eq("active", true),
  ]);
  if (e1 || e2) throw new Error("site_unavailable");
  const rates = new Map((plans ?? []).map((p) => [p.room_type_id, Number(p.nightly_rate)]));
  return {
    tenantId: site.tenant_id,
    slug: site.slug,
    name: site.display_name,
    headline: site.headline,
    about: site.about,
    address: site.address,
    phone: site.phone,
    roomTypes: (types ?? []).map((t) => ({ id: t.id, name: t.name, description: t.description, capacity: t.capacity, rate: rates.get(t.id) ?? null })),
  };
});

/** `rate_limited` comes from the database guard: 3 per phone and 40 per hotel, per hour. */
export async function submitBookingRequest(input: {
  tenantId: string;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  roomType?: string;
  adults: number;
  message?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAnonClient();
  const { error } = await supabase.from("ht_booking_requests").insert({
    tenant_id: input.tenantId,
    guest_name: input.guestName,
    phone: input.phone,
    check_in: input.checkIn,
    check_out: input.checkOut,
    room_type_id: input.roomType,
    adults: input.adults,
    message: input.message,
  });
  if (!error) return { ok: true };
  return { ok: false, error: error.message.includes("rate_limited") ? "rate_limited" : "generic" };
}
