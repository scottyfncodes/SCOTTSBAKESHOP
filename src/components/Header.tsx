"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { CartIcon } from "./Icons";

export function Header() {
  const { count, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const label = ready && count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart";

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="container header-row">
        <Link href="/" className="brand" aria-label="Scott's Bake Shop home">
          <img src="/logo.png" alt="" width={48} height={48} />
          <span className="brand-name">Scott&rsquo;s Bake Shop</span>
        </Link>
        <nav className="header-nav" aria-label="Main">
          <Link href="/#shop" className="nav-link nav-shop">Shop</Link>
          <Link href="/cart" className="cart-button" aria-label={label}>
            <CartIcon />
            {ready && count > 0 && <span className="cart-count" aria-hidden="true">{count}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
