import type { Catalog } from "@/lib/types";

export function ShopNotice({ status }: { status: Exclude<Catalog["status"], "ok"> | "empty" }) {
  return (
    <div className="notice" role="status">
      {status === "error" ? (
        <>
          <h3>The shelves are a little stuck</h3>
          <p>We couldn&rsquo;t load the merch just now. Please refresh in a minute.</p>
        </>
      ) : (
        <>
          <h3>Fresh batch coming out of the oven</h3>
          <p>The merch shelf is being stocked. Check back soon.</p>
        </>
      )}
    </div>
  );
}
