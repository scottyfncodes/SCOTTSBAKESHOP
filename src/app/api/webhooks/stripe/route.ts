import type Stripe from "stripe";
import { env, isStripeTestMode } from "@/lib/env";
import { fulfillCheckoutSession } from "@/lib/fulfillment";
import { json } from "@/lib/http";
import { printful } from "@/lib/printful";
import { getStripe } from "@/lib/stripe";

const FULFILL_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = env.stripeWebhookSecret();
  if (!stripe || !secret) return json({ error: "not configured" }, 503);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "missing signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return json({ error: "invalid signature" }, 400);
  }

  if (!FULFILL_EVENTS.has(event.type)) return json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  try {
    const result = await fulfillCheckoutSession(session.id, {
      stripe,
      printful,
      // Test-mode payments never start real (charged) Printful production.
      autoConfirm: env.printfulAutoConfirm() && !isStripeTestMode(),
    });
    console.info(`[stripe-webhook] ${event.id} ${event.type} -> ${result.outcome}`);
    return json({ received: true, outcome: result.outcome });
  } catch (err) {
    // Non-2xx makes Stripe retry with backoff; fulfillment is idempotent.
    console.error(`[stripe-webhook] ${event.id} fulfillment error:`, err instanceof Error ? err.message : err);
    return json({ error: "fulfillment temporarily failed" }, 500);
  }
}
