import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createOfflineQueue } from "./galmee/offline-queue";
import { createSyncEngine, type RpcResult } from "./galmee/offline-sync";
import { moneyRpcArgs, QUEUEABLE_RPCS, queuedAmount } from "./offline-money";

const STAY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const REF = "11111111-2222-4333-8444-555555555555";

describe("moneyRpcArgs", () => {
  it("maps a payment form to ht_pay_stay with its client_ref", () => {
    expect(moneyRpcArgs("ht_pay_stay", { stay: STAY, amount: "450", method: "telebirr", reference: "", clientRef: REF })).toEqual({
      p_stay: STAY,
      p_amount: 450,
      p_method: "telebirr",
      p_reference: undefined,
      p_client_ref: REF,
    });
  });
  it("maps a charge form to ht_add_charge", () => {
    expect(moneyRpcArgs("ht_add_charge", { stay: STAY, kind: "laundry", description: " shirts ", amount: "120.5", clientRef: REF })).toEqual({
      p_stay: STAY,
      p_kind: "laundry",
      p_description: "shirts",
      p_amount: 120.5,
      p_client_ref: REF,
    });
  });
  it("refuses bad forms", () => {
    expect(moneyRpcArgs("ht_pay_stay", { stay: STAY, amount: "0", method: "cash", clientRef: REF })).toBeNull();
    expect(moneyRpcArgs("ht_pay_stay", { stay: STAY, amount: "10", method: "card", clientRef: REF })).toBeNull();
    expect(moneyRpcArgs("ht_add_charge", { stay: "x", kind: "food", amount: "10", clientRef: REF })).toBeNull();
  });
  it("reads a queued amount", () => {
    expect(queuedAmount({ p_amount: 450 })).toBe(450);
    expect(queuedAmount({})).toBe(0);
  });
});

describe("hotel payments offline", () => {
  it("queues a payment while offline and sends it once when back", async () => {
    let online = false;
    const sent: string[] = [];
    const queue = createOfflineQueue({ dbName: `ht-test-${Math.random()}`, rpcs: QUEUEABLE_RPCS });
    const engine = createSyncEngine({
      queue,
      isOnline: () => online,
      call: async (rpc, args): Promise<RpcResult> => {
        sent.push(`${rpc}:${String(args.p_client_ref)}`);
        return { data: null, error: null, status: 204 };
      },
    });
    const args = moneyRpcArgs("ht_pay_stay", { stay: STAY, amount: "300", method: "cash", clientRef: REF })!;
    expect((await engine.callOrQueue("ht_pay_stay", args)).status).toBe("queued");
    expect((await queue.counts()).pending).toBe(1);
    online = true;
    await engine.replayNow();
    await engine.replayNow();
    expect(sent).toEqual([`ht_pay_stay:${REF}`]);
    expect((await queue.counts()).pending).toBe(0);
  });
});
