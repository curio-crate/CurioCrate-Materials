export type FormState = { error?: string; success?: string } | null;

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return <div aria-live="polite" />;
  return (
    <div aria-live="polite">
      {state.error && (
        <p className="alert alert-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="alert alert-success">{state.success}</p>}
    </div>
  );
}
