"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { STUDIO_THEME_COOKIE } from "@/lib/auth/roles";

/** Light / dark switch for Studio. Remembered in a cookie so the server renders the right theme (no flash). */
export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState(initial);
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className="st-iconBtn"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        document.querySelector(".studio")?.setAttribute("data-theme", next);
        document.cookie = `${STUDIO_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=strict`;
        setTheme(next);
      }}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} size={15} />
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
