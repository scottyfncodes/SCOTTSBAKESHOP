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
  /** The artwork image: the artist's original file ("art") or a crop of our own product photo ("photo"). */
  detail: string;
  detailKind: "art" | "photo";
  /** One or two sentences about the artwork. Facts only, nothing invented. */
  note: string;
  /** The artist, credited wherever the design appears. Only add credits the shop has confirmed. */
  artist?: { handle: string; url: string };
}

export const DESIGNS: Design[] = [
  {
    slug: "gluten-for-punishment",
    name: "Gluten for Punishment",
    detail: "/products/gluten-for-punishment-art.jpg",
    detailKind: "art",
    note: "An original Scott\u2019s idea, handed to an incredible artist to draw. A skeleton shoulders a loaf the size of a boulder, rendered in dense, woodcut-style line work. Sisyphus, but make it sourdough.",
    artist: { handle: "turdrodeo", url: "https://www.instagram.com/turdrodeo/" },
  },
  {
    slug: "lets-get-this-bread",
    name: "Let’s Get This Bread",
    detail: "/products/lets-get-this-bread-art.jpg",
    detailKind: "art",
    note: "Everybody knows the phrase. This is Kurt\u2019s take on it, set in a font he made by hand: warm, wobbly letters with a little saloon swagger.",
    artist: { handle: "kurt_player02", url: "https://www.instagram.com/kurt_player02/" },
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
  {
    match: /hoodie|sweatshirt/i,
    kind: "Hoodie",
    category: "Apparel",
    designs: ["gluten-for-punishment"],
    note: "The full Gluten for Punishment piece, printed large across the back so every line of the woodcut detail comes through. A soft hoodie with a front pouch pocket. It runs small, so size up.",
  },
  {
    match: /t-?shirt|\btee\b/i,
    kind: "Tee",
    category: "Apparel",
    designs: ["gluten-for-punishment"],
    note: "Gluten for Punishment, printed big across the back of a soft, lightweight black tee. Scott\u2019s idea, an artist\u2019s hand, and a skeleton who really commits to the bit.",
  },
  {
    match: /\bhat\b|\bcap\b/i,
    kind: "Dad Hat",
    category: "Headwear",
    designs: ["lets-get-this-bread"],
    note: "Kurt\u2019s hand-made Let\u2019s Get This Bread lettering across the front of a classic dad hat. Adjustable strap in the back, ready for the early shift.",
  },
  {
    match: /\bmug\b/i,
    kind: "Mug",
    category: "Accessories",
    designs: ["lets-get-this-bread", "gluten-for-punishment"],
    title: "Two-Sided Bake Shop Mug",
    note: "Two sides, two artists. Kurt\u2019s hand-lettered Let\u2019s Get This Bread on one side, the Gluten for Punishment skeleton on the other. A 15 oz black glossy mug for the first cup of the day.",
  },
  {
    match: /sticker/i,
    kind: "Sticker",
    category: "Accessories",
    designs: ["lets-get-this-bread"],
    note: "Kurt\u2019s hand-lettered Let\u2019s Get This Bread as a 4\u2033 \u00d7 4\u2033 sticker. For the laptop, the notebook, the back window of the car.",
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
