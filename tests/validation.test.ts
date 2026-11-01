import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeProduct } from "@/lib/catalog";
import { MAX_LINES, MAX_QTY, addressSchema, cartSchema, checkoutRequestSchema } from "@/lib/validation";
import { hatCatalog, hatSync, teeCatalog, teeSync } from "./fixtures";

// Pins request validation so a zod upgrade can't silently change what the
// public checkout accepts or what it sends back.

const products = [normalizeProduct(teeSync, teeCatalog)!, normalizeProduct(hatSync, hatCatalog)!];

vi.mock("@/lib/catalog", async (orig) => ({
  ...(await orig<typeof import("@/lib/catalog")>()),
  getCatalog: vi.fn(async () => ({ status: "ok", products })),
}));
vi.mock("@/lib/printful", async (orig) => ({
  ...(await orig<typeof import("@/lib/printful")>()),
  printful: {
    shippingRates: vi.fn(async () => [
      { id: "STANDARD", name: "Flat Rate (3-4 business days)", rate: "4.75", currency: "USD", minDeliveryDays: 3, maxDeliveryDays: 4 },
    ]),
  },
}));
const stripe = {
  customers: { create: vi.fn(async () => ({ id: "cus_1" })) },
  coupons: {
    retrieve: vi.fn(async (id: string) => ({ id, valid: true, percent_off: null, currency: "usd", amount_off: Number(id.split("-").pop()) })),
  },
  checkout: {
    sessions: {
      create: vi.fn(async (p: { line_items: { quantity: number; price_data: { unit_amount: number } }[]; discounts?: { coupon: string }[] }) => ({
        client_secret: "cs_secret",
        amount_subtotal: p.line_items.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0),
        total_details: { amount_discount: p.discounts ? Number(p.discounts[0].coupon.split("-").pop()) : 0 },
      })),
    },
  },
};
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));

const { POST } = await import("@/app/api/checkout/route");

const address = { name: "Pat", email: "pat@example.com", address1: "1 Main St", city: "Denver", state: "CO", zip: "80202", country: "US" };
const line = (variantId = 5001, quantity = 1) => ({ variantId, quantity });

let ipCounter = 0;
async function post(body: unknown) {
  const res = await POST(
    new Request("https://scottsbakeshop.com/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++ipCounter}` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return { status: res.status, text: await res.text() };
}

const BAD_INPUT = '{"error":"Please check the highlighted details and try again."}';

beforeEach(() => {
  vi.stubEnv("SHIP_COUNTRIES", "US");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://scottsbakeshop.com");
  stripe.customers.create.mockClear();
  stripe.checkout.sessions.create.mockClear();
});

describe("cartSchema", () => {
  it("accepts 1 to MAX_LINES lines with quantities 1 to MAX_QTY", () => {
    expect(cartSchema.safeParse([line()]).success).toBe(true);
    expect(cartSchema.safeParse(Array.from({ length: MAX_LINES }, () => line(5001, MAX_QTY))).success).toBe(true);
  });

  it("rejects an empty cart with the cart-empty message", () => {
    const r = cartSchema.safeParse([]);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Your cart is empty");
  });

  it("rejects more than MAX_LINES lines", () => {
    expect(cartSchema.safeParse(Array.from({ length: MAX_LINES + 1 }, () => line())).success).toBe(false);
  });

  it.each([0, -1, MAX_QTY + 1, 1.5, "2", null, Number.POSITIVE_INFINITY])("rejects quantity %s", (quantity) => {
    expect(cartSchema.safeParse([{ variantId: 5001, quantity }]).success).toBe(false);
  });

  it.each([0, -5, 2.5, "5001"])("rejects variantId %s", (variantId) => {
    expect(cartSchema.safeParse([{ variantId, quantity: 1 }]).success).toBe(false);
  });

  it("strips unknown keys from lines", () => {
    expect(cartSchema.parse([{ variantId: 5001, quantity: 2, price: 1 }])).toEqual([{ variantId: 5001, quantity: 2 }]);
  });
});

describe("addressSchema", () => {
  it("trims fields, uppercases the country and drops blank optionals", () => {
    expect(
      addressSchema.parse({ ...address, name: "  Pat  ", email: " pat@example.com ", country: "us", address2: "", phone: "  " }),
    ).toEqual({ ...address, address2: undefined, phone: undefined });
  });

  it.each(["not-an-email", "pat@", "@example.com", "pat example@x.com"])("rejects email %s", (email) => {
    expect(addressSchema.safeParse({ ...address, email }).success).toBe(false);
  });

  it.each(["USA", "U", "1A"])("rejects country %s", (country) => {
    expect(addressSchema.safeParse({ ...address, country }).success).toBe(false);
  });

  it("rejects a missing required field and an over-long one", () => {
    expect(addressSchema.safeParse({ ...address, name: undefined }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, city: "x".repeat(101) }).success).toBe(false);
  });

  it("checkoutRequestSchema requires a shipping method", () => {
    expect(checkoutRequestSchema.safeParse({ items: [line()], address }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ items: [line()], address, shippingMethod: " " }).success).toBe(false);
  });
});

describe("POST /api/checkout", () => {
  it("creates a session for a valid request", async () => {
    const r = await post({ items: [line(5001, 2)], address, shippingMethod: "STANDARD" });
    expect(r).toEqual({ status: 200, text: '{"clientSecret":"cs_secret"}' });
  });

  it.each([
    ["too many lines", { items: Array.from({ length: MAX_LINES + 1 }, () => line()), address, shippingMethod: "STANDARD" }],
    ["zero quantity", { items: [line(5001, 0)], address, shippingMethod: "STANDARD" }],
    ["quantity over the max", { items: [line(5001, MAX_QTY + 1)], address, shippingMethod: "STANDARD" }],
    ["fractional quantity", { items: [line(5001, 1.5)], address, shippingMethod: "STANDARD" }],
    ["empty cart", { items: [], address, shippingMethod: "STANDARD" }],
    ["bad email", { items: [line()], address: { ...address, email: "nope" }, shippingMethod: "STANDARD" }],
    ["items not an array", { items: "5001", address, shippingMethod: "STANDARD" }],
  ])("returns the same generic 400 body for %s, without touching Stripe", async (_label, body) => {
    expect(await post(body)).toEqual({ status: 400, text: BAD_INPUT });
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });

  it("returns 422 with the cart message for an unknown variant", async () => {
    const r = await post({ items: [line(1, 1)], address, shippingMethod: "STANDARD" });
    expect(r).toEqual({ status: 422, text: '{"error":"An item in your cart is no longer sold. Please remove it."}' });
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
});
