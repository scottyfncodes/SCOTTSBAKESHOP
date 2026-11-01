import { describe, expect, it } from "vitest";
import { merchFor } from "@/lib/merch";

describe("merchFor", () => {
  it("gives the live Printful products a storefront title, collection and design", () => {
    expect(merchFor("T-Shirt - Black")).toMatchObject({ title: "Gluten for Punishment Tee", category: "Apparel" });
    expect(merchFor("Unisex Hoodie")).toMatchObject({ title: "Gluten for Punishment Hoodie", category: "Apparel" });
    expect(merchFor("Hat")).toMatchObject({ title: "Let’s Get This Bread Dad Hat", category: "Headwear" });
    const mug = merchFor("Black Glossy Mug");
    expect(mug).toMatchObject({ title: "Two-Sided Bake Shop Mug", category: "Accessories" });
    expect(mug.designs.map((d) => d.slug)).toEqual(["lets-get-this-bread", "gluten-for-punishment"]);
  });

  it("credits the artist behind each design", () => {
    const [design] = merchFor("Unisex Hoodie").designs;
    expect(design.artist).toEqual({ handle: "turdrodeo", url: "https://www.instagram.com/turdrodeo/" });
    expect(merchFor("Hat").designs[0].artist).toEqual({ handle: "kurt_player02", url: "https://www.instagram.com/kurt_player02/" });
  });

  it("names stickers by the design in their Printful name, and never guesses", () => {
    expect(merchFor("Let's Get This Bread Sticker")).toMatchObject({ title: "Let\u2019s Get This Bread Sticker", category: "Accessories" });
    expect(merchFor("Gluten for Punishment Sticker")).toMatchObject({ title: "Gluten for Punishment Sticker", category: "Accessories" });
    expect(merchFor("Bubble-free stickers")).toMatchObject({ title: "Bake Shop Sticker", category: "Accessories", designs: [] });
  });

  it("has our own product details for every live product, with no em dashes", () => {
    for (const name of ["T-Shirt - Black", "Unisex Hoodie", "Hat", "Black Glossy Mug", "Let's Get This Bread Sticker", "Gluten for Punishment Sticker"]) {
      const d = merchFor(name).details;
      expect(d, name).not.toBeNull();
      expect(JSON.stringify(d)).not.toContain("\u2014");
    }
    expect(merchFor("Unisex Hoodie").details?.note).toMatch(/size up/i);
  });

  it("falls back to the Printful name for products it doesn't know", () => {
    expect(merchFor("Tote Bag")).toEqual({ title: "Tote Bag", kind: null, category: null, designs: [], note: null, details: null });
  });
});
