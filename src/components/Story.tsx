/** The brand's short history. Sits below the merch on purpose: the shirts come first. */
export function Story() {
  return (
    <section id="story" className="story" aria-labelledby="story-heading">
      <div className="container story-inner">
        <img className="story-stamp" src="/logo.png" alt="" width={120} height={120} loading="lazy" />
        <div>
          <p className="eyebrow">The story</p>
          <h2 id="story-heading">Six years of bread</h2>
          <p>
            Scott&rsquo;s Bake Shop was a neighborhood bakery for six years. We closed the doors in May 2026,
            but the name, the art and the bread jokes were too good to pack away.
          </p>
          <p>
            So they live here now, made to order. If you were a regular, welcome back. If you weren&rsquo;t,
            you missed some excellent bread. Good news: the merch never goes stale.
          </p>
        </div>
      </div>
    </section>
  );
}
