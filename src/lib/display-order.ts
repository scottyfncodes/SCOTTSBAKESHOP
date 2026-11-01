// Shop shelf order, matched on product name (Printful IDs change when a product
// is re-published). Anything unmatched goes last, in Printful's order.
const SHELF_ORDER: RegExp[] = [/t-?shirt|\btee\b/i, /\bhat\b|\bcap\b/i, /\bmug\b/i, /hoodie/i];

export function shelfRank(productName: string): number {
  const i = SHELF_ORDER.findIndex((re) => re.test(productName));
  return i === -1 ? SHELF_ORDER.length : i;
}

/** Stable sort: equal ranks keep their incoming order. */
export function sortForShelf<T extends { name: string }>(products: T[]): T[] {
  return products
    .map((p, i) => ({ p, i, r: shelfRank(p.name) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.p);
}
