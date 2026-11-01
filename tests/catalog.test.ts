import { describe, expect, it, vi } from "vitest";
import { normalizeProduct, resolveProductIds, toCents } from "@/lib/catalog";
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
