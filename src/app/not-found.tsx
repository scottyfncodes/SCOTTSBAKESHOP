import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page confirm">
      <h1>That loaf isn&rsquo;t on the shelf</h1>
      <p className="muted">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: 12 }}>Back to the shop</Link>
    </div>
  );
}
