"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as hotel from "@/server/dal/hotel";
import { getUserId } from "@/server/dal/session";
import {
  chargeSchema,
  checkInSchema,
  checkOutSchema,
  formToObject,
  newStaySchema,
  paymentSchema,
  uuidParam,
} from "@/server/validation";

/** `error` is a key in the `errors` message namespace. */
export type ActionState = { error?: string; done?: boolean } | undefined;

// Server Actions are public endpoints: every one checks the login, validates, and the RPCs re-check tenant and role.
async function requireLogin() {
  if (!(await getUserId())) redirect("/login");
}

function refresh(stay: string) {
  revalidatePath("/");
  revalidatePath(`/stays/${stay}`);
}

export async function createStayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = newStaySchema.safeParse({
    ...formToObject(formData, ["room", "guestName", "guestPhone", "checkIn", "checkOut", "adults", "children", "nightlyRate", "source", "clientRef", "request"]),
    checkInNow: formData.get("checkInNow") ?? "off",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "guestPhone" ? "phone" : "form" };

  const result = await hotel.createStay(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/requests");
  redirect(`/stays/${result.data}`);
}

export async function checkInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = checkInSchema.safeParse(formToObject(formData, ["stay", "idType", "idNumber", "nationality"]));
  if (!parsed.success) return { error: "form" };
  const result = await hotel.checkInStay(parsed.data);
  if (!result.ok) return { error: result.error };
  refresh(parsed.data.stay);
  return { done: true };
}

export async function addChargeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = chargeSchema.safeParse(formToObject(formData, ["stay", "kind", "description", "amount", "clientRef"]));
  if (!parsed.success) return { error: "form" };
  const result = await hotel.addCharge(parsed.data);
  if (!result.ok) return { error: result.error };
  refresh(parsed.data.stay);
  return { done: true };
}

export async function reverseChargeAction(stay: string, charge: string): Promise<void> {
  await requireLogin();
  if (!uuidParam.safeParse(stay).success || !uuidParam.safeParse(charge).success) return;
  await hotel.reverseCharge(charge);
  refresh(stay);
}

export async function payStayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = paymentSchema.safeParse(formToObject(formData, ["stay", "amount", "method", "reference", "clientRef"]));
  if (!parsed.success) return { error: "form" };
  const result = await hotel.payStay(parsed.data);
  if (!result.ok) return { error: result.error };
  refresh(parsed.data.stay);
  return { done: true };
}

export async function checkOutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = checkOutSchema.safeParse({
    ...formToObject(formData, ["stay", "amount", "method", "reference"]),
    leaveBalance: formData.get("leaveBalance") ?? "off",
  });
  if (!parsed.success) return { error: "form" };
  const result = await hotel.checkOutStay(parsed.data);
  if (!result.ok) return { error: result.error };
  refresh(parsed.data.stay);
  return { done: true };
}

export async function cancelStayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const stay = String(formData.get("stay") ?? "");
  if (!uuidParam.safeParse(stay).success) return { error: "form" };
  const result = await hotel.cancelStay(stay, formData.get("noShow") === "on");
  if (!result.ok) return { error: result.error };
  refresh(stay);
  return { done: true };
}

export async function loadDemoDataAction(): Promise<ActionState> {
  await requireLogin();
  const result = await hotel.loadDemoData();
  if (!result.ok) return { error: result.error };
  revalidatePath("/");
  return { done: true };
}

export async function markRoomCleanAction(room: string): Promise<void> {
  await requireLogin();
  if (!uuidParam.safeParse(room).success) return;
  await hotel.setHousekeeping(room, "clean");
  revalidatePath("/");
}

export async function declineRequestAction(id: string): Promise<void> {
  await requireLogin();
  if (!uuidParam.safeParse(id).success) return;
  await hotel.declineRequest(id);
  revalidatePath("/requests");
}
