# Scott's Bake Shop — merch storefront

Next.js storefront for https://scottsbakeshop.com. It sells the **existing**
Printful store products, takes payment with **Stripe Embedded Checkout** on
this domain, and sends paid orders to **Printful** for fulfillment.

## How it works

| Concern | Handled by |
| --- | --- |
| Products, variants, images, prices | Every synced Printful store product, or only those in `PRINTFUL_PRODUCT_IDS` if set; read live (5-min cache) |
| Cart | Browser (localStorage); only variant IDs + quantities |
| Price & availability checks | Server, re-priced from Printful on every checkout (`src/lib/pricing.ts`) |
| Bundle discount | 10% off merchandise at 2+ units, automatic (`src/lib/discount.ts`); see below |
| Shipping | Live Printful rates for the exact items and address (`src/lib/shipping.ts`) |
| Tax | Stripe Tax when `STRIPE_AUTOMATIC_TAX=true`; otherwise none collected |
| Payment | Stripe Embedded Checkout (`src/lib/checkout.ts`) |
| Payment confirmation | Signature-verified Stripe webhook `POST /api/webhooks/stripe` |
| Printful order | `src/lib/fulfillment.ts`, idempotent: Printful `external_id` = PaymentIntent ID |
| Order record | Stripe PaymentIntent metadata (`printful_order_id`, `fulfillment_status`, tracking) + Printful dashboard |
| Shipping updates | Printful webhook `POST /api/webhooks/printful?token=…`, re-read from the Printful API |
| Refunds / cancellations | Manually: refund in Stripe (capped at the discounted amount paid), cancel in Printful (if not yet in production) |

Paid orders arrive in Printful as **drafts** unless `PRINTFUL_AUTO_CONFIRM=true`
*and* the Stripe key is live. Test-mode payments never auto-confirm.

## Bundle discount

Two or more merchandise units, in any mix, get 10% off the merchandise
subtotal. Shipping and tax are never discounted; Stripe Tax taxes the
discounted amount. There's no code to enter.

- The server re-prices the cart and computes the discount
  (`priceCart` → `bundleDiscount`). The browser only sends variant IDs and
  quantities, so it can't change the discount.
- The session gets exactly one Stripe coupon for that exact amount
  (`bundle10-<currency>-<cents>`, created on first use and reused).
  Checkout doesn't accept promotion codes, so nothing can stack on top.
- Before the payment form loads, the server checks Stripe's subtotal and
  discount against the cart. If they differ, the session is expired and the
  shopper sees an error. They're never charged an amount the cart didn't show.
- Records: `bundle_discount` (cents) is on the session and PaymentIntent
  metadata, the Stripe receipt shows the discount, and Printful's
  `retail_costs.discount` holds it, so its totals add up to what was charged.
- Partial refunds: refund what the customer actually paid for the item, which
  is its price less 10% when the order had the discount. Stripe never lets a
  refund go over the amount charged.

No new environment variables or Stripe dashboard setup are needed.

## Setup

1. `npm ci`, copy `.env.example` to `.env.local` and fill it in.
2. Optional: the shop sells every synced, non-ignored product in the Printful
   store. To pick a subset or set the order, run `npm run printful:products`
   and put those IDs in `PRINTFUL_PRODUCT_IDS` (display order). The number in a
   Printful dashboard "product template" URL is a template ID and won't work.
3. In Stripe, add a webhook endpoint `https://scottsbakeshop.com/api/webhooks/stripe`
   for `checkout.session.completed` and `checkout.session.async_payment_succeeded`;
   put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. `npm run printful:webhook` registers the Printful shipping-update webhook.
5. Set the variables in Vercel and redeploy. `NEXT_PUBLIC_*` values are baked
   in at build time.
   - **Production:** live Stripe keys, the Printful token and webhook secrets.
   - **Preview:** Stripe **test** keys only (`sk_test_`/`pk_test_` and a test
     webhook secret), and leave `PRINTFUL_API_TOKEN` unset, so a branch
     preview can never take a real payment or create a real Printful order.

## Checks

```
npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle
```
