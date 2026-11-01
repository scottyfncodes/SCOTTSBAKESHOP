import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { normalizeProduct } from "@/lib/catalog";
import { hatCatalog, hatSync, teeCatalog, teeSync } from "./fixtures";

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

const { createCheckoutSession, returnOrigin } = await import("@/lib/checkout");
const { printful } = await import("@/lib/printful");
const { checkoutRequestSchema } = await import("@/lib/validation");

const address = { name: "Pat", email: "pat@example.com", address1: "1 Main St", city: "Denver", state: "CO", zip: "80202", country: "US" };

type Params = {
  line_items: { quantity: number; price_data: { unit_amount: number } }[];
  shipping_options: { shipping_rate_data: { fixed_amount: { amount: number } } }[];
  discounts?: { coupon: string }[];
  ui_mode?: string;
  metadata?: Record<string, string>;
};
type Coupon = { id: string; amount_off: number; currency: string; percent_off: number | null; valid: boolean };
const stripeError = (code: string) => Object.assign(new Error(code), { code });

/** Computes session totals the way Stripe does: line items, minus the coupon, plus shipping (tax off). */
function fakeStripe() {
  const coupons = new Map<string, Coupon>();
  return {
    coupons: {
      store: coupons,
      retrieve: vi.fn(async (id: string) => {
        const c = coupons.get(id);
        if (!c) throw stripeError("resource_missing");
        return c;
      }),
      create: vi.fn(async (p: { id: string; amount_off: number; currency: string }) => {
        if (coupons.has(p.id)) throw stripeError("resource_already_exists");
        const c = { ...p, percent_off: null, valid: true };
        coupons.set(p.id, c);
        return c;
      }),
    },
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_1" }) },
    checkout: {
      sessions: {
        create: vi.fn(async (p: Params) => {
          if ((p.discounts?.length ?? 0) > 1) throw new Error("Stripe allows one discount per session");
          const subtotal = p.line_items.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0);
          const coupon = p.discounts?.[0] ? coupons.get(p.discounts[0].coupon) : undefined;
          const discount = coupon ? Math.min(coupon.amount_off, subtotal) : 0;
          const shipping = p.shipping_options[0].shipping_rate_data.fixed_amount.amount;
          return {
            id: "cs_test_1",
            client_secret: "cs_secret",
            amount_subtotal: subtotal,
            amount_total: subtotal - discount + shipping,
            total_details: { amount_discount: discount, amount_shipping: shipping, amount_tax: 0 },
          };
        }),
        expire: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

async function checkout(items: { variantId: number; quantity: number }[], stripe = fakeStripe()) {
  const res = await createCheckoutSession(stripe as unknown as Stripe, { items, address, shippingMethod: "STANDARD" });
  const params = stripe.checkout.sessions.create.mock.calls.at(-1)![0] as Params & { metadata: Record<string, string> };
  const session = await stripe.checkout.sessions.create.mock.results.at(-1)!.value;
  return { res, params, session, stripe };
}

beforeEach(() => vi.stubEnv("SHIP_COUNTRIES", "US"));

describe("createCheckoutSession", () => {
  it("charges catalog prices and Printful's live shipping rate", async () => {
    const stripe = fakeStripe();
    const res = await createCheckoutSession(stripe as unknown as Stripe, { items: [{ variantId: 5001, quantity: 2 }], address, shippingMethod: "STANDARD" });
    expect(res).toEqual({ clientSecret: "cs_secret" });
    const params = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(params.ui_mode).toBe("embedded");
    expect(params.line_items[0]).toMatchObject({ quantity: 2, price_data: { unit_amount: 3500, currency: "usd" } });
    expect(params.shipping_options[0].shipping_rate_data.fixed_amount).toEqual({ amount: 475, currency: "usd" });
    expect(params.metadata).toEqual({ items: "5001:2:3500", shipping_method: "STANDARD", bundle_discount: "700" });
    expect(vi.mocked(printful.shippingRates).mock.calls[0][1]).toEqual([{ variant_id: 4016, quantity: 2 }]);
  });

  it("rejects a shipping method Printful didn't offer", async () => {
    const stripe = fakeStripe();
    await expect(
      createCheckoutSession(stripe as unknown as Stripe, { items: [{ variantId: 5001, quantity: 1 }], address, shippingMethod: "FREE" }),
    ).rejects.toThrow(/shipping option/);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("rejects destinations outside SHIP_COUNTRIES", async () => {
    const stripe = fakeStripe();
    await expect(
      createCheckoutSession(stripe as unknown as Stripe, { items: [{ variantId: 5001, quantity: 1 }], address: { ...address, country: "FR" }, shippingMethod: "STANDARD" }),
    ).rejects.toThrow(/ship/);
  });

  it("rejects unknown variants before touching Stripe", async () => {
    const stripe = fakeStripe();
    await expect(
      createCheckoutSession(stripe as unknown as Stripe, { items: [{ variantId: 1, quantity: 1 }], address, shippingMethod: "STANDARD" }),
    ).rejects.toThrow();
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
});

describe("bundle discount at checkout", () => {
  // Tee $35.00 (5001-5003), hat $20.00 (6001-6002), shipping $4.75.
  it("one item: no discount, Stripe charges list price plus shipping", async () => {
    const { params, session, stripe } = await checkout([{ variantId: 5001, quantity: 1 }]);
    expect(params.discounts).toBeUndefined();
    expect(params.metadata.bundle_discount).toBe("0");
    expect(stripe.coupons.create).not.toHaveBeenCalled();
    expect(session.amount_total).toBe(3500 + 475);
  });

  it("two of the same item: 10% off the merchandise only", async () => {
    const { params, session, stripe } = await checkout([{ variantId: 5001, quantity: 2 }]);
    expect(params.discounts).toEqual([{ coupon: "bundle10-usd-700" }]);
    expect(stripe.coupons.create).toHaveBeenCalledWith(expect.objectContaining({ amount_off: 700, currency: "usd", duration: "once", name: "Bundle Discount (10%)" }));
    expect(session.total_details.amount_discount).toBe(700);
    expect(session.amount_total).toBe(7000 - 700 + 475);
  });

  it("two different products qualify", async () => {
    const { session } = await checkout([{ variantId: 5001, quantity: 1 }, { variantId: 6001, quantity: 1 }]);
    expect(session.total_details.amount_discount).toBe(550);
    expect(session.amount_total).toBe(5500 - 550 + 475);
  });

  it("two sizes of the same shirt qualify", async () => {
    const { session } = await checkout([{ variantId: 5001, quantity: 1 }, { variantId: 5002, quantity: 1 }]);
    expect(session.total_details.amount_discount).toBe(700);
  });

  it("three or more items: still 10%, never stacked", async () => {
    const { params, session } = await checkout([{ variantId: 5001, quantity: 2 }, { variantId: 6001, quantity: 1 }, { variantId: 6002, quantity: 3 }]);
    const subtotal = 2 * 3500 + 4 * 2000;
    expect(params.discounts).toHaveLength(1);
    expect(session.total_details.amount_discount).toBe(subtotal / 10);
    expect(session.amount_total).toBe(subtotal - subtotal / 10 + 475);
  });

  it("never discounts shipping", async () => {
    const { params } = await checkout([{ variantId: 5001, quantity: 3 }]);
    expect(params.shipping_options[0].shipping_rate_data.fixed_amount.amount).toBe(475);
  });

  it("lets Stripe Tax compute tax on the discounted amount when enabled", async () => {
    vi.stubEnv("STRIPE_AUTOMATIC_TAX", "true");
    const { params } = await checkout([{ variantId: 5001, quantity: 2 }]);
    const p = params as unknown as { automatic_tax: { enabled: boolean }; line_items: { price_data: { tax_behavior: string } }[] };
    expect(p.automatic_tax).toEqual({ enabled: true });
    // Tax-exclusive prices + a session-level discount: Stripe taxes the post-discount amount.
    expect(p.line_items[0].price_data.tax_behavior).toBe("exclusive");
    vi.stubEnv("STRIPE_AUTOMATIC_TAX", "");
  });

  it("reuses the coupon for the same discount amount", async () => {
    const stripe = fakeStripe();
    await checkout([{ variantId: 5001, quantity: 2 }], stripe);
    await checkout([{ variantId: 5002, quantity: 2 }], stripe);
    expect(stripe.coupons.create).toHaveBeenCalledTimes(1);
    expect(stripe.checkout.sessions.create.mock.calls[1][0].discounts).toEqual([{ coupon: "bundle10-usd-700" }]);
  });

  it("survives a concurrent checkout creating the same coupon first", async () => {
    const stripe = fakeStripe();
    stripe.coupons.retrieve.mockImplementationOnce(async () => {
      stripe.coupons.store.set("bundle10-usd-700", { id: "bundle10-usd-700", amount_off: 700, currency: "usd", percent_off: null, valid: true });
      throw stripeError("resource_missing");
    });
    const { session } = await checkout([{ variantId: 5001, quantity: 2 }], stripe);
    expect(session.total_details.amount_discount).toBe(700);
  });

  it("refuses a coupon that doesn't match the discount", async () => {
    const stripe = fakeStripe();
    stripe.coupons.store.set("bundle10-usd-700", { id: "bundle10-usd-700", amount_off: 7000, currency: "usd", percent_off: null, valid: true });
    await expect(checkout([{ variantId: 5001, quantity: 2 }], stripe)).rejects.toThrow(/coupon/);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("expires the session instead of returning it if Stripe's totals don't match the cart", async () => {
    const stripe = fakeStripe();
    stripe.checkout.sessions.create.mockResolvedValueOnce({
      id: "cs_test_1",
      client_secret: "cs_secret",
      amount_subtotal: 7000,
      amount_total: 7475,
      total_details: { amount_discount: 0, amount_shipping: 475, amount_tax: 0 },
    });
    await expect(checkout([{ variantId: 5001, quantity: 2 }], stripe)).rejects.toThrow(/don't match/);
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_test_1");
  });

  it("ignores any discount or price the browser tries to send", async () => {
    const body = checkoutRequestSchema.parse({
      items: [{ variantId: 5001, quantity: 1, price: 1 }],
      address,
      shippingMethod: "STANDARD",
      discounts: [{ coupon: "bundle10-usd-3500" }],
      discount: 3500,
    });
    expect(body).not.toHaveProperty("discounts");
    expect(body).not.toHaveProperty("discount");
    const { params, session } = await checkout(body.items);
    expect(params.discounts).toBeUndefined();
    expect(session.amount_total).toBe(3500 + 475);
  });
});

describe("returnOrigin", () => {
  it("allows only the site, this project's Vercel URLs and localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://scottsbakeshop.com");
    expect(returnOrigin("https://scottsbakeshop.com")).toBe("https://scottsbakeshop.com");
    expect(returnOrigin("https://scottsbakeshop.vercel.app")).toBe("https://scottsbakeshop.vercel.app");
    expect(returnOrigin("https://scottsbakeshop-git-main-haveanapp.vercel.app")).toBe("https://scottsbakeshop-git-main-haveanapp.vercel.app");
    expect(returnOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(returnOrigin("https://evil.example")).toBe("https://scottsbakeshop.com");
    expect(returnOrigin("https://evil.vercel.app")).toBe("https://scottsbakeshop.com");
    expect(returnOrigin(undefined)).toBe("https://scottsbakeshop.com");
  });
});
