import type { ReactNode } from "react";

/** The top of every Studio page: title, one line of help, and the page's main action on the right. */
export function StudioHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="st-pagehead">
      <div>
        <h1 className="st-title">{title}</h1>
        {sub && <p className="st-sub">{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  );
}
