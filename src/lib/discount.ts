// The automatic bundle discount. Shared by the server (which charges it) and
// the cart UI (which previews it), so both always agree. No secrets here.

export const BUNDLE_MIN_UNITS = 2;
export const BUNDLE_PERCENT = 10;
export const BUNDLE_LABEL = `Bundle Discount (${BUNDLE_PERCENT}%)`;
export const BUNDLE_PROMO_LEAD = "A little extra love:";
export const BUNDLE_PROMO = `Get ${BUNDLE_PERCENT}% off when you bundle ${BUNDLE_MIN_UNITS} or more items.`;

/**
 * Discount in cents on a merchandise subtotal (cents). Any mix of products
 * counts; it's the total number of units that matters. Shipping and tax are
 * never part of `subtotal`, so they're never discounted.
 */
export function bundleDiscount(units: number, subtotal: number): number {
  if (units < BUNDLE_MIN_UNITS || subtotal <= 0) return 0;
  return Math.round((subtotal * BUNDLE_PERCENT) / 100);
}

export interface MerchTotals {
  units: number;
  /** Merchandise subtotal before the discount. */
  subtotal: number;
  discount: number;
  /** Merchandise subtotal after the discount. */
  total: number;
}

export function merchTotals(lines: { unitPrice: number; quantity: number }[]): MerchTotals {
  const units = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = bundleDiscount(units, subtotal);
  return { units, subtotal, discount, total: subtotal - discount };
}
