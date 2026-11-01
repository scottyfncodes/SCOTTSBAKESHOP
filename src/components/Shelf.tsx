"use client";

import { useState } from "react";
import { CATEGORIES, merchFor, type Category } from "@/lib/merch";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

/** The product grid, with collection filters when the shop spans more than one collection. */
export function Shelf({ products }: { products: Product[] }) {
  const [active, setActive] = useState<Category | null>(null);
  const counts = new Map<Category, number>();
  for (const p of products) {
    const c = merchFor(p.name).category;
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const collections = CATEGORIES.filter((c) => counts.has(c));
  const shown = active ? products.filter((p) => merchFor(p.name).category === active) : products;

  return (
    <>
      {collections.length > 1 && (
        <div className="filters" role="group" aria-label="Filter by collection">
          <button type="button" className="filter" aria-pressed={active === null} onClick={() => setActive(null)}>
            All
          </button>
          {collections.map((c) => (
            <button key={c} type="button" className="filter" aria-pressed={active === c} onClick={() => setActive(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="shelf">
        {shown.map((p, i) => (
          <ProductCard key={p.id} product={p} eager={i < 2} />
        ))}
      </div>
    </>
  );
}
