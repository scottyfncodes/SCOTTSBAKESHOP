import { formatMoney } from "./format";
import type { Product } from "./types";

/** "$29.00", "From $25.00" or "Sold out", priced from the variants you can buy. */
export function fromPrice(product: Product): string {
  const available = product.variants.filter((v) => v.available);
  if (available.length === 0) return "Sold out";
  const prices = available.map((v) => v.price);
  const min = Math.min(...prices);
  return `${min !== Math.max(...prices) ? "From " : ""}${formatMoney(min, product.currency)}`;
}
