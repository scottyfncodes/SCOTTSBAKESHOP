import { describe, expect, it, vi } from "vitest";
import { normalizeProduct, resolveProductIds, toCents } from "@/lib/catalog";
import { sortForShelf } from "@/lib/display-order";
import { hatCatalog, hatSync, teeCatalog, teeSync } from "./fixtures";

describe("normalizeProduct", () => {
  const tee = normalizeProduct(teeSync, teeCatalog)!;

  it("keeps the existing Printful sync IDs", () => {
    expect(tee.id).toBe(1001);
    expect(tee.variants.map((v) => v.id)).toEqual([5003, 5001, 5002, 5005]);
    expect(tee.variants.find((v) => v.id === 5001)?.catalogVariantId).toBe(4016);
  });

  it("drops ignored variants and orders sizes like the Printful catalog", () => {
    expect(tee.sizes).toEqual(["S", "M", "L", "2XL"]);
  });

  it("uses Printful retail prices in cents and marks out-of-stock variants unavailable", () => {
    const xxl = tee.variants.find((v) => v.size === "2XL")!;
    expect(xxl.price).toBe(3700);
    expect(xxl.available).toBe(false);
    expect(tee.variants.find((v) => v.size === "S")!.available).toBe(true);
  });

  it("uses variant preview mockups and catalog description", () => {
    expect(tee.variants[0].image).toBe("https://files.cdn.printful.com/preview-5003.png");
    expect(tee.description).toContain("100% cotton");
    expect(tee.colors).toEqual([{ name: "Black", code: "#0c0c0c" }]);
  });

  it("puts apparel sizes in wearing order even when Printful lists them alphabetically", () => {
    const alpha = { ...teeCatalog, variants: [...teeCatalog.variants].sort((a, b) => a.size.localeCompare(b.size)) };
    expect(normalizeProduct(teeSync, alpha)!.sizes).toEqual(["S", "M", "L", "2XL"]);
  });

  it("keeps product mockups and leaves out bare print-file artwork", () => {
    const sync = {
      ...teeSync,
      sync_variants: teeSync.sync_variants.map((v, i) =>
        i === 0
          ? {
              ...v,
              files: [
                { type: "back", preview_url: "https://files.cdn.printful.com/back-art.png", thumbnail_url: null },
                { type: "preview", preview_url: "https://files.cdn.printful.com/front-mockup.png", thumbnail_url: null },
                { type: "default", preview_url: "https://files.cdn.printful.com/front-art.png", thumbnail_url: null },
              ],
            }
          : v,
      ),
    };
    const p = normalizeProduct(sync, teeCatalog)!;
    expect(p.variants[0].images).toEqual(["https://files.cdn.printful.com/front-mockup.png"]);
    expect(p.images).toContain("https://files.cdn.printful.com/tee.png");
    expect(p.images.some((u) => u.includes("-art"))).toBe(false);
    expect(new Set(p.images).size).toBe(p.images.length);
  });

  it("attaches our own photos by product name; the tee's back photo is its main picture", () => {
    const tee = normalizeProduct(teeSync, teeCatalog)!;
    expect(tee.photos).toEqual(["/products/tee-back.jpg", "/products/tee-print.jpg"]);
    expect(tee.photosLead).toBe(true);
    expect(tee.image).toBe("/products/tee-back.jpg");

    const hat = normalizeProduct(hatSync, hatCatalog)!;
    expect(hat.photos).toEqual(["/products/hat-side.jpg", "/products/hat-back.jpg"]);
    expect(hat.photosLead).toBe(false);
    expect(hat.image).toBe("https://files.cdn.printful.com/hat.png");
  });

  it("handles color-only products (hat)", () => {
    const hat = normalizeProduct(hatSync, hatCatalog)!;
    expect(hat.colors.map((c) => c.name)).toEqual(["Khaki", "Stone"]);
    expect(hat.sizes).toEqual(["One size"]);
  });

  it("never sells a variant without a retail price", () => {
    const p = normalizeProduct({ ...hatSync, sync_variants: [{ ...hatSync.sync_variants[0], retail_price: null }] }, hatCatalog)!;
    expect(p.variants[0].available).toBe(false);
  });

  it("toCents rounds and rejects junk", () => {
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("0")).toBe(0);
    expect(toCents("abc")).toBe(0);
    expect(toCents(null)).toBe(0);
  });
});

describe("resolveProductIds", () => {
  const store = [
    { id: 11, name: "Hoodie", thumbnail_url: null, variants: 5, synced: 5 },
    { id: 12, name: "Old mug", thumbnail_url: null, variants: 1, synced: 1, is_ignored: true },
    { id: 13, name: "Draft tee", thumbnail_url: null, variants: 4, synced: 0 },
    { id: 14, name: "Hat", thumbnail_url: null, variants: 2, synced: 2 },
  ];
  const client = { listStoreProducts: vi.fn(async () => store) };

  it("uses PRINTFUL_PRODUCT_IDS as given when set, without listing the store", async () => {
    client.listStoreProducts.mockClear();
    expect(await resolveProductIds(client, ["14", "11"], 300)).toEqual(["14", "11"]);
    expect(client.listStoreProducts).not.toHaveBeenCalled();
  });

  it("otherwise sells every synced, non-ignored store product in store order", async () => {
    expect(await resolveProductIds(client, [], 300)).toEqual(["11", "14"]);
    expect(client.listStoreProducts).toHaveBeenCalledWith(300);
  });
});

describe("sortForShelf", () => {
  it("orders tee, hat, mug, hoodie, then anything else in its original order", () => {
    const names = ["Unisex Hoodie", "Black Glossy Mug", "Sticker", "Hat", "T-Shirt - Black", "Tote"];
    expect(sortForShelf(names.map((name) => ({ name }))).map((p) => p.name)).toEqual([
      "T-Shirt - Black",
      "Hat",
      "Black Glossy Mug",
      "Unisex Hoodie",
      "Sticker",
      "Tote",
    ]);
  });
});

describe("loadProduct", () => {
  it("skips a product Printful no longer has (404) instead of failing the shop", async () => {
    const { loadProduct } = await import("@/lib/catalog");
    const { PrintfulError } = await import("@/lib/printful");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = {
      getStoreProduct: vi.fn().mockRejectedValue(new PrintfulError("Printful 404: Not Found (GET /store/products/1)", 404)),
      getCatalogProduct: vi.fn(),
    };
    await expect(loadProduct("1", false, client)).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("still fails on other Printful errors", async () => {
    const { loadProduct } = await import("@/lib/catalog");
    const { PrintfulError } = await import("@/lib/printful");
    const client = {
      getStoreProduct: vi.fn().mockRejectedValue(new PrintfulError("Printful 500: down", 500)),
      getCatalogProduct: vi.fn(),
    };
    await expect(loadProduct("1", false, client)).rejects.toThrow("500");
  });

  it("loads a product that exists", async () => {
    const { loadProduct } = await import("@/lib/catalog");
    const client = { getStoreProduct: vi.fn().mockResolvedValue(teeSync), getCatalogProduct: vi.fn().mockResolvedValue(teeCatalog) };
    expect((await loadProduct("1001", false, client))?.id).toBe(1001);
  });
});

describe("dropDuplicateListings", () => {
  it("hides an exact duplicate listing and keeps the first", async () => {
    const { dropDuplicateListings } = await import("@/lib/display-order");
    const v = [{ color: "White", size: "4″×4″", price: 299 }];
    const out = dropDuplicateListings([
      { id: 1, name: "Bubble-free stickers", variants: v },
      { id: 2, name: "Bubble-free stickers", variants: [...v] },
    ]);
    expect(out.map((p) => p.id)).toEqual([1]);
  });

  it("keeps two designs on the same blank (different mockups)", async () => {
    const { dropDuplicateListings } = await import("@/lib/display-order");
    const out = dropDuplicateListings([
      { id: 1, name: "Bubble-free stickers", variants: [{ color: "White", size: "4″×4″", price: 299, image: "a.png" }] },
      { id: 2, name: "Bubble-free stickers", variants: [{ color: "White", size: "4″×4″", price: 299, image: "b.png" }] },
    ]);
    expect(out.map((p) => p.id)).toEqual([1, 2]);
  });

  it("keeps listings that differ in color, size or price", async () => {
    const { dropDuplicateListings } = await import("@/lib/display-order");
    const out = dropDuplicateListings([
      { id: 1, name: "T-Shirt", variants: [{ color: "Black", size: "M", price: 2900 }] },
      { id: 2, name: "T-Shirt", variants: [{ color: "White", size: "M", price: 2900 }] },
      { id: 3, name: "T-Shirt", variants: [{ color: "Black", size: "M", price: 3100 }] },
    ]);
    expect(out.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe("Printful ID names", () => {
  it("names the two stickers by their confirmed design", () => {
    const base = { sync_variants: hatSync.sync_variants };
    const lgtb = normalizeProduct({ ...base, sync_product: { id: 487916110, name: "Bubble-free stickers", thumbnail_url: null } }, null)!;
    const gfp = normalizeProduct({ ...base, sync_product: { id: 487915950, name: "Bubble-free stickers", thumbnail_url: null } }, null)!;
    expect(lgtb.name).toBe("Let\u2019s Get This Bread Sticker");
    expect(lgtb.photosLead).toBe(true);
    expect(gfp.name).toBe("Gluten for Punishment Sticker");
    expect(gfp.photos).toEqual([]);
  });
});
