/**
 * The checkout folio: one shape for the printed 58 mm receipt and the
 * Telegram text, so both always say the same thing. Amounts come from the
 * database (`ht_stay_totals`, charge and payment rows); this file only lays
 * them out and formats them.
 */

export type FolioStay = {
  id: string;
  guestName: string;
  roomNumber: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nightlyRate: number;
  totals: { nights: number; room: number; charges: number; paid: number; balance: number };
  charges: { kind: string; description: string | null; amount: number }[];
  payments: { amount: number; createdAt: string }[];
};

export type FolioLabels = {
  title: string;
  /** "No. {ref}" */
  number: (ref: string) => string;
  room: (number: string, type: string) => string;
  nights: (nights: number, rate: string) => string;
  chargeKind: (kind: string) => string;
  roomTotal: string;
  extras: string;
  paidOn: (date: string) => string;
  paid: string;
  balance: string;
  thanks: string;
};

export type FolioFormat = {
  birr: (n: number) => string;
  /** Full date, for the printed-on line. */
  date: (d: string | Date) => string;
  /** Short date (no era), for stay dates and payment rows; falls back to `date`. */
  shortDate?: (d: string | Date) => string;
};

export type Folio = {
  title: string;
  number: string;
  dateLabel: string;
  details: string[];
  lines: { name: string; qty: string; amount: string }[];
  totals: { label: string; amount: string }[];
  footer: string;
};

/** Short printable reference for a stay id: the first 8 hex digits, upper case. */
export function folioRef(id: string): string {
  return id.replaceAll("-", "").slice(0, 8).toUpperCase();
}

export function buildFolio(stay: FolioStay, labels: FolioLabels, fmt: FolioFormat, printedAt: Date): Folio {
  const { totals } = stay;
  const short = fmt.shortDate ?? fmt.date;
  const lines = [
    // The nights line wraps in the name column; the qty column never wraps on 58 mm.
    { name: labels.nights(totals.nights, fmt.birr(stay.nightlyRate)), qty: "", amount: fmt.birr(totals.room) },
    ...stay.charges.map((c) => ({
      name: c.description?.trim() || labels.chargeKind(c.kind),
      qty: "",
      amount: fmt.birr(c.amount),
    })),
  ];
  const paidRows =
    stay.payments.length > 0
      ? stay.payments.map((p) => ({ label: labels.paidOn(short(p.createdAt)), amount: fmt.birr(p.amount) }))
      : [{ label: labels.paid, amount: fmt.birr(totals.paid) }];
  return {
    title: labels.title,
    number: labels.number(folioRef(stay.id)),
    dateLabel: fmt.date(printedAt),
    details: [
      stay.guestName,
      labels.room(stay.roomNumber, stay.roomTypeName),
      `${short(stay.checkIn)} → ${short(stay.checkOut)}`,
    ],
    lines,
    totals: [
      { label: labels.roomTotal, amount: fmt.birr(totals.room) },
      { label: labels.extras, amount: fmt.birr(totals.charges) },
      ...paidRows,
      { label: labels.balance, amount: fmt.birr(totals.balance) },
    ],
    footer: labels.thanks,
  };
}

/** Plain text of the same folio, for a Telegram message. */
export function folioText(folio: Folio, tenantName: string): string {
  const out = [tenantName, `${folio.title} · ${folio.number}`, folio.dateLabel, ...folio.details, ""];
  for (const l of folio.lines) out.push(l.qty ? `${l.name} (${l.qty}): ${l.amount}` : `${l.name}: ${l.amount}`);
  out.push("");
  for (const t of folio.totals) out.push(`${t.label}: ${t.amount}`);
  out.push("", folio.footer);
  return out.join("\n");
}

/**
 * A Telegram share link carrying the folio text: reception picks the guest's
 * chat in Telegram and sends it from their own account. No bot key involved.
 */
export function telegramShareUrl(text: string): string {
  // t.me/share needs `url`; Telegram puts it first in the message, so the text goes there.
  return `https://t.me/share/url?url=${encodeURIComponent(text)}`;
}
