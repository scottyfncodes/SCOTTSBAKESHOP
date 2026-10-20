import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img src="/logo.png" alt="" width={56} height={56} />
              <strong>Scott&rsquo;s Bake Shop</strong>
            </div>
            <p className="footer-fine" style={{ borderTop: 0, paddingTop: 12, marginTop: 0 }}>
              Merch made to order and shipped by our print partner, Printful.
            </p>
          </div>
          <div>
            <h2>Get in touch</h2>
            <ul>
              {site.contactEmail && (
                <li><a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></li>
              )}
              {site.instagramUrl && (
                <li><a href={site.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></li>
              )}
              <li><Link href="/#shop">Shop</Link></li>
            </ul>
          </div>
          <div>
            <h2>Help</h2>
            <ul>
              <li><Link href="/shipping">Shipping</Link></li>
              <li><Link href="/returns">Returns &amp; exchanges</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <p className="footer-fine">&copy; {new Date().getFullYear()} Scott&rsquo;s Bake Shop. Payments secured by Stripe.</p>
      </div>
    </footer>
  );
}
