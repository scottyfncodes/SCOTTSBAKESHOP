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

const address = { name: "Pat", email: "pat@example.com", address1: "1 Main St", city: "Denver", state: "CO", zip: "80202", country: "US" };

function fakeStripe() {
  return {
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_1" }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ client_secret: "cs_secret" }) } },
  };
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
    expect(params.metadata).toEqual({ items: "5001:2:3500", shipping_method: "STANDARD" });
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
