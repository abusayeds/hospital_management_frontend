/**
 * The API stores and returns money as integer POISHA (৳1 = 100 poisha), never
 * floating-point taka. Convert only at the edges: when showing and when typing.
 */
export const takaToPoisha = (taka: number): number => Math.round(taka * 100);
export const poishaToTaka = (poisha: number): number => poisha / 100;

/** 50000 → "৳500", 50050 → "৳500.50" */
export function formatPoisha(poisha: number | null | undefined): string {
  if (poisha == null) return "—";
  const taka = poisha / 100;
  return `৳${taka.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(taka) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
