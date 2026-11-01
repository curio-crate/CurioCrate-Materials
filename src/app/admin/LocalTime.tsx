"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

const FORMATS = {
  short: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  date: { weekday: "short", month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** A time in the viewer's own time zone (the server renders UTC, so the browser fills it in). */
export function LocalTime({ iso, format = "short" }: { iso: string; format?: keyof typeof FORMATS }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString("en-US", FORMATS[format]),
    () => new Date(iso).toLocaleString("en-US", { ...FORMATS[format], timeZone: "UTC" }),
  );
  return <time dateTime={iso}>{text}</time>;
}
