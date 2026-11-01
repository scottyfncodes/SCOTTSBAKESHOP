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
  /** Our "Product details" copy, rewritten from Printful's description (facts only). */
  details?: Details;
}

export interface Details {
  intro: string;
  specs: string[];
  /** Fit or care note worth calling out. */
  note?: string;
}

// Rewritten from Printful's own product descriptions. Every spec here comes
// from Printful or the product's variants; nothing is added. If a product's
// blank changes in Printful, update these too.
const STICKER_DETAILS: Details = {
  intro: "Printed on durable, high-opacity vinyl that goes on without bubbles. Opaque enough to cover an old sticker or a chip in the paint.",
  specs: ["4\u2033 \u00d7 4\u2033", "High-opacity vinyl, no see-through", "Bubble-free application", "Durable 95\u00b5 vinyl"],
  note: "Clean the surface before you stick it.",
};

const RULES: Rule[] = [
  {
    match: /hoodie|sweatshirt/i,
    kind: "Hoodie",
    category: "Apparel",
    designs: ["gluten-for-punishment"],
    note: "The full Gluten for Punishment piece, printed large across the back so every line of the woodcut detail comes through. A soft hoodie with a front pouch pocket. It runs small, so size up.",
    details: {
      intro: "A classic hoodie with a soft cotton face, a warm hood and a front pouch pocket.",
      specs: [
        "100% cotton face, 65% ring-spun cotton and 35% polyester",
        "3-panel hood with matching flat drawstrings",
        "Front pouch pocket",
        "Self-fabric patch on the back",
        "Blank made in Pakistan",
      ],
      note: "Runs small. Order one size up from your usual.",
    },
  },
  {
    match: /t-?shirt|\btee\b/i,
    kind: "Tee",
    category: "Apparel",
    designs: ["gluten-for-punishment"],
    note: "Gluten for Punishment, printed big across the back of a soft, lightweight black tee. Scott\u2019s idea, an artist\u2019s hand, and a skeleton who really commits to the bit.",
    details: {
      intro: "A soft, lightweight tee with a little stretch and an easy fit.",
      specs: [
        "Combed, ring-spun cotton; the Black Heather blend includes some polyester",
        "Lightweight 4.2 oz/yd\u00b2 (142 g/m\u00b2) fabric",
        "Pre-shrunk",
        "Side-seamed, with shoulder-to-shoulder taping",
        "Blank made in Nicaragua, Mexico, Honduras or the US",
      ],
      note: "The fabric is light, so it can look slightly sheer in strong light.",
    },
  },
  {
    match: /\bhat\b|\bcap\b/i,
    kind: "Dad Hat",
    category: "Headwear",
    designs: ["lets-get-this-bread"],
    note: "Kurt\u2019s hand-made Let\u2019s Get This Bread lettering across the front of a classic dad hat. Adjustable strap in the back, ready for the early shift.",
    details: {
      intro: "A low-profile dad hat with a curved visor. One size, adjustable.",
      specs: [
        "100% chino cotton twill",
        "Unstructured, 6-panel, low profile",
        "3\u215b\u2033 (7.6 cm) crown",
        "6 embroidered eyelets",
        "Adjustable strap with an antique buckle",
        "Blank made in Vietnam or Bangladesh",
      ],
    },
  },
  {
    match: /\bmug\b/i,
    kind: "Mug",
    category: "Accessories",
    designs: ["lets-get-this-bread", "gluten-for-punishment"],
    title: "Two-Sided Bake Shop Mug",
    note: "Two sides, two artists. Kurt\u2019s hand-lettered Let\u2019s Get This Bread on one side, the Gluten for Punishment skeleton on the other. A 15 oz black glossy mug for the first cup of the day.",
    details: {
      intro: "A sturdy ceramic mug with a glossy black finish, sized for a proper first cup.",
      specs: [
        "15 oz, 4.7\u2033 (12 cm) tall, 3.35\u2033 (8.5 cm) across",
        "Ceramic, lead and BPA free",
        "Glossy finish",
        "Dishwasher and microwave safe",
      ],
    },
  },
  // Stickers share one Printful blank, so the design comes from the product's
  // name in Printful (e.g. "Gluten for Punishment Sticker").
  {
    match: /(gluten|punishment).*sticker|sticker.*(gluten|punishment)/i,
    kind: "Sticker",
    category: "Accessories",
    designs: ["gluten-for-punishment"],
    note: "The Gluten for Punishment skeleton and his boulder-sized loaf as a 4\u2033 \u00d7 4\u2033 sticker. Every woodcut line, small enough for a water bottle.",
    details: STICKER_DETAILS,
  },
  {
    match: /(bread|lgtb).*sticker|sticker.*(bread|lgtb)/i,
    kind: "Sticker",
    category: "Accessories",
    designs: ["lets-get-this-bread"],
    note: "Kurt\u2019s hand-lettered Let\u2019s Get This Bread as a 4\u2033 \u00d7 4\u2033 sticker. For the laptop, the notebook, the back window of the car.",
    details: STICKER_DETAILS,
  },
  {
    // A sticker whose name doesn't say which design: no design is guessed.
    match: /sticker/i,
    kind: "Sticker",
    category: "Accessories",
    designs: [],
    title: "Bake Shop Sticker",
    details: STICKER_DETAILS,
  },
];

/**
 * Printful listings whose Printful name doesn't say which design they carry
 * (both stickers are "Bubble-free stickers"). Keyed by Printful sync product
 * ID, confirmed by the shop. If a product is re-published it gets a new ID and
 * falls back to its Printful name, so renaming it in Printful (e.g. "Gluten for
 * Punishment Sticker") is the lasting fix.
 */
export const NAME_BY_PRINTFUL_ID: Record<number, string> = {
  487916110: "Let\u2019s Get This Bread Sticker",
  487915950: "Gluten for Punishment Sticker",
};

export interface Merch {
  /** Storefront title, e.g. "Gluten for Punishment Tee". */
  title: string;
  /** Short product type for small labels, e.g. "Tee". */
  kind: string | null;
  category: Category | null;
  designs: Design[];
  /** A sentence about the artwork for the product page. */
  note: string | null;
  /** Our product details copy; null means show Printful's description. */
  details: Details | null;
}

export function merchFor(productName: string): Merch {
  const rule = RULES.find((r) => r.match.test(productName));
  if (!rule) return { title: productName, kind: null, category: null, designs: [], note: null, details: null };
  const designs = rule.designs.map((slug) => DESIGNS.find((d) => d.slug === slug)).filter((d): d is Design => !!d);
  const single = designs.length === 1 ? designs[0] : null;
  return {
    title: rule.title ?? (single ? `${single.name} ${rule.kind}` : productName),
    kind: rule.kind,
    category: rule.category,
    designs,
    note: rule.note ?? single?.note ?? null,
    details: rule.details ?? null,
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
