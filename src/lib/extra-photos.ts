// Our own product photos for the product page gallery. With `lead`, the first
// photo replaces the Printful mockup as the product's main picture (shop card
// and product page); otherwise they follow the mockup. Matched on the product name, not its Printful ID, because
// re-publishing a product in Printful gives it a new ID.
// Files live in public/products/.
const EXTRA_PHOTOS: { match: RegExp; photos: string[]; lead?: boolean }[] = [
  { match: /hoodie/i, photos: ["/products/hoodie-back.jpg", "/products/hoodie-print.jpg"], lead: true },
  { match: /t-?shirt|\btee\b/i, photos: ["/products/tee-back.jpg", "/products/tee-print.jpg"], lead: true },
  { match: /\bhat\b|\bcap\b/i, photos: ["/products/hat-side.jpg", "/products/hat-back.jpg"] },
  { match: /\bmug\b/i, photos: ["/products/mug-front.jpg", "/products/mug-back.jpg"] },
  {
    // Kurt's sticker mockups, only for a sticker whose Printful name says so.
    match: /(bread|lgtb).*sticker|sticker.*(bread|lgtb)/i,
    photos: ["/products/sticker-lgtb.webp", "/products/sticker-laptop.jpg", "/products/sticker-notebook.jpg", "/products/sticker-car.jpg"],
    lead: true,
  },
];

export function extraPhotosFor(productName: string): { photos: string[]; lead: boolean } {
  const entry = EXTRA_PHOTOS.find((e) => e.match.test(productName));
  return { photos: entry?.photos ?? [], lead: !!entry?.lead && !!entry.photos.length };
}
