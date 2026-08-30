/* Minimal inline icon set — stroke-based, inherits currentColor. */

const S = ({ size = 16, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const Paw = (p) => (
  <S {...p}>
    <circle cx="6" cy="7" r="1.6" />
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="18" cy="7" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <path d="M12 13.5c-2.8 0-5.2 2-5.2 4.6 0 1.2 1 2 2.2 2 .6 0 1.1-.2 1.6-.5.5.3 1 .5 1.4.5s.9-.2 1.4-.5c.5.3 1 .5 1.6.5 1.2 0 2.2-.8 2.2-2 0-2.6-2.4-4.6-5.2-4.6z" />
  </S>
);

export const X = (p) => (
  <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>
);

export const Plus = (p) => (
  <S {...p}><path d="M12 5v14M5 12h14" /></S>
);

export const Locate = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </S>
);

export const Layers = (p) => (
  <S {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </S>
);

export const Filter = (p) => (
  <S {...p}><path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" /></S>
);

export const ChevronDown = (p) => (
  <S {...p}><path d="M6 9l6 6 6-6" /></S>
);

export const Copy = (p) => (
  <S {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 012-2h9" />
  </S>
);

export const Check = (p) => (
  <S {...p}><path d="M4 12.5l5 5L20 6.5" /></S>
);

export const Shield = (p) => (
  <S {...p}>
    <path d="M12 3l8 3.2V12c0 4.8-3.4 8.2-8 9-4.6-.8-8-4.2-8-9V6.2L12 3z" />
    <path d="M9 12l2 2 4-4" />
  </S>
);

export const Clock = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </S>
);

export const Share = (p) => (
  <S {...p}>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="6" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
    <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
  </S>
);

export const ArrowRight = (p) => (
  <S {...p}><path d="M4 12h16M13 5l7 7-7 7" /></S>
);

export const External = (p) => (
  <S {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h5" />
  </S>
);

export const Alert = (p) => (
  <S {...p}>
    <path d="M12 3L2.5 20h19L12 3z" />
    <path d="M12 10v4M12 17.2v.1" />
  </S>
);

export const Info = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8v.1" />
  </S>
);

export const MapPin = (p) => (
  <S {...p}>
    <path d="M12 22s7-6.1 7-12a7 7 0 10-14 0c0 5.9 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.6" />
  </S>
);

export const Compass = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
  </S>
);

export const Globe = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9z" />
  </S>
);

export const Menu = (p) => (
  <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>
);

export const Book = (p) => (
  <S {...p}>
    <path d="M12 6c-1.8-1.4-4-2-6.5-2H3v15h2.5C8 19 10.2 19.6 12 21c1.8-1.4 4-2 6.5-2H21V4h-2.5c-2.5 0-4.7.6-6.5 2z" />
    <path d="M12 6v15" />
  </S>
);

export const Scale = (p) => (
  <S {...p}>
    <path d="M12 4v16M8 20h8" />
    <path d="M4 8h16l-2-3H6L4 8z" />
    <path d="M4 8l-2 5a2.8 2.8 0 005.6 0L4 8zM20 8l-2 5a2.8 2.8 0 005.6 0L20 8z" />
  </S>
);

export const Sun = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </S>
);

export const Moon = (p) => (
  <S {...p}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </S>
);