// Iconos SVG en línea: la fuente pixel (Press Start 2P) no incluye estos glifos.
const PATHS = {
  play: <path d="M2 1l11 7-11 7z" />,
  spark: <path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" />,
  caretDown: <path d="M1 4h14L8 12z" />,
  caretRight: <path d="M4 1l8 7-8 7z" />,
  arrowRight: <path d="M0 7h11V3l5 5-5 5V9H0z" />,
  check: <path d="M1 8.5l2-2 3.5 3.5L13 3.5l2 2-8.5 8.5z" />,
  circle: <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />,
  diamond: <path d="M8 0l8 8-8 8-8-8z" />,
  squares: (
    <>
      <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="5" y="5" width="6" height="6" />
    </>
  ),
  search: (
    <>
      <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 11.5L11.5 10l4 4-1.5 1.5z" />
    </>
  ),
  star: <path d="M8 0l2.4 5.4 5.6.6-4.2 3.9 1.2 5.6L8 12.6 3 15.5l1.2-5.6L0 6l5.6-.6z" />,
  starOutline: (
    <path
      d="M8 1.6l2 4.5 4.9.5-3.7 3.3 1.1 4.8L8 12l-4.3 2.7 1.1-4.8L1.1 6.6 6 6.1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  menu: <path d="M1 2h14v2.5H1zm0 4.75h14v2.5H1zM1 11.5h14V14H1z" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  side,
  className = "",
}: {
  name: IconName;
  /** Margen: `l` = icono antes del texto, `r` = icono después. */
  side?: "l" | "r";
  className?: string;
}) {
  const cls = ["svg-ico", side === "l" && "ico-lead", side === "r" && "ico-trail", className]
    .filter(Boolean)
    .join(" ");
  return (
    <svg className={cls} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
