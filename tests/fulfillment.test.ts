import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { fulfillCheckoutSession } from "@/lib/fulfillment";
import { PrintfulError, type PfOrder } from "@/lib/printful";

function makeSession(over: Record<string, unknown> = {}, piOver: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1",
    payment_status: "paid",
    currency: "usd",
    amount_subtotal: 5500,
    amount_total: 6299,
    total_details: { amount_shipping: 799, amount_tax: 0 },
    customer_details: { email: "pat@example.com" },
    metadata: { items: "5001:1:3500,6001:1:2000", shipping_method: "STANDARD" },
    payment_intent: {
      id: "pi_123",
      status: "succeeded",
      metadata: {},
      receipt_email: "pat@example.com",
      shipping: {
        name: "Pat Baker",
        phone: null,
        address: { line1: "1 Main St", line2: null, city: "Denver", state: "CO", postal_code: "80202", country: "US" },
      },
      ...piOver,
    },
    ...over,
  };
}

function setup(session = makeSession()) {
  const stripe = {
    checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(session) } },
    paymentIntents: { update: vi.fn().mockResolvedValue({}) },
  };
  const printful = {
    getOrderByExternalId: vi.fn<(id: string) => Promise<PfOrder | null>>().mockResolvedValue(null),
    createOrder: vi.fn<(o: unknown, c: boolean) => Promise<PfOrder>>().mockResolvedValue({ id: 777, external_id: "pi_123", status: "draft" }),
  };
  const deps = { stripe: stripe as unknown as Stripe, printful, autoConfirm: false };
  return { stripe, printful, deps };
}

describe("fulfillCheckoutSession", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("creates one Printful order from a paid session using existing sync variant IDs", async () => {
    const result = await fulfillCheckoutSession("cs_test_1", t.deps);
    expect(result).toEqual({ outcome: "created", printfulOrderId: "777", status: "draft" });
    expect(t.printful.createOrder).toHaveBeenCalledTimes(1);
    const [order, confirm] = t.printful.createOrder.mock.calls[0];
    expect(confirm).toBe(false);
    expect(order).toMatchObject({
      external_id: "pi_123",
      shipping: "STANDARD",
      recipient: { name: "Pat Baker", address1: "1 Main St", city: "Denver", state_code: "CO", country_code: "US", zip: "80202", email: "pat@example.com" },
      items: [
        { sync_variant_id: 5001, quantity: 1, retail_price: "35.00" },
        { sync_variant_id: 6001, quantity: 1, retail_price: "20.00" },
      ],
      retail_costs: { currency: "USD", subtotal: "55.00", discount: "0.00", shipping: "7.99", tax: "0.00", total: "62.99" },
    });
    expect(t.stripe.paymentIntents.update).toHaveBeenCalledWith("pi_123", {
      metadata: expect.objectContaining({ printful_order_id: "777", fulfillment_status: "draft" }),
    });
  });

  it("records the bundle discount so Printful's retail costs add up to what was charged", async () => {
    // Tee + hat: $55.00 subtotal, $5.50 bundle discount, $7.99 shipping, $3.10 tax.
    t = setup(makeSession({ amount_subtotal: 5500, amount_total: 6059, total_details: { amount_discount: 550, amount_shipping: 799, amount_tax: 310 } }));
    await fulfillCheckoutSession("cs_test_1", t.deps);
    const costs = (t.printful.createOrder.mock.calls[0][0] as { retail_costs: Record<string, string> }).retail_costs;
    expect(costs).toEqual({ currency: "USD", subtotal: "55.00", discount: "5.50", shipping: "7.99", tax: "3.10", total: "60.59" });
    const sum = Number(costs.subtotal) - Number(costs.discount) + Number(costs.shipping) + Number(costs.tax);
    expect(sum.toFixed(2)).toBe(costs.total);
  });

  it("passes autoConfirm through to Printful", async () => {
    t.printful.createOrder.mockResolvedValue({ id: 778, external_id: "pi_123", status: "pending" });
    const result = await fulfillCheckoutSession("cs_test_1", { ...t.deps, autoConfirm: true });
    expect(t.printful.createOrder.mock.calls[0][1]).toBe(true);
    expect(result).toMatchObject({ status: "submitted" });
  });

  it("never fulfills an unpaid session", async () => {
    t = setup(makeSession({ payment_status: "unpaid" }));
    expect(await fulfillCheckoutSession("cs_test_1", t.deps)).toMatchObject({ outcome: "skipped" });
    expect(t.printful.createOrder).not.toHaveBeenCalled();
  });

  it("never fulfills when the PaymentIntent hasn't succeeded", async () => {
    t = setup(makeSession({}, { status: "processing" }));
    expect(await fulfillCheckoutSession("cs_test_1", t.deps)).toMatchObject({ outcome: "skipped" });
    expect(t.printful.createOrder).not.toHaveBeenCalled();
  });

  it("is a no-op for a duplicate event already recorded on the payment", async () => {
    t = setup(makeSession({}, { metadata: { printful_order_id: "777" } }));
    expect(await fulfillCheckoutSession("cs_test_1", t.deps)).toEqual({ outcome: "already_fulfilled", printfulOrderId: "777" });
    expect(t.printful.getOrderByExternalId).not.toHaveBeenCalled();
    expect(t.printful.createOrder).not.toHaveBeenCalled();
  });

  it("adopts an existing Printful order with the same external_id instead of creating another", async () => {
    t.printful.getOrderByExternalId.mockResolvedValue({ id: 555, external_id: "pi_123", status: "pending" });
    expect(await fulfillCheckoutSession("cs_test_1", t.deps)).toEqual({ outcome: "already_fulfilled", printfulOrderId: "555" });
    expect(t.printful.createOrder).not.toHaveBeenCalled();
  });

  it("handles a concurrent delivery that wins the race (duplicate external_id)", async () => {
    t.printful.getOrderByExternalId.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 556, external_id: "pi_123", status: "draft" });
    t.printful.createOrder.mockRejectedValue(new PrintfulError("Printful 400: Order with this external_id already exists", 400));
    expect(await fulfillCheckoutSession("cs_test_1", t.deps)).toEqual({ outcome: "already_fulfilled", printfulOrderId: "556" });
  });

  it("simulated duplicate webhook deliveries create exactly one order", async () => {
    const metadata: Record<string, string> = {};
    const session = makeSession({}, { metadata });
    t = setup(session);
    t.stripe.paymentIntents.update.mockImplementation(async (_id: string, { metadata: m }: { metadata: Record<string, string> }) => Object.assign(metadata, m));
    await fulfillCheckoutSession("cs_test_1", t.deps);
    await fulfillCheckoutSession("cs_test_1", t.deps);
    await fulfillCheckoutSession("cs_test_1", t.deps);
    expect(t.printful.createOrder).toHaveBeenCalledTimes(1);
  });

  it("throws on transient Printful errors so Stripe retries", async () => {
    t.printful.createOrder.mockRejectedValue(new PrintfulError("Printful 503: down", 503));
    await expect(fulfillCheckoutSession("cs_test_1", t.deps)).rejects.toThrow(/503/);
    t.printful.createOrder.mockRejectedValue(new PrintfulError("network", 0));
    await expect(fulfillCheckoutSession("cs_test_1", t.deps)).rejects.toThrow();
    expect(t.stripe.paymentIntents.update).not.toHaveBeenCalled();
  });

  it("records permanent rejections without claiming success", async () => {
    t.printful.createOrder.mockRejectedValue(new PrintfulError("Printful 400: Variant discontinued", 400));
    const result = await fulfillCheckoutSession("cs_test_1", t.deps);
    expect(result).toEqual({ outcome: "rejected", error: "Printful 400: Variant discontinued" });
    expect(t.stripe.paymentIntents.update).toHaveBeenCalledWith("pi_123", {
      metadata: { fulfillment_status: "failed", fulfillment_error: "Printful 400: Variant discontinued" },
    });
  });

  it("rejects sessions with no recorded items", async () => {
    t = setup(makeSession({ metadata: {} }));
    expect(await fulfillCheckoutSession("cs_test_1", t.deps)).toMatchObject({ outcome: "rejected" });
    expect(t.printful.createOrder).not.toHaveBeenCalled();
  });
});
