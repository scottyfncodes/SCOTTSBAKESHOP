import "server-only";
import Stripe from "stripe";
import { env } from "./env";

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = env.stripeSecretKey();
  if (!key) return null;
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "scottsbakeshop" } });
  return client;
}
