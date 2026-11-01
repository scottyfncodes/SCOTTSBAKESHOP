import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Fraunces } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";
import Script from "next/script";

// Type system: two families, three jobs.
// Fraunces (variable, "soft" axis turned up): display headlines and product names. Its rounded,
//   dough-like terminals read like a hand-painted bakery sign; the italic is the hand-made accent.
// Barlow Condensed: nav, labels, prices, buttons. Reads like a printed price ticket.
// Barlow: body copy. Same family as the labels, warm and easy at small sizes.
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"], variable: "--font-fraunces" });
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-barlow-condensed" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://scottsbakeshop.com"),
  title: { default: "Scott's Bake Shop Merch", template: "%s · Scott's Bake Shop" },
  description: "Let's get this bread. Tees, hoodies, hats and mugs from Scott's Bake Shop, printed to order and shipped to your door.",
  icons: { icon: "/logo.png", apple: "/apple-touch-icon.png" },
  openGraph: { siteName: "Scott's Bake Shop", images: ["/logo.png"] },
};

export const viewport: Viewport = { themeColor: "#edead4", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <CartProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </CartProvider>
        {/* HaveAnApp Pulse: anonymous, cookieless usage counts. */}
        <Script src="https://haveanapp-pulse-collect.vercel.app/p.js" data-app="scottsbakeshop" strategy="afterInteractive" />
      </body>
    </html>
  );
}
