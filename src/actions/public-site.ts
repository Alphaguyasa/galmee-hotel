"use server";

import type { ActionState } from "@/actions/stays";
import { getPublicSite, submitBookingRequest } from "@/server/dal/public-site";
import { bookingRequestSchema, formToObject } from "@/server/validation";

export async function requestBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Bots fill every field; people never see this one.
  if (formData.get("website")) return { done: true };

  const parsed = bookingRequestSchema.safeParse(
    formToObject(formData, ["slug", "guestName", "phone", "checkIn", "checkOut", "roomType", "adults", "message"]),
  );
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "phone" ? "phone" : "form" };

  const site = await getPublicSite(parsed.data.slug);
  if (!site) return { error: "generic" };

  const result = await submitBookingRequest({ tenantId: site.tenantId, ...parsed.data });
  return result.ok ? { done: true } : { error: result.error };
}
