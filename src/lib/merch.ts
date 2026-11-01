// Storefront merchandising: how each Printful product is presented (display
// title, collection, artwork). Presentation only. Checkout, Stripe and Printful
// keep using the real Printful product name and IDs.
//
// Matched on the Printful product name, like extra-photos.ts, because
// re-publishing a product in Printful gives it a new ID. A product that matches
// nothing still sells; it just shows its Printful name and no collection.

export type Category = "Apparel" | "Headwear" | "Accessories";

/** Shelf filter order. Only collections with at least one product are shown. */
export const CATEGORIES: Category[] = ["Apparel", "Headwear", "Accessories"];

export interface Design {
  slug: string;
  name: string;
  /** Close-up of the printed artwork, cropped from our own product photo. */
  detail: string;
  /** One or two sentences about the artwork. Facts only, nothing invented. */
  note: string;
  /** The artist, credited wherever the design appears. Only add credits the shop has confirmed. */
  artist?: { handle: string; url: string };
}

export const DESIGNS: Design[] = [
  {
    slug: "gluten-for-punishment",
    name: "Gluten for Punishment",
    detail: "/products/hoodie-print.jpg",
    note: "A skeleton hauling a loaf the size of a boulder, drawn like an old woodcut. Printed big across the back.",
    artist: { handle: "turdrodeo", url: "https://www.instagram.com/turdrodeo/" },
  },
  {
    slug: "lets-get-this-bread",
    name: "Let’s Get This Bread",
    detail: "/products/mug-print.jpg",
    note: "The house slogan in wobbly saloon lettering. Good on a hat, better on a Monday morning.",
  },
];

interface Rule {
  match: RegExp;
  kind: string;
  category: Category;
  /** Artwork on the product, in the order it's described. */
  designs: string[];
  /** Storefront title when the product carries more than one design. */
  title?: string;
  /** Overrides the design note on the product page. */
  note?: string;
}

const RULES: Rule[] = [
  { match: /hoodie|sweatshirt/i, kind: "Hoodie", category: "Apparel", designs: ["gluten-for-punishment"] },
  { match: /t-?shirt|\btee\b/i, kind: "Tee", category: "Apparel", designs: ["gluten-for-punishment"] },
  { match: /\bhat\b|\bcap\b/i, kind: "Dad Hat", category: "Headwear", designs: ["lets-get-this-bread"] },
  {
    match: /\bmug\b/i,
    kind: "Mug",
    category: "Accessories",
    designs: ["lets-get-this-bread", "gluten-for-punishment"],
    title: "Two-Sided Bake Shop Mug",
    note: "Let\u2019s Get This Bread on one side, Gluten for Punishment on the other. Black glossy ceramic.",
  },
];

export interface Merch {
  /** Storefront title, e.g. "Gluten for Punishment Tee". */
  title: string;
  /** Short product type for small labels, e.g. "Tee". */
  kind: string | null;
  category: Category | null;
  designs: Design[];
  /** A sentence about the artwork for the product page. */
  note: string | null;
}

export function merchFor(productName: string): Merch {
  const rule = RULES.find((r) => r.match.test(productName));
  if (!rule) return { title: productName, kind: null, category: null, designs: [], note: null };
  const designs = rule.designs.map((slug) => DESIGNS.find((d) => d.slug === slug)).filter((d): d is Design => !!d);
  const single = designs.length === 1 ? designs[0] : null;
  return {
    title: rule.title ?? (single ? `${single.name} ${rule.kind}` : productName),
    kind: rule.kind,
    category: rule.category,
    designs,
    note: rule.note ?? single?.note ?? null,
  };
}

/**
 * Picture for a cart or checkout line: our own lead photo when the product has
 * only one color (so it can't show the wrong color), else the variant mockup.
 */
export function lineImage(
  product: { image: string | null; photosLead: boolean; colors: unknown[] },
  variant: { image: string | null },
): string | null {
  return product.photosLead && product.colors.length <= 1 ? product.image : variant.image;
}
