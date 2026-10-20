import { createCheckoutSession } from "@/lib/checkout";
import { errorResponse, json } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { checkoutRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10, 60_000)) return json({ error: "Too many requests. Please wait a minute." }, 429);
  const stripe = getStripe();
  if (!stripe) return json({ error: "Checkout isn't open yet. Please check back soon." }, 503);
  try {
    const input = checkoutRequestSchema.parse(await req.json());
    return json(await createCheckoutSession(stripe, input));
  } catch (err) {
    return errorResponse(err, "checkout");
  }
}
