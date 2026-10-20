import { describe, expect, it } from "vitest";
import { normalizeProduct } from "@/lib/catalog";
import { CartError, decodeItems, encodeItems, priceCart } from "@/lib/pricing";
import { cartSchema, checkoutRequestSchema, MAX_LINES } from "@/lib/validation";
import { hatCatalog, hatSync, teeCatalog, teeSync } from "./fixtures";

const products = [normalizeProduct(teeSync, teeCatalog)!, normalizeProduct(hatSync, hatCatalog)!];

describe("priceCart", () => {
  it("prices from the catalog and merges duplicate lines", () => {
    const cart = priceCart(products, [
      { variantId: 5001, quantity: 1 },
      { variantId: 6001, quantity: 2 },
      { variantId: 5001, quantity: 1 },
    ]);
    expect(cart.subtotal).toBe(2 * 3500 + 2 * 2000);
    expect(cart.currency).toBe("USD");
    expect(cart.lines).toHaveLength(2);
  });

  it("rejects unknown variant IDs", () => {
    expect(() => priceCart(products, [{ variantId: 999999, quantity: 1 }])).toThrow(CartError);
  });

  it("rejects ignored (unlisted) variants", () => {
    expect(() => priceCart(products, [{ variantId: 5004, quantity: 1 }])).toThrow(CartError);
  });

  it("rejects unavailable variants", () => {
    expect(() => priceCart(products, [{ variantId: 5005, quantity: 1 }])).toThrow(/unavailable/);
  });
});

describe("request validation", () => {
  it("strips client-supplied prices so they can't influence the charge", () => {
    const parsed = cartSchema.parse([{ variantId: 5001, quantity: 1, price: 1, unit_amount: 1 }]);
    expect(parsed).toEqual([{ variantId: 5001, quantity: 1 }]);
    expect(priceCart(products, parsed).subtotal).toBe(3500);
  });

  it("bounds quantity and line count", () => {
    expect(() => cartSchema.parse([{ variantId: 1, quantity: 0 }])).toThrow();
    expect(() => cartSchema.parse([{ variantId: 1, quantity: 11 }])).toThrow();
    expect(() => cartSchema.parse([{ variantId: 1.5, quantity: 1 }])).toThrow();
    expect(() => cartSchema.parse([])).toThrow();
    expect(() => cartSchema.parse(Array.from({ length: MAX_LINES + 1 }, (_, i) => ({ variantId: i + 1, quantity: 1 })))).toThrow();
  });

  it("validates the shipping address", () => {
    const ok = {
      items: [{ variantId: 5001, quantity: 1 }],
      shippingMethod: "STANDARD",
      address: { name: "Pat", email: "pat@example.com", address1: "1 Main St", city: "Denver", state: "CO", zip: "80202", country: "us" },
    };
    expect(checkoutRequestSchema.parse(ok).address.country).toBe("US");
    expect(() => checkoutRequestSchema.parse({ ...ok, address: { ...ok.address, email: "nope" } })).toThrow();
    expect(() => checkoutRequestSchema.parse({ ...ok, address: { ...ok.address, address1: "" } })).toThrow();
  });
});

describe("metadata item encoding", () => {
  it("round-trips and fits Stripe's 500-char metadata limit at max cart size", () => {
    const lines = Array.from({ length: MAX_LINES }, (_, i) => ({ variant: { id: 4_000_000_000 + i, price: 99999 }, quantity: 10 }));
    const encoded = encodeItems(lines);
    expect(encoded.length).toBeLessThanOrEqual(500);
    expect(decodeItems(encoded)).toHaveLength(MAX_LINES);
  });

  it("ignores malformed entries", () => {
    expect(decodeItems("5001:2:3500,bad,6001:x:1,7:0:1")).toEqual([{ variantId: 5001, quantity: 2, unitPrice: 3500 }]);
    expect(decodeItems(undefined)).toEqual([]);
  });
});
