import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5z" />
      <path strokeWidth={1.7} d="M3.3 8.7 12 14l8.7-5.3" />
      <path strokeWidth={1.7} d="M12 21v-7" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={2} d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={2} d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" strokeWidth={1.7} />
      <path strokeWidth={1.7} d="M12 7.5V12l3 2" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M12 3v11" />
      <path strokeWidth={1.7} d="m7 10 5 5 5-5" />
      <path strokeWidth={1.7} d="M5 20h14" />
    </IconBase>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M14 5h5v5" />
      <path strokeWidth={1.7} d="m10 14 9-9" />
      <path strokeWidth={1.7} d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </IconBase>
  );
}

export function FileJsonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M14 3v5h5" />
      <path strokeWidth={1.7} d="M6 3h8l5 5v13H6z" />
      <path strokeWidth={1.7} d="M10 13c-1 0-1.5.6-1.5 1.4V16c0 .8-.5 1.3-1.3 1.3.8 0 1.3.5 1.3 1.3v1.1" />
      <path strokeWidth={1.7} d="M14 13c1 0 1.5.6 1.5 1.4V16c0 .8.5 1.3 1.3 1.3-.8 0-1.3.5-1.3 1.3v1.1" />
    </IconBase>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M21 12a9 9 0 1 1-6.2-8.6" />
    </IconBase>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M6 7.5 12 4l6 3.5v7L12 18l-6-3.5z" />
      <path strokeWidth={1.7} d="M6.2 7.7 12 11l5.8-3.3" />
      <path strokeWidth={1.7} d="M12 18v-7" />
    </IconBase>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M20 6v5h-5" />
      <path strokeWidth={1.7} d="M4 18v-5h5" />
      <path strokeWidth={1.7} d="M18.4 9A7 7 0 0 0 6.2 6.6L4 9" />
      <path strokeWidth={1.7} d="M5.6 15a7 7 0 0 0 12.2 2.4L20 15" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" strokeWidth={1.7} />
      <path strokeWidth={1.7} d="m16 16 4 4" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path strokeWidth={1.7} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M12 3 10.4 8.4 5 10l5.4 1.6L12 17l1.6-5.4L19 10l-5.4-1.6z" />
      <path strokeWidth={1.7} d="M19 15v4" />
      <path strokeWidth={1.7} d="M21 17h-4" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M4 7h16" />
      <path strokeWidth={1.7} d="M10 11v6" />
      <path strokeWidth={1.7} d="M14 11v6" />
      <path strokeWidth={1.7} d="M6 7l1 14h10l1-14" />
      <path strokeWidth={1.7} d="M9 7V4h6v3" />
    </IconBase>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={1.7} d="M12 21V10" />
      <path strokeWidth={1.7} d="m7 14 5-5 5 5" />
      <path strokeWidth={1.7} d="M5 4h14" />
    </IconBase>
  );
}

export function XIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path strokeWidth={2} d="M6 6l12 12" />
      <path strokeWidth={2} d="M18 6 6 18" />
    </IconBase>
  );
}
