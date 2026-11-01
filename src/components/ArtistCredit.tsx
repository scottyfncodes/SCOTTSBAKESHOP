import type { Design } from "@/lib/merch";

/**
 * "Art by Name (@handle)", or "Art by @handle" when we only have the handle,
 * linked to the artist. With `named`, the design name leads ("Gluten for
 * Punishment art by …") for products that carry several designs.
 */
export function ArtistCredit({ design, named = false }: { design: Design; named?: boolean }) {
  if (!design.artist) return null;
  return (
    <p className="artist-credit">
      {named ? `${design.name} art by ` : "Art by "}
      {design.artist.name ? (
        <>
          {design.artist.name} (
          <a href={design.artist.url} target="_blank" rel="noopener noreferrer">
            @{design.artist.handle}
          </a>
          )
        </>
      ) : (
        <a href={design.artist.url} target="_blank" rel="noopener noreferrer">
          @{design.artist.handle}
        </a>
      )}
    </p>
  );
}
