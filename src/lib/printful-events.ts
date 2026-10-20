import "server-only";
import type Stripe from "stripe";
import type { PrintfulClient } from "./printful";

interface PrintfulEvent {
  type?: string;
  data?: { order?: { id?: number } };
}

const STATUS_BY_EVENT: Record<string, string> = {
  package_shipped: "shipped",
  order_failed: "failed",
  order_canceled: "canceled",
  order_put_hold: "on_hold",
};

/**
 * Printful v1 webhooks aren't signed, so the payload is only used to learn
 * which order changed; its state is re-read from the Printful API before
 * anything is recorded.
 */
export async function handlePrintfulEvent(
  event: PrintfulEvent,
  deps: { stripe: Stripe; printful: Pick<PrintfulClient, "getOrder"> },
): Promise<{ handled: boolean; reason?: string }> {
  const orderId = event.data?.order?.id;
  if (!event.type || !Number.isInteger(orderId)) return { handled: false, reason: "no order" };

  const order = await deps.printful.getOrder(orderId!);
  const pi = order.external_id;
  if (!pi?.startsWith("pi_")) return { handled: false, reason: "not a storefront order" };

  const metadata: Record<string, string> = { printful_order_id: String(order.id), printful_status: order.status };
  const fulfillment = STATUS_BY_EVENT[event.type];
  if (fulfillment) metadata.fulfillment_status = fulfillment;
  const shipment = order.shipments?.at(-1);
  if (shipment) {
    metadata.carrier = shipment.carrier.slice(0, 100);
    metadata.tracking_number = shipment.tracking_number.slice(0, 100);
    metadata.tracking_url = shipment.tracking_url.slice(0, 450);
  }
  await deps.stripe.paymentIntents.update(pi, { metadata });
  return { handled: true };
}
