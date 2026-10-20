import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { json } from "@/lib/http";
import { printful } from "@/lib/printful";
import { handlePrintfulEvent } from "@/lib/printful-events";
import { getStripe } from "@/lib/stripe";

function tokenMatches(given: string | null, expected: string) {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = env.printfulWebhookSecret();
  const stripe = getStripe();
  if (!secret || !stripe) return json({ error: "not configured" }, 503);
  if (!tokenMatches(new URL(req.url).searchParams.get("token"), secret)) return json({ error: "forbidden" }, 403);

  try {
    const result = await handlePrintfulEvent(await req.json(), { stripe, printful });
    return json({ received: true, ...result });
  } catch (err) {
    console.error("[printful-webhook]", err instanceof Error ? err.message : err);
    return json({ error: "temporarily failed" }, 500);
  }
}
