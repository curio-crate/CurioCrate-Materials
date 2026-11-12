// Shown while a teacher or student page loads. It waits 150ms before appearing (.sx-loading), so quick navigations
// never flash a skeleton; slow ones get a calm outline of a page: title, toolbar, then rows.
export default function Loading() {
  return (
    <div className="container-wide sx-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div style={{ display: "grid", gap: 12, paddingBlock: "48px 32px" }} aria-hidden="true">
        <span className="sx-skel" style={{ width: 160, height: 14 }} />
        <span className="sx-skel" style={{ width: "min(420px, 80%)", height: 38 }} />
      </div>
      <div style={{ display: "grid", gap: 8 }} aria-hidden="true">
        <span className="sx-skel" style={{ height: 52, borderRadius: 12, marginBottom: 24 }} />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sx-skel" style={{ height: 84, borderRadius: 12, opacity: 1 - i * 0.18 }} />
        ))}
      </div>
    </div>
  );
}
