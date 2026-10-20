import type { Metadata } from "next";
import { ContactLine } from "@/components/ContactLine";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="container page prose">
      <h1>Privacy</h1>
      <h2>What we collect</h2>
      <p>When you order, we collect your name, email, shipping address and (if you give it) phone number. We use them only to take payment, make and ship your order, and contact you about it.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li><strong>Stripe</strong> processes your payment. Your card details go straight to Stripe and never touch our servers.</li>
        <li><strong>Printful</strong> prints and ships your order and receives your name, shipping address and contact details to do so.</li>
        <li><strong>Vercel</strong> hosts this website and keeps standard server logs.</li>
      </ul>
      <p>We don&rsquo;t sell your information and we don&rsquo;t use advertising or tracking cookies.</p>
      <h2>Your cart</h2>
      <p>Your cart is saved in your own browser (local storage) so it&rsquo;s still there when you come back. Clearing your browser data removes it.</p>
      <h2>Questions or deletion requests</h2>
      <p><ContactLine />.</p>
    </div>
  );
}
