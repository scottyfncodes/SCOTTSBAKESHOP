# Scott's Bake Shop — merch storefront

Next.js storefront for https://scottsbakeshop.com. It sells the **existing**
Printful store products, takes payment with **Stripe Embedded Checkout** on
this domain, and sends paid orders to **Printful** for fulfillment.

## How it works

| Concern | Handled by |
| --- | --- |
| Products, variants, images, prices | Printful sync products listed in `PRINTFUL_PRODUCT_IDS`, read live (5-min cache) |
| Cart | Browser (localStorage); only variant IDs + quantities |
| Price & availability checks | Server, re-priced from Printful on every checkout (`src/lib/pricing.ts`) |
| Shipping | Live Printful rates for the exact items and address (`src/lib/shipping.ts`) |
| Tax | Stripe Tax when `STRIPE_AUTOMATIC_TAX=true`; otherwise none collected |
| Payment | Stripe Embedded Checkout (`src/lib/checkout.ts`) |
| Payment confirmation | Signature-verified Stripe webhook `POST /api/webhooks/stripe` |
| Printful order | `src/lib/fulfillment.ts`, idempotent: Printful `external_id` = PaymentIntent ID |
| Order record | Stripe PaymentIntent metadata (`printful_order_id`, `fulfillment_status`, tracking) + Printful dashboard |
| Shipping updates | Printful webhook `POST /api/webhooks/printful?token=…`, re-read from the Printful API |
| Refunds / cancellations | Manually: refund in Stripe, cancel in Printful (if not yet in production) |

Paid orders arrive in Printful as **drafts** unless `PRINTFUL_AUTO_CONFIRM=true`
*and* the Stripe key is live. Test-mode payments never auto-confirm.

## Setup

1. `npm ci`, copy `.env.example` to `.env.local` and fill it in.
2. `npm run printful:products` lists your existing Printful products. Put the
   hoodie, T-shirt and hat IDs in `PRINTFUL_PRODUCT_IDS` (display order).
3. In Stripe, add a webhook endpoint `https://scottsbakeshop.com/api/webhooks/stripe`
   for `checkout.session.completed` and `checkout.session.async_payment_succeeded`;
   put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. `npm run printful:webhook` registers the Printful shipping-update webhook.
5. Set the same variables in Vercel (Production + Preview) and redeploy.
   `NEXT_PUBLIC_*` values are baked in at build time.

## Checks

```
npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle
```
