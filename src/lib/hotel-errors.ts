const KNOWN = [
  "room_taken",
  "room_out_of_service",
  "bad_dates",
  "check_in_today_only",
  "too_early",
  "rate_override_not_allowed",
  "rate_not_found",
  "guest_required",
  "bad_status",
  "balance_due",
  "overpayment",
  "bad_amount",
  "already_reversed",
  "not_allowed",
  "not_demo_tenant",
  "already_loaded",
] as const;

export type HotelErrorKey = (typeof KNOWN)[number] | "generic";

/** Turns a database error message into a translation key; anything unknown stays generic. */
export function hotelErrorKey(message: string | undefined): HotelErrorKey {
  return KNOWN.find((code) => message?.includes(code)) ?? "generic";
}
