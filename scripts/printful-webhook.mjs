// Registers the storefront's Printful webhook (shipping/failed/canceled updates).
// Usage: PRINTFUL_API_TOKEN=... PRINTFUL_WEBHOOK_SECRET=... npm run printful:webhook
const token = process.env.PRINTFUL_API_TOKEN;
const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://scottsbakeshop.com";
if (!token || !secret) {
  console.error("Set PRINTFUL_API_TOKEN and PRINTFUL_WEBHOOK_SECRET first.");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
if (process.env.PRINTFUL_STORE_ID) headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;

const res = await fetch("https://api.printful.com/webhooks", {
  method: "POST",
  headers,
  body: JSON.stringify({
    url: `${site}/api/webhooks/printful?token=${encodeURIComponent(secret)}`,
    types: ["package_shipped", "order_failed", "order_canceled", "order_put_hold", "order_updated"],
  }),
});
const json = await res.json();
if (!res.ok) {
  console.error(`Failed (${res.status}): ${json?.error?.message ?? json?.result}`);
  process.exit(1);
}
console.log("✓ Printful webhook registered for", json.result.types.join(", "));
