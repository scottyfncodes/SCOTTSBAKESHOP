import { getCatalog } from "@/lib/catalog";
import { errorResponse, json } from "@/lib/http";
import { priceCart } from "@/lib/pricing";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { quoteShipping } from "@/lib/shipping";
import { shippingRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!rateLimit(`rates:${clientIp(req)}`, 30, 60_000)) return json({ error: "Too many requests. Please wait a minute." }, 429);
  try {
    const { items, address } = shippingRequestSchema.parse(await req.json());
    const catalog = await getCatalog();
    if (catalog.status !== "ok") return json({ error: "The shop is temporarily unavailable." }, 503);
    const cart = priceCart(catalog.products, items);
    const options = await quoteShipping(cart.lines, address, cart.currency);
    if (options.length === 0) return json({ error: "No shipping options are available for that address." }, 422);
    return json({ subtotal: cart.subtotal, currency: cart.currency, options });
  } catch (err) {
    return errorResponse(err, "shipping-rates");
  }
}
