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

/**
 * Hide exact duplicate listings: same name and the same variants (color, size,
 * price). Printful can end up with two copies of a product while it's being set
 * up; shoppers should see one. The first listing in Printful's order is kept.
 * Anything that differs at all (another color, size or price) stays visible.
 */
export function dropDuplicateListings<
  T extends { name: string; variants: { color: string | null; size: string | null; price: number }[] },
>(products: T[]): T[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const variants = p.variants.map((v) => `${v.color}|${v.size}|${v.price}`).sort().join(",");
    const key = `${p.name.trim().toLowerCase()}::${variants}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
