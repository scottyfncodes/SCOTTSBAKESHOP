import { findVariant } from "./catalog";
import type { CartLine, Product, Variant } from "./types";
import { merchFor } from "./merch";
import { merchTotals } from "./discount";

export class CartError extends Error {}

export interface PricedLine {
  product: Product;
  variant: Variant;
  quantity: number;
  lineTotal: number;
}

/**
 * Re-prices a cart against the server-side catalog. Only variant IDs and
 * quantities come from the browser; every price comes from Printful.
 */
export function priceCart(products: Product[], lines: CartLine[]) {
  const merged = new Map<number, number>();
  for (const l of lines) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);

  const priced: PricedLine[] = [];
  for (const [variantId, quantity] of merged) {
    const match = findVariant(products, variantId);
    if (!match) throw new CartError("An item in your cart is no longer sold. Please remove it.");
    if (!match.variant.available)
      throw new CartError(`${describe(match.product, match.variant)} is currently unavailable.`);
    priced.push({ ...match, quantity, lineTotal: match.variant.price * quantity });
  }

  const currencies = new Set(priced.map((l) => l.variant.currency));
  if (currencies.size !== 1) throw new CartError("Cart contains mixed currencies.");

  return {
    lines: priced,
    currency: priced[0].variant.currency,
    ...merchTotals(priced.map((l) => ({ unitPrice: l.variant.price, quantity: l.quantity }))),
  };
}

export function describe(product: Product, variant: Variant): string {
  const opts = [variant.color, variant.size].filter(Boolean).join(" / ");
  const title = merchFor(product.name).title;
  return opts ? `${title} (${opts})` : title;
}

/** Compact "variantId:qty:unitCents,…" form stored in Stripe metadata (500-char limit). */
export function encodeItems(lines: { variant: { id: number; price: number }; quantity: number }[]): string {
  return lines.map((l) => `${l.variant.id}:${l.quantity}:${l.variant.price}`).join(",");
}

export interface PaidLine extends CartLine {
  unitPrice: number;
}

export function decodeItems(value: string | undefined | null): PaidLine[] {
  if (!value) return [];
  return value.split(",").flatMap((entry) => {
    const [id, qty, price] = entry.split(":").map(Number);
    return Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0 && Number.isInteger(price) && price >= 0
      ? [{ variantId: id, quantity: qty, unitPrice: price }]
      : [];
  });
}
