"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/actions/stays";
import * as hotel from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { formToObject, rateSchema, roomSchema, roomTypeSchema, siteSchema, uuidParam } from "@/server/validation";

// RLS already limits these writes to owners and managers; this returns a clear message first.
async function requireManager(): Promise<boolean> {
  const { profile } = await getSession();
  return profile.role !== "staff";
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function addRoomTypeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireManager())) return { error: "not_allowed" };
  const parsed = roomTypeSchema.safeParse(formToObject(formData, ["name", "capacity", "rate"]));
  if (!parsed.success) return { error: "form" };
  const result = await hotel.addRoomType(parsed.data);
  if (!result.ok) return { error: result.error };
  refresh();
  return { done: true };
}

export async function setRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireManager())) return { error: "not_allowed" };
  const parsed = rateSchema.safeParse(formToObject(formData, ["roomType", "rate"]));
  if (!parsed.success) return { error: "form" };
  const result = await hotel.setDefaultRate(parsed.data.roomType, parsed.data.rate);
  if (!result.ok) return { error: result.error };
  refresh();
  return { done: true };
}

export async function addRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireManager())) return { error: "not_allowed" };
  const parsed = roomSchema.safeParse(formToObject(formData, ["number", "roomType", "floor"]));
  if (!parsed.success) return { error: "form" };
  const result = await hotel.addRoom(parsed.data);
  if (!result.ok) return { error: result.error };
  refresh();
  return { done: true };
}

export async function setRoomServiceAction(room: string, inService: boolean): Promise<void> {
  if (!(await requireManager())) redirect("/");
  if (!uuidParam.safeParse(room).success) return;
  await hotel.setRoomInService(room, inService);
  refresh();
}

export async function saveSiteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { profile, tenant } = await getSession();
  if (profile.role === "staff") return { error: "not_allowed" };
  const parsed = siteSchema.safeParse({
    ...formToObject(formData, ["slug", "displayName", "headline", "about", "address", "phone"]),
    published: formData.get("published") ?? "off",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "phone" ? "phone" : field === "slug" ? "slug" : "form" };
  }
  const result = await hotel.saveSiteSettings(tenant.id, parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings");
  revalidatePath(`/h/${parsed.data.slug}`);
  return { done: true };
}
