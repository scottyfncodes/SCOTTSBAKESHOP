import "server-only";
import { env } from "./env";
import { printful, type PfRecipient } from "./printful";
import { CartError, type PricedLine } from "./pricing";
import { STATE_REQUIRED } from "./validation";
import type { ShippingAddress, ShippingOption } from "./types";

export function toRecipient(a: ShippingAddress): PfRecipient {
  return {
    name: a.name,
    address1: a.address1,
    address2: a.address2,
    city: a.city,
    state_code: a.state || undefined,
    country_code: a.country,
    zip: a.zip,
    email: a.email,
    phone: a.phone,
  };
}

export function assertShippable(a: ShippingAddress) {
  if (!env.shipCountries().includes(a.country)) throw new CartError("Sorry, we don't ship to that country yet.");
  if (STATE_REQUIRED.has(a.country) && !a.state) throw new CartError("Please enter your state or province.");
}

/** Live carrier rates from Printful for exactly these items and this address. */
export async function quoteShipping(lines: PricedLine[], address: ShippingAddress, currency: string): Promise<ShippingOption[]> {
  assertShippable(address);
  const { name: _name, ...recipient } = toRecipient(address);
  void _name;
  const rates = await printful.shippingRates(
    recipient,
    lines.map((l) => ({ variant_id: l.variant.catalogVariantId, quantity: l.quantity })),
    currency,
  );
  return rates
    .filter((r) => r.currency.toUpperCase() === currency)
    .map((r) => ({
      id: r.id,
      name: r.name,
      amount: Math.round(Number.parseFloat(r.rate) * 100),
      currency,
      minDays: r.minDeliveryDays,
      maxDays: r.maxDeliveryDays,
    }))
    .filter((r) => Number.isFinite(r.amount) && r.amount >= 0);
}
