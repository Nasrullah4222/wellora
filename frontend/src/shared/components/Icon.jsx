const iconPaths = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  nurse: (
    <>
      <path d="M12 6V2m-2 2h4" />
      <circle cx="12" cy="9" r="4" />
      <path d="M4 22c.5-5 3.2-7 8-7s7.5 2 8 7" />
    </>
  ),
  doctor: (
    <>
      <path d="M8 3v4a4 4 0 0 0 8 0V3M6 3h4m4 0h4" />
      <path d="M12 11v3a5 5 0 0 0 10 0v-1" />
      <circle cx="21" cy="11" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 13h6M9 17h6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7z" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  message: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 10h8M8 14h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22c.6-5 3.2-7.5 8-7.5s7.4 2.5 8 7.5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="3" />
      <path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m0 0L7 8m5-5 5 5" />
      <path d="M5 14v6h14v-6" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 6h15a3 3 0 0 1 3 3v10H5a2 2 0 0 1-2-2z" />
      <path d="M3 7V5a2 2 0 0 1 2-2h13v4M16 12h5" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="14" height="14" rx="3" />
      <path d="m17 10 5-3v10l-5-3z" />
    </>
  ),
  flask: (
    <>
      <path d="M9 2h6M10 2v6l-6 11a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 8V2" />
      <path d="M7 16h10" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </>
  ),
  phone: <path d="M5 3h4l2 5-3 2c1.5 3 3 4.5 6 6l2-3 5 2v4c0 2-2 3-4 2C9 19 5 15 3 7c-1-2 0-4 2-4z" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
    </>
  ),
  star: <path d="m12 2 3 6 6.5 1-4.7 4.7 1.1 6.5-5.9-3-5.9 3 1.1-6.5L2.5 9 9 8z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8z" />,
  trend: (
    <>
      <path d="m3 17 6-6 4 4 8-9" />
      <path d="M16 6h5v5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c.5-5 2.8-7 7-7s6.5 2 7 7M16 5a4 4 0 0 1 0 7M18 14c2.5.5 3.8 2.5 4 6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h4l2-3h4l2 3h4v13H4z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
};
export function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}
