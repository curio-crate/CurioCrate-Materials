"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

// "Are you sure you want to delete this?" for every delete in Studio. One <dialog> for the whole workspace
// (focus is trapped, Esc cancels, Cancel has focus first so Enter never deletes by accident).

export type ConfirmOptions = { title: string; message?: ReactNode; confirmLabel?: string; tone?: "danger" | "neutral" };
type Ask = (o: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<Ask>(async (o) => window.confirm(o.title));
export const useConfirm = () => useContext(Ctx);

/** The usual wording for deleting something that goes to Recently deleted. */
export const deleteMessage = (what = "it") => `${what[0].toUpperCase()}${what.slice(1)} moves to Recently deleted. An admin can restore it for 30 days; after that it is deleted for good.`;

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();

  const confirm = useCallback<Ask>((o) => new Promise((resolve) => setAsk({ ...o, resolve })), []);

  useEffect(() => {
    if (ask && !ref.current?.open) ref.current?.showModal();
  }, [ask]);

  const done = (v: boolean) => {
    ask?.resolve(v);
    ref.current?.close();
    setAsk(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <dialog
        ref={ref}
        className="st-confirm"
        aria-labelledby={`${uid}-t`}
        aria-describedby={`${uid}-m`}
        onCancel={(e) => {
          e.preventDefault();
          done(false);
        }}
        onClick={(e) => e.target === ref.current && done(false)}
      >
        {ask && (
          <div className="st-confirmBox">
            <span className={`st-confirmIcon ${ask.tone === "neutral" ? "" : "st-confirmDanger"}`} aria-hidden="true">
              <Icon name={ask.tone === "neutral" ? "undo" : "trash"} size={20} />
            </span>
            <h2 id={`${uid}-t`} className="st-confirmTitle">
              {ask.title}
            </h2>
            <p id={`${uid}-m`} className="st-confirmText">
              {ask.message ?? deleteMessage()}
            </p>
            <div className="st-confirmActions">
              <button type="button" className="btn btn-sm" onClick={() => done(false)} autoFocus>
                Cancel
              </button>
              <button type="button" className={`btn btn-sm ${ask.tone === "neutral" ? "btn-solid" : "st-btnDanger"}`} onClick={() => done(true)}>
                {ask.confirmLabel ?? "Delete"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

/**
 * A submit button for a server-action form that asks first. Without JavaScript the form never posts (the button is
 * type="button"), so nothing can be deleted without the question.
 */
export function ConfirmSubmit({ title, message, confirmLabel, tone, className, children, ...rest }: ConfirmOptions & { className?: string; children: ReactNode; "aria-label"?: string; disabled?: boolean }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      className={className}
      {...rest}
      onClick={async (e) => {
        const form = e.currentTarget.form;
        if (form && (await confirm({ title, message, confirmLabel, tone }))) form.requestSubmit();
      }}
    >
      {children}
    </button>
  );
}
