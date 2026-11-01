import { merchTotals } from "@/lib/discount";
import type { CartLine, Variant } from "@/lib/types";

/** Preview of the server's merchandise totals for the lines the browser can resolve. */
export function cartTotals(rows: { line: CartLine; match: { variant: Variant } | null }[]) {
  return merchTotals(rows.flatMap((r) => (r.match ? [{ unitPrice: r.match.variant.price, quantity: r.line.quantity }] : [])));
}
