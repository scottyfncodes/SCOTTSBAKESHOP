import type { Design } from "@/lib/merch";

/**
 * "Art by @handle", linked to the artist. With `named`, the design name leads
 * ("Gluten for Punishment art by @handle") for products that carry several designs.
 */
export function ArtistCredit({ design, named = false }: { design: Design; named?: boolean }) {
  if (!design.artist) return null;
  return (
    <p className="artist-credit">
      {named ? `${design.name} art by ` : "Art by "}
      <a href={design.artist.url} target="_blank" rel="noopener noreferrer">
        @{design.artist.handle}
      </a>
    </p>
  );
}
