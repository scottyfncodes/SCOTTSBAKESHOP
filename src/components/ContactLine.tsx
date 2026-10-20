import { site } from "@/lib/site";

export function ContactLine({ prefix = "Email us" }: { prefix?: string }) {
  if (!site.contactEmail) return <>Contact us</>;
  return (
    <>
      {prefix} at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
    </>
  );
}
