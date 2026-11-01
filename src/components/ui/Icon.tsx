// Small stroke icon set. Uses currentColor so color always comes from the theme.
const PATHS: Record<string, React.ReactNode> = {
  lab: (
    <>
      <path d="M9 3h6M10 3v6.5L4.8 18.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9.5V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  instructions: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
      <path d="M8 8h8M8 12h6" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9.2v5.6l4.8-2.8z" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  interactive: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M9.5 9l-2.5 2.5 2.5 2.5M14.5 9l2.5 2.5-2.5 2.5M8 21h8" />
    </>
  ),
  manual: (
    <>
      <path d="M12 6.5C10 4.8 7 4.5 3.5 5v14c3.5-.5 6.5-.2 8.5 1.5 2-1.7 5-2 8.5-1.5V5C17 4.5 14 4.8 12 6.5z" />
      <path d="M12 6.5v14" />
    </>
  ),
  training: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-11" />,
  download: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5l5 5-5 5" />,
  back: <path d="M19 12H5m5-5l-5 5 5 5" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.9 2.6 2.6 3 5.2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8L20 3m-3 3l2.5 2.5M14.5 8.5L17 11" />
    </>
  ),
  spark: <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" />
      <rect x="7" y="14" width="10" height="7" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" />
      <circle cx="12" cy="19.2" r="1" />
    </>
  ),
  captions: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10.5 10.2a2.5 2.5 0 1 0 0 3.6M17.5 10.2a2.5 2.5 0 1 0 0 3.6" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  // Studio
  home: <path d="M3.5 10.5 12 3.8l8.5 6.7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />,
  folder: <path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  box: (
    <>
      <path d="M3.8 7.6 12 3.5l8.2 4.1v8.8L12 20.5l-8.2-4.1z" />
      <path d="m3.8 7.6 8.2 4.1 8.2-4.1M12 11.7v8.8" />
    </>
  ),
  school: (
    <>
      <path d="M2.5 9.5 12 4.5l9.5 5-9.5 5z" />
      <path d="M6.5 11.6v4.6c1.6 1.5 3.4 2.3 5.5 2.3s3.9-.8 5.5-2.3v-4.6M21.5 9.5v5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19.5 6v5.6c0 4.6-3.1 8-7.5 9.2-4.4-1.2-7.5-4.6-7.5-9.2V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  upload: <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  logout: <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10" />,
  // Studio team: chat, inbox, to-dos, Recently deleted
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6" />,
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" />,
  inbox: <path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19zM3.5 13.5H9a3 3 0 0 0 6 0h5.5" />,
  clip: <path d="m20 11.5-7.6 7.6a5 5 0 0 1-7.1-7.1l7.8-7.8a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.2-7.2" />,
  send: <path d="M4 12 20 4l-5 16-3.5-6.5zM11.5 13.5 20 4" />,
  undo: <path d="M9 7 4.5 11.5 9 16M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-3" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  todo: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8 12.2 2.7 2.7L16.2 9" />
    </>
  ),
  ngss: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className, label }: { name: IconName | string; size?: number; className?: string; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}
