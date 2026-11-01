import type { Metadata, Viewport } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";
import Script from "next/script";

// Newsreader, a bookish serif, for headings; Outfit, the clean geometric sans that echoes the logo lettering, for everything else.
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-newsreader" });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-outfit" });

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
    <html lang="en" className={`${outfit.variable} ${newsreader.variable}`}>
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
