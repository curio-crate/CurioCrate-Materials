import type { ReactNode } from "react";

// The curiocrate.org inner-page header pattern: mono eyebrow → display title (second line italic) → lead.
export function PageHead({
  eyebrow,
  title,
  accent,
  lead,
  center = false,
  size = "display",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  accent?: ReactNode;
  lead?: ReactNode;
  center?: boolean;
  size?: "display" | "h1" | "h2";
  children?: ReactNode;
}) {
  return (
    <header className={`page-head ${center ? "page-head-center" : ""}`}>
      <span className="eyebrow rise">{eyebrow}</span>
      <h1 className={`${size === "display" ? "display" : size} rise-2`}>
        {title}
        {accent && (
          <>
            {" "}
            <br />
            <span className="italic-accent">{accent}</span>
          </>
        )}
      </h1>
      {lead && <p className="lead rise-3">{lead}</p>}
      {children}
    </header>
  );
}
