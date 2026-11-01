import { describe, expect, it } from "vitest";
import { cartTotals } from "@/components/cart-totals";
import { normalizeProduct } from "@/lib/catalog";
import { bundleDiscount, merchTotals } from "@/lib/discount";
import { priceCart } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";
import { hatCatalog, hatSync, teeCatalog, teeSync } from "./fixtures";

const products = [normalizeProduct(teeSync, teeCatalog)!, normalizeProduct(hatSync, hatCatalog)!];
const variant = (id: number) => products.flatMap((p) => p.variants).find((v) => v.id === id)!;
const preview = (lines: CartLine[]) => cartTotals(lines.map((line) => ({ line, match: { variant: variant(line.variantId) } })));

describe("bundleDiscount", () => {
  it("is 10% of the merchandise subtotal from 2 units up", () => {
    expect(bundleDiscount(0, 0)).toBe(0);
    expect(bundleDiscount(1, 3500)).toBe(0);
    expect(bundleDiscount(2, 7000)).toBe(700);
    expect(bundleDiscount(3, 9000)).toBe(900);
    expect(bundleDiscount(10, 35000)).toBe(3500);
  });

  it("rounds to the nearest cent", () => {
    expect(bundleDiscount(2, 3995)).toBe(400); // 399.5
    expect(bundleDiscount(2, 3994)).toBe(399); // 399.4
  });

  it("reports original, discount and discounted merchandise totals", () => {
    expect(merchTotals([{ unitPrice: 3500, quantity: 1 }, { unitPrice: 2000, quantity: 1 }])).toEqual({ units: 2, subtotal: 5500, discount: 550, total: 4950 });
  });
});

describe("cart and server agree", () => {
  const carts: [string, CartLine[], number][] = [
    ["one item", [{ variantId: 5001, quantity: 1 }], 0],
    ["two of the same", [{ variantId: 5001, quantity: 2 }], 700],
    ["tee + hat", [{ variantId: 5001, quantity: 1 }, { variantId: 6001, quantity: 1 }], 550],
    ["two hat colors", [{ variantId: 6001, quantity: 1 }, { variantId: 6002, quantity: 1 }], 400],
    ["three mixed", [{ variantId: 5001, quantity: 1 }, { variantId: 5002, quantity: 1 }, { variantId: 6001, quantity: 1 }], 900],
    ["the same variant split over two lines", [{ variantId: 5001, quantity: 1 }, { variantId: 5001, quantity: 1 }], 700],
  ];
  it.each(carts)("%s", (_name, lines, discount) => {
    const server = priceCart(products, lines);
    expect(server.discount).toBe(discount);
    expect(server.total).toBe(server.subtotal - discount);
    expect(preview(lines)).toEqual({ units: server.units, subtotal: server.subtotal, discount: server.discount, total: server.total });
  });

  it("removing an item that drops the cart below 2 removes the discount", () => {
    expect(priceCart(products, [{ variantId: 5001, quantity: 1 }, { variantId: 6001, quantity: 1 }]).discount).toBe(550);
    expect(priceCart(products, [{ variantId: 5001, quantity: 1 }]).discount).toBe(0);
    expect(preview([{ variantId: 6001, quantity: 1 }]).discount).toBe(0);
  });

  it("removing an item from 3 keeps the discount on the remaining 2", () => {
    expect(priceCart(products, [{ variantId: 5001, quantity: 1 }, { variantId: 6001, quantity: 2 }]).discount).toBe(750);
    expect(priceCart(products, [{ variantId: 6001, quantity: 2 }]).discount).toBe(400);
  });
});
