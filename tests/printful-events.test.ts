import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { handlePrintfulEvent } from "@/lib/printful-events";

function deps(order: object) {
  const stripe = { paymentIntents: { update: vi.fn().mockResolvedValue({}) } };
  const printful = { getOrder: vi.fn().mockResolvedValue(order) };
  return { stripe, printful, d: { stripe: stripe as unknown as Stripe, printful } };
}

describe("handlePrintfulEvent", () => {
  it("re-reads the order from Printful and records tracking on the payment", async () => {
    const t = deps({ id: 777, external_id: "pi_123", status: "fulfilled", shipments: [{ carrier: "USPS", service: "Ground", tracking_number: "9400", tracking_url: "https://track/9400" }] });
    // Payload claims something else; the API's answer wins.
    await handlePrintfulEvent({ type: "package_shipped", data: { order: { id: 777 } } }, t.d);
    expect(t.printful.getOrder).toHaveBeenCalledWith(777);
    expect(t.stripe.paymentIntents.update).toHaveBeenCalledWith("pi_123", {
      metadata: expect.objectContaining({ fulfillment_status: "shipped", tracking_url: "https://track/9400", printful_status: "fulfilled" }),
    });
  });

  it("ignores orders that didn't come from this storefront", async () => {
    const t = deps({ id: 9, external_id: "etsy-55", status: "fulfilled" });
    expect(await handlePrintfulEvent({ type: "package_shipped", data: { order: { id: 9 } } }, t.d)).toMatchObject({ handled: false });
    expect(t.stripe.paymentIntents.update).not.toHaveBeenCalled();
  });

  it("ignores malformed payloads", async () => {
    const t = deps({});
    expect(await handlePrintfulEvent({}, t.d)).toMatchObject({ handled: false });
    expect(t.printful.getOrder).not.toHaveBeenCalled();
  });
});
