import "server-only";

function read(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

export const env = {
  printfulToken: () => read("PRINTFUL_API_TOKEN"),
  printfulStoreId: () => read("PRINTFUL_STORE_ID"),
  printfulProductIds: () =>
    (read("PRINTFUL_PRODUCT_IDS") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s)),
  printfulAutoConfirm: () => read("PRINTFUL_AUTO_CONFIRM") === "true",
  printfulWebhookSecret: () => read("PRINTFUL_WEBHOOK_SECRET"),
  stripeSecretKey: () => read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => read("STRIPE_WEBHOOK_SECRET"),
  stripeAutomaticTax: () => read("STRIPE_AUTOMATIC_TAX") === "true",
  siteUrl: () => read("NEXT_PUBLIC_SITE_URL") ?? "https://scottsbakeshop.com",
  shipCountries: () =>
    (read("SHIP_COUNTRIES") ?? "US")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z]{2}$/.test(s)),
};

export function isStripeTestMode(): boolean {
  return (env.stripeSecretKey() ?? "").startsWith("sk_test_");
}
