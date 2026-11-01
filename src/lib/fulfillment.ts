import "server-only";
import type Stripe from "stripe";
import { PrintfulError, type PfOrder, type PrintfulClient } from "./printful";
import { decodeItems } from "./pricing";

export type FulfillmentStatus = "submitted" | "draft" | "failed";

export interface FulfillmentDeps {
  stripe: Stripe;
  printful: Pick<PrintfulClient, "getOrderByExternalId" | "createOrder">;
  /** Confirm (charge + produce) in Printful immediately instead of leaving a draft. */
  autoConfirm: boolean;
}

export type FulfillmentResult =
  | { outcome: "skipped"; reason: string }
  | { outcome: "already_fulfilled"; printfulOrderId: string }
  | { outcome: "created"; printfulOrderId: string; status: FulfillmentStatus }
  | { outcome: "rejected"; error: string };

const dollars = (cents: number | null | undefined) => ((cents ?? 0) / 100).toFixed(2);

function isDuplicateExternalId(err: PrintfulError) {
  return err.status === 409 || /external.?id/i.test(err.message);
}

/**
 * Sends a paid Checkout session to Printful exactly once.
 *
 * Idempotency has two layers: the Stripe PaymentIntent's metadata records the
 * Printful order, and the Printful order's external_id is the PaymentIntent ID
 * (Printful rejects a second order with the same external_id). So retries,
 * duplicate webhook deliveries and concurrent deliveries can't double-order.
 *
 * Transient Printful failures throw so the webhook returns 5xx and Stripe
 * retries. Permanent rejections are recorded on the payment and not retried.
 */
export async function fulfillCheckoutSession(sessionId: string, deps: FulfillmentDeps): Promise<FulfillmentResult> {
  const { stripe } = deps;
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });

  if (session.payment_status !== "paid") return { outcome: "skipped", reason: `payment_status=${session.payment_status}` };
  const pi = session.payment_intent;
  if (!pi || typeof pi === "string") return { outcome: "skipped", reason: "no payment intent" };
  if (pi.status !== "succeeded") return { outcome: "skipped", reason: `payment_intent=${pi.status}` };

  if (pi.metadata.printful_order_id) return { outcome: "already_fulfilled", printfulOrderId: pi.metadata.printful_order_id };

  const record = (fields: Record<string, string>) => stripe.paymentIntents.update(pi.id, { metadata: fields });
  const recordOrder = async (order: PfOrder) => {
    const status: FulfillmentStatus = order.status === "draft" ? "draft" : "submitted";
    await record({
      printful_order_id: String(order.id),
      printful_status: order.status,
      fulfillment_status: status,
      fulfillment_error: "",
    });
    return status;
  };

  const existing = await deps.printful.getOrderByExternalId(pi.id);
  if (existing) {
    await recordOrder(existing);
    return { outcome: "already_fulfilled", printfulOrderId: String(existing.id) };
  }

  const items = decodeItems(session.metadata?.items);
  const ship = pi.shipping;
  if (items.length === 0 || !ship?.address) {
    const error = items.length === 0 ? "No items recorded on checkout session" : "No shipping address on payment";
    await record({ fulfillment_status: "failed", fulfillment_error: error });
    return { outcome: "rejected", error };
  }

  const order = {
    external_id: pi.id,
    shipping: session.metadata?.shipping_method || "STANDARD",
    recipient: {
      name: ship.name ?? "",
      address1: ship.address.line1 ?? "",
      address2: ship.address.line2 || undefined,
      city: ship.address.city ?? "",
      state_code: ship.address.state || undefined,
      country_code: ship.address.country ?? "",
      zip: ship.address.postal_code ?? "",
      phone: ship.phone || undefined,
      email: session.customer_details?.email ?? pi.receipt_email ?? undefined,
    },
    items: items.map((i) => ({
      sync_variant_id: i.variantId,
      quantity: i.quantity,
      retail_price: dollars(i.unitPrice),
    })),
    retail_costs: {
      currency: (session.currency ?? "usd").toUpperCase(),
      subtotal: dollars(session.amount_subtotal),
      // The bundle discount, so Printful's retail record adds up to what was charged.
      discount: dollars(session.total_details?.amount_discount),
      shipping: dollars(session.total_details?.amount_shipping),
      tax: dollars(session.total_details?.amount_tax),
      total: dollars(session.amount_total),
    },
  };

  try {
    const created = await deps.printful.createOrder(order, deps.autoConfirm);
    const status = await recordOrder(created);
    console.info(`[fulfillment] ${pi.id} -> Printful order ${created.id} (${created.status})`);
    return { outcome: "created", printfulOrderId: String(created.id), status };
  } catch (err) {
    if (!(err instanceof PrintfulError)) throw err;
    if (isDuplicateExternalId(err)) {
      // A concurrent delivery won the race; adopt its order.
      const winner = await deps.printful.getOrderByExternalId(pi.id);
      if (winner) {
        await recordOrder(winner);
        return { outcome: "already_fulfilled", printfulOrderId: String(winner.id) };
      }
    }
    if (err.transient) throw err;
    const error = err.message.slice(0, 450);
    await record({ fulfillment_status: "failed", fulfillment_error: error });
    console.error(`[fulfillment] Printful rejected order for ${pi.id}: ${error}`);
    return { outcome: "rejected", error };
  }
}
