"use server";

import { redirect } from "next/navigation";
import * as hotel from "@/server/dal/hotel";
import { getUserId } from "@/server/dal/session";
import { registerDaySchema } from "@/server/validation";

/** Records who printed which night's police register. Returns an `errors` key on failure. */
export async function logRegisterPrintAction(day: string): Promise<{ error?: string }> {
  if (!(await getUserId())) redirect("/login");
  const parsed = registerDaySchema.safeParse(day);
  if (!parsed.success) return { error: "form" };
  const result = await hotel.logRegisterPrint(parsed.data);
  return result.ok ? {} : { error: result.error };
}
