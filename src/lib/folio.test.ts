import { describe, expect, it } from "vitest";
import { buildFolio, folioRef, folioText, type FolioLabels, type FolioStay } from "./folio";

const labels: FolioLabels = {
  title: "Receipt",
  number: (ref) => `No. ${ref}`,
  room: (n, type) => `Room ${n} · ${type}`,
  nights: (n, rate) => `${n} × ${rate}`,
  chargeKind: (k) => ({ food: "Food", laundry: "Laundry" })[k] ?? k,
  roomTotal: "Room",
  extras: "Extras",
  paidOn: (d) => `Paid ${d}`,
  paid: "Paid",
  balance: "Balance",
  thanks: "Thank you",
};
const fmt = { birr: (n: number) => n.toFixed(2), date: (d: string | Date) => (d instanceof Date ? d.toISOString() : d).slice(0, 10) };

const stay: FolioStay = {
  id: "3f2a9c1e-0000-4000-8000-000000000001",
  guestName: "Abebe Kebede",
  roomNumber: "104",
  roomTypeName: "Double",
  checkIn: "2026-11-10",
  checkOut: "2026-11-13",
  nightlyRate: 800,
  totals: { nights: 3, room: 2400, charges: 230, paid: 2000, balance: 630 },
  charges: [
    { kind: "food", description: null, amount: 250 },
    { kind: "food", description: "  Breakfast correction ", amount: -20 },
  ],
  payments: [
    { amount: 1500, createdAt: "2026-11-10T08:00:00Z" },
    { amount: 500, createdAt: "2026-11-13T07:30:00Z" },
  ],
};

describe("folioRef", () => {
  it("takes the first 8 hex digits in upper case", () => expect(folioRef(stay.id)).toBe("3F2A9C1E"));
});

describe("buildFolio", () => {
  const folio = buildFolio(stay, labels, fmt, new Date("2026-11-13T09:00:00Z"));

  it("puts the nights first, then each charge, reversals included", () => {
    expect(folio.lines).toEqual([
      { name: "3 × 800.00", qty: "", amount: "2400.00" },
      { name: "Food", qty: "", amount: "250.00" },
      { name: "Breakfast correction", qty: "", amount: "-20.00" },
    ]);
  });

  it("lists each payment with its date and ends on the balance", () => {
    expect(folio.totals.map((t) => t.label)).toEqual(["Room", "Extras", "Paid 2026-11-10", "Paid 2026-11-13", "Balance"]);
    expect(folio.totals.at(-1)).toEqual({ label: "Balance", amount: "630.00" });
  });

  it("shows one paid row when nothing was paid", () => {
    const none = buildFolio({ ...stay, payments: [], totals: { ...stay.totals, paid: 0 } }, labels, fmt, new Date());
    expect(none.totals.filter((t) => t.label.startsWith("Paid"))).toEqual([{ label: "Paid", amount: "0.00" }]);
  });

  it("carries the guest, the stay dates and the receipt number", () => {
    expect(folio.number).toBe("No. 3F2A9C1E");
    expect(folio.details).toEqual(["Abebe Kebede", "Room 104 · Double", "2026-11-10 → 2026-11-13"]);
  });
});

describe("folioText", () => {
  it("renders the same folio as plain text", () => {
    const text = folioText(buildFolio(stay, labels, fmt, new Date("2026-11-13T09:00:00Z")), "Sunrise Guesthouse");
    expect(text.split("\n")).toEqual([
      "Sunrise Guesthouse",
      "Receipt · No. 3F2A9C1E",
      "2026-11-13",
      "Abebe Kebede",
      "Room 104 · Double",
      "2026-11-10 → 2026-11-13",
      "",
      "3 × 800.00: 2400.00",
      "Food: 250.00",
      "Breakfast correction: -20.00",
      "",
      "Room: 2400.00",
      "Extras: 230.00",
      "Paid 2026-11-10: 1500.00",
      "Paid 2026-11-13: 500.00",
      "Balance: 630.00",
      "",
      "Thank you",
    ]);
  });
});
