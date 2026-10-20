import "server-only";
import type Stripe from "stripe";
import { env } from "./env";
import { getCatalog } from "./catalog";
import { CartError, describe, encodeItems, priceCart } from "./pricing";
import { quoteShipping } from "./shipping";
import type { CartLine, ShippingAddress } from "./types";

export interface CheckoutInput {
  items: CartLine[];
  address: ShippingAddress;
  shippingMethod: string;
}

/**
 * Builds an embedded Stripe Checkout session. Prices and the shipping amount
 * are recomputed here from Printful; nothing monetary is taken from the client.
 */
export async function createCheckoutSession(stripe: Stripe, input: CheckoutInput) {
  const catalog = await getCatalog({ fresh: true });
  if (catalog.status !== "ok") throw new CartError("The shop is temporarily unavailable. Please try again shortly.");

  const cart = priceCart(catalog.products, input.items);
  const rates = await quoteShipping(cart.lines, input.address, cart.currency);
  const rate = rates.find((r) => r.id === input.shippingMethod);
  if (!rate) throw new CartError("That shipping option is no longer available. Please choose again.");

  const a = input.address;
  const shipping = {
    name: a.name,
    phone: a.phone,
    address: {
      line1: a.address1,
      line2: a.address2,
      city: a.city,
      state: a.state || undefined,
      postal_code: a.zip,
      country: a.country,
    },
  };

  // A customer record lets Stripe Tax see the destination and lets the
  // receipt go to the right email; Checkout itself doesn't re-ask for address.
  const customer = await stripe.customers.create({
    name: a.name,
    email: a.email,
    phone: a.phone,
    address: shipping.address,
    shipping,
  });

  const currency = cart.currency.toLowerCase();
  const items = encodeItems(cart.lines);

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    customer: customer.id,
    line_items: cart.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency,
        unit_amount: l.variant.price,
        tax_behavior: "exclusive",
        product_data: {
          name: describe(l.product, l.variant),
          ...(l.variant.image ? { images: [l.variant.image] } : {}),
          metadata: { printful_sync_variant_id: String(l.variant.id) },
        },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: rate.name,
          fixed_amount: { amount: rate.amount, currency },
          tax_behavior: "exclusive",
          ...(rate.minDays && rate.maxDays
            ? {
                delivery_estimate: {
                  minimum: { unit: "business_day", value: rate.minDays },
                  maximum: { unit: "business_day", value: rate.maxDays },
                },
              }
            : {}),
        },
      },
    ],
    automatic_tax: { enabled: env.stripeAutomaticTax() },
    payment_intent_data: {
      shipping,
      receipt_email: a.email,
      metadata: { items, shipping_method: rate.id },
    },
    metadata: { items, shipping_method: rate.id },
    return_url: `${env.siteUrl()}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.client_secret) throw new Error("Stripe did not return a client secret");
  return { clientSecret: session.client_secret };
}
