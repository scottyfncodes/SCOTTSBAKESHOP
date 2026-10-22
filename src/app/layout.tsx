import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

// One family, the same rounded geometric Outfit as the logo-style headings, keeps the shop feeling like one brand.
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://scottsbakeshop.com"),
  title: { default: "Scott's Bake Shop Merch", template: "%s · Scott's Bake Shop" },
  description: "Let's get this bread. Hats, tees and hoodies from Scott's Bake Shop, made to order.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: { siteName: "Scott's Bake Shop", images: ["/logo.png"] },
};

export const viewport: Viewport = { themeColor: "#edead4", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <CartProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
