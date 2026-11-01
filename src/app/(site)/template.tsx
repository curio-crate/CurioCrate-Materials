import type { ReactNode } from "react";

// Remounts on every navigation (unlike the layout), so each page eases in.
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <div className="sx-enter">{children}</div>;
}
