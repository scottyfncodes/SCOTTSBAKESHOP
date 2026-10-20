import type { Metadata } from "next";
import { ContactLine } from "@/components/ContactLine";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Shipping" };

export default function ShippingPage() {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = env.shipCountries().map((c) => names.of(c) ?? c);
  return (
    <div className="container page prose">
      <h1>Shipping</h1>
      <h2>Made to order</h2>
      <p>Every item is printed for you after you order, by our print and fulfillment partner Printful. Production happens before your order ships, so allow for that time on top of delivery time.</p>
      <h2>Rates &amp; delivery estimates</h2>
      <p>Shipping options and prices are live carrier rates for your exact items and address. You&rsquo;ll see them, with the carrier&rsquo;s estimated transit time, before you pay.</p>
      <h2>Where we ship</h2>
      <p>We currently ship to: {countries.join(", ")}.</p>
      <h2>Tracking</h2>
      <p>Once your order ships, a tracking link appears on your order page (the page you land on after paying).</p>
      <h2>Questions</h2>
      <p><ContactLine /> with your order reference.</p>
    </div>
  );
}
