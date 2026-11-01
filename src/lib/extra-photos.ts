// Our own product photos, shown in the product page gallery after the main
// Printful mockup. Matched on the product name, not its Printful ID, because
// re-publishing a product in Printful gives it a new ID.
// Files live in public/products/.
const EXTRA_PHOTOS: { match: RegExp; photos: string[] }[] = [
  { match: /hoodie/i, photos: ["/products/hoodie-back.jpg"] },
  { match: /t-?shirt|\btee\b/i, photos: ["/products/tee-back.jpg"] },
  { match: /\bhat\b|\bcap\b/i, photos: ["/products/hat-side.jpg", "/products/hat-back.jpg"] },
  { match: /\bmug\b/i, photos: ["/products/mug-front.jpg", "/products/mug-back.jpg"] },
];

export function extraPhotosFor(productName: string): string[] {
  return EXTRA_PHOTOS.find((e) => e.match.test(productName))?.photos ?? [];
}
