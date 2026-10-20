import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { ShopNotice } from "@/components/ShopNotice";
import { getCatalog } from "@/lib/catalog";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const catalog = await getCatalog();
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = env.shipCountries().map((code) => ({ code, name: names.of(code) ?? code }));
  const checkoutOpen = !!env.stripeSecretKey() && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="container page">
      <h1>Checkout</h1>
      {catalog.status === "ok" ? (
        <CheckoutFlow products={catalog.products} countries={countries} checkoutOpen={checkoutOpen} />
      ) : (
        <ShopNotice status={catalog.status} />
      )}
    </div>
  );
}
