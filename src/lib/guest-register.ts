/** Values the desk typed at recent check-ins (coming from, going to, purpose). */
export type RegisterSuggestionsDTO = { comingFrom: string[]; goingTo: string[]; purpose: string[] };

type Row = { coming_from: string | null; going_to: string | null; purpose: string | null };

/** Most recent distinct values per field, case-insensitive, first spelling wins, at most `max` each. */
export function recentDistinct(
  rows: Row[],
  max = 12,
): RegisterSuggestionsDTO {
  const pick = (key: keyof Row) => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      const v = r[key]?.trim();
      if (!v) continue;
      const k = v.toLocaleLowerCase();
      if (!seen.has(k)) seen.set(k, v);
      if (seen.size >= max) break;
    }
    return [...seen.values()];
  };
  return { comingFrom: pick("coming_from"), goingTo: pick("going_to"), purpose: pick("purpose") };
}
