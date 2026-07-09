import type { SVGProps, ReactNode } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(children: ReactNode) {
  return function Icon({ size = 18, ...props }: IconProps) {
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
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };
}

export const IconDashboard = make(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </>,
);

export const IconMockup = make(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 15.5l4.8-4.6a1.5 1.5 0 0 1 2.1 0l5.1 5.1" />
    <path d="M13.5 14l2.2-2.1a1.5 1.5 0 0 1 2.1 0l2.7 2.6" />
    <circle cx="9.2" cy="8.8" r="1.4" />
  </>,
);

export const IconListing = make(
  <>
    <path d="M5 4.5h14" />
    <path d="M5 9h14" />
    <path d="M5 13.5h9" />
    <path d="M5 18h6" />
  </>,
);

export const IconNaming = make(
  <>
    <path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z" />
    <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" strokeWidth={1.3} />
  </>,
);

export const IconPdf = make(
  <>
    <path d="M6 3.5h8l4 4v13h-12z" />
    <path d="M14 3.5v4h4" />
    <path d="M9 13h6" />
    <path d="M9 16.5h4" />
  </>,
);

export const IconSocial = make(
  <>
    <path d="M4 11l14-6-2.5 13-5-3.5L8 17l-.5-4z" />
  </>,
);

export const IconSettings = make(
  <>
    <path d="M4 7h10" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M20 16.5h-10" />
    <circle cx="7" cy="16.5" r="2.5" />
  </>,
);

export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M3 12h2M19 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </>,
);

export const IconMoon = make(
  <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z" />,
);

export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>,
);

export const IconCopy = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </>,
);

export const IconCheck = make(<path d="M4.5 12.5l5 5 10-11" />);

export const IconDownload = make(
  <>
    <path d="M12 3.5V15" />
    <path d="M7 10.5l5 5 5-5" />
    <path d="M4.5 20h15" />
  </>,
);

export const IconUpload = make(
  <>
    <path d="M12 15V3.5" />
    <path d="M7 8l5-5 5 5" />
    <path d="M4.5 20h15" />
  </>,
);

export const IconTrash = make(
  <>
    <path d="M4.5 6.5h15" />
    <path d="M8.5 6.5V4.8A1.3 1.3 0 0 1 9.8 3.5h4.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6.5 6.5l1 13.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-13.5" />
  </>,
);

export const IconUndo = make(
  <>
    <path d="M8 6L4 10l4 4" />
    <path d="M4 10h10a6 6 0 0 1 0 12h-3" />
  </>,
);

export const IconRedo = make(
  <>
    <path d="M16 6l4 4-4 4" />
    <path d="M20 10H10a6 6 0 0 0 0 12h3" />
  </>,
);

export const IconPlus = make(<path d="M12 5v14M5 12h14" />);

export const IconX = make(<path d="M6 6l12 12M18 6L6 18" />);

export const IconChevronRight = make(<path d="M9 5.5l6.5 6.5L9 18.5" />);

export const IconChevronDown = make(<path d="M5.5 9l6.5 6.5L18.5 9" />);

export const IconArrowRight = make(
  <>
    <path d="M4 12h15" />
    <path d="M13.5 6.5L19 12l-5.5 5.5" />
  </>,
);

export const IconHistory = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2.5" />
  </>,
);

export const IconWand = make(
  <>
    <path d="M5 19L17.5 6.5" />
    <path d="M18 3.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" strokeWidth={1.3} />
    <path d="M7.5 3.8l.6 1.3 1.3.6-1.3.6-.6 1.3-.6-1.3-1.3-.6 1.3-.6z" strokeWidth={1.2} />
  </>,
);

export const IconRefresh = make(
  <>
    <path d="M20 12a8 8 0 1 1-2.5-5.8" />
    <path d="M20 3.5V7h-3.5" />
  </>,
);

export const IconPalette = make(
  <>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.5-1.4-1.8-1.4-3 0-1 .8-1.7 2-1.7h1.9a4 4 0 0 0 4-4c0-3.7-3.9-6.5-8.5-6.5z" />
    <circle cx="7.8" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.6" cy="7.3" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="7.3" r="1" fill="currentColor" stroke="none" />
  </>,
);

export const IconKeyboard = make(
  <>
    <rect x="3" y="7" width="18" height="11" rx="2" />
    <path d="M7 11h.01M11 11h.01M15 11h.01M7.5 14.5h9" />
  </>,
);

export const IconExternal = make(
  <>
    <path d="M14 4.5h5.5V10" />
    <path d="M19.5 4.5L11 13" />
    <path d="M19.5 14v4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h4" />
  </>,
);

export const IconMail = make(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="M4.5 7.5l7.5 5.5 7.5-5.5" />
  </>,
);

export const IconLayers = make(
  <>
    <path d="M12 3.5L21 8.5l-9 5-9-5z" />
    <path d="M4 13l8 4.5 8-4.5" />
    <path d="M4 17l8 4.5 8-4.5" strokeOpacity="0.5" />
  </>,
);

export const IconRuler = make(
  <>
    <rect x="2.5" y="9" width="19" height="6" rx="1.5" transform="rotate(-20 12 12)" />
    <path d="M8 12.8l.8 2.2M12 11.3l.8 2.2M16 9.9l.8 2.2" transform="rotate(-20 12 12)" />
  </>,
);
