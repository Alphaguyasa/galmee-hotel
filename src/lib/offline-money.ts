import { z } from "zod";

/** Money RPCs that may wait on this phone for the network; each is idempotent on `p_client_ref`. */
export const QUEUEABLE_RPCS = ["ht_pay_stay", "ht_add_charge"] as const;
export type QueueableRpc = (typeof QUEUEABLE_RPCS)[number];

const uuid = z.string().uuid();
const money = z.coerce.number().positive().max(100_000_000);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const payment = z.object({
  stay: uuid,
  amount: money,
  method: z.enum(["cash", "telebirr", "cbe_birr", "bank", "other"]),
  reference: text(80),
  clientRef: uuid,
});

const charge = z.object({
  stay: uuid,
  kind: z.enum(["food", "drink", "laundry", "other"]),
  description: text(200),
  amount: money,
  clientRef: uuid,
});

/**
 * Turns the stay page's payment or charge form into the RPC arguments, with the
 * form's `client_ref`, so a payment that reached the server but lost its answer
 * is not written twice when its queued copy replays. Null when the form is invalid.
 */
export function moneyRpcArgs(rpc: QueueableRpc, form: Record<string, unknown>): Record<string, unknown> | null {
  if (rpc === "ht_pay_stay") {
    const p = payment.safeParse(form);
    if (!p.success) return null;
    return { p_stay: p.data.stay, p_amount: p.data.amount, p_method: p.data.method, p_reference: p.data.reference, p_client_ref: p.data.clientRef };
  }
  const c = charge.safeParse(form);
  if (!c.success) return null;
  return { p_stay: c.data.stay, p_kind: c.data.kind, p_description: c.data.description, p_amount: c.data.amount, p_client_ref: c.data.clientRef };
}

/** The amount of a queued entry, for its line in the waiting list. */
export function queuedAmount(args: Record<string, unknown>): number {
  const n = Number(args.p_amount);
  return Number.isFinite(n) ? n : 0;
}
