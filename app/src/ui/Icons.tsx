/** Every icon in the app, as one-path SVGs on a 24-unit grid.  Inline rather than a
 *  sprite or an icon package: it is a handful of shapes and they have to render with
 *  no network at all. */
import type { ReactNode } from "react";

const Sv = ({ children, cls }: { children: ReactNode; cls?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={cls}>
    {children}
  </svg>
);

export const ModeIcon = ({ m }: { m: string }) => {
  if (m === "walk")
    return (
      <Sv>
        <circle cx="13" cy="4.5" r="2" />
        <path d="M11 21l2-5-2.5-3 .5-4 3 2 2 1M10.5 9 8 11l-1 3" />
      </Sv>
    );
  if (m === "transit")
    return (
      <Sv>
        <rect x="5" y="3" width="14" height="13" rx="2.5" />
        <path d="M5 11h14M8 20l1.5-4M16 20l-1.5-4" />
        <circle cx="8.8" cy="13.5" r=".8" />
        <circle cx="15.2" cy="13.5" r=".8" />
      </Sv>
    );
  return (
    <Sv>
      <path d="M4 16v3M20 16v3M3 16v-4l2-5h14l2 5v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M5 12h14M9 4h6" />
      <circle cx="7.5" cy="15.5" r=".9" />
      <circle cx="16.5" cy="15.5" r=".9" />
    </Sv>
  );
};

export const PersonIcon = () => (
  <Sv>
    <circle cx="12" cy="4.6" r="2.4" />
    <path d="M12 7.4v6.4M8.6 10.2 12 8.8l3.4 1.4M9.4 21.5 12 14.6l2.6 6.9" />
  </Sv>
);

/** The little person standing on the map.  Head, torso, two arms and two legs, each
 *  limb its own group so CSS can swing it, drawn twice — a dark ink pass under a
 *  green skin pass — which is what keeps him readable on satellite imagery. */
const FigPass = ({ cls }: { cls: string }) => (
  <g className={`${cls} mefig`}>
    <g className="meleg-l"><path d="M17 30 9.8 50.5" /></g>
    <g className="meleg-r"><path d="M17 30 24.2 50.5" /></g>
    <g className="mearm-l"><path d="M17 20 10.6 31" /></g>
    <g className="mearm-r"><path d="M17 20 23.4 31" /></g>
    <path d="M17 18V32" />
    <circle cx="17" cy="11" r="5" />
  </g>
);

export const Figure = () => (
  <svg viewBox="0 0 34 54" aria-hidden="true">
    <ellipse className="meground" cx="17" cy="52" rx="8" ry="2.6" />
    <FigPass cls="ink" />
    <FigPass cls="skin" />
  </svg>
);
