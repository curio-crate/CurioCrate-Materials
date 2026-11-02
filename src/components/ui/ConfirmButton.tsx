"use client";

import { useId, useRef, type ReactNode } from "react";

/**
 * A destructive button that asks first. Place it inside the <form> it should submit: the trigger opens a native modal
 * dialog (focus is trapped, Escape cancels) and the dialog's confirm button submits that form. Any `fields` are sent
 * with it (e.g. confirm=on).
 */
export function ConfirmButton({
  children,
  className = "btn btn-sm btn-danger",
  ariaLabel,
  title,
  text,
  confirmLabel,
  fields,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  title: string;
  text: ReactNode;
  confirmLabel: string;
  fields?: Record<string, string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button type="button" className={className} aria-label={ariaLabel} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog ref={ref} className="sx-dialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <h2 id={`${id}-t`}>{title}</h2>
        <p id={`${id}-d`}>{text}</p>
        {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="sx-dialog-actions">
          <button type="button" className="btn" autoFocus onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger-solid">
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
