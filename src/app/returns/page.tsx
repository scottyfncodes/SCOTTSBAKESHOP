import type { Metadata } from "next";
import { ContactLine } from "@/components/ContactLine";

export const metadata: Metadata = { title: "Returns & exchanges" };

export default function ReturnsPage() {
  return (
    <div className="container page prose">
      <h1>Returns &amp; exchanges</h1>
      <p>Each item is printed to order just for you, so please check the size and color before you buy.</p>
      <h2>Damaged, misprinted or wrong item</h2>
      <p>If something arrives damaged, misprinted, or isn&rsquo;t what you ordered, <ContactLine prefix="email us" /> within 30 days of delivery with your order reference and a photo of the problem, and we&rsquo;ll sort it out with our print partner.</p>
      <h2>Anything else</h2>
      <p><ContactLine prefix="Email us" /> and we&rsquo;ll help however we can.</p>
    </div>
  );
}
