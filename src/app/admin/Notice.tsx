// Shows the ?ok= / ?err= message that admin actions redirect back with.
export function Notice({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const err = typeof sp.err === "string" ? sp.err : null;
  if (!ok && !err) return null;
  return (
    <p className={`alert ${err ? "alert-danger" : "alert-success"}`} role={err ? "alert" : "status"} style={{ marginBottom: 24 }}>
      {err ?? ok}
    </p>
  );
}
