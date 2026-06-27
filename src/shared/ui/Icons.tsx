import React from "react";

type IconProps = { className?: string };

function IconShell({ children, className }: React.PropsWithChildren<IconProps>) {
  return (
    <svg className={className || "ui-icon ico"} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* Shared base geometry for the "on" variants. The "off" variants are
   hand-split (paths broken to leave a gap straddling the slash) rather
   than masked, so they have no <defs>/<mask>/id reference — that kind of
   reference breaks in some app shells (e.g. Chromium with a <base href>). */
const micBase = (
  <>
    <path d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z" />
    <path d="M6.5 10.5v1.25a5.5 5.5 0 0 0 11 0V10.5" />
    <path d="M12 17.25v3.25" />
    <path d="M8.5 20.5h7" />
  </>
);

const videoBase = (
  <>
    <path d="M4.5 7.5h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
    <path d="m15.5 10.25 5-2.5v8.5l-5-2.5" />
  </>
);

const headphonesBase = (
  <>
    <path d="M4.5 13v-1.5a7.5 7.5 0 0 1 15 0V13" />
    <path d="M6.25 13h1.5a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5h-.5A2.75 2.75 0 0 1 4.5 16.75V14.75A1.75 1.75 0 0 1 6.25 13Z" />
    <path d="M17.75 13h-1.5a1.5 1.5 0 0 0-1.5 1.5V18a1.5 1.5 0 0 0 1.5 1.5h.5a2.75 2.75 0 0 0 2.75-2.75V14.75A1.75 1.75 0 0 0 17.75 13Z" />
  </>
);

export function MicIcon(props: IconProps) {
  return <IconShell {...props}>{micBase}</IconShell>;
}

export function MicOffIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M9 6.6V6.5A3 3 0 0 1 15 6.5V11.5A3 3 0 0 1 14.3 13.05" />
      <path d="M9 11.4V11.5A3 3 0 0 0 13.5 14.4" />
      <path d="M6.5 10.5V11.75A5.5 5.5 0 0 0 15 15.45" />
      <path d="M16.45 14.95A5.5 5.5 0 0 0 17.5 11.75V10.5" />
      <path d="M12 17.25v3.25" />
      <path d="M8.5 20.5h7" />
      <path d="m4 4 16 16" />
    </IconShell>
  );
}

export function VideoIcon(props: IconProps) {
  return <IconShell {...props}>{videoBase}</IconShell>;
}

export function VideoOffIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M9.83 7.5H13.5A2 2 0 0 1 15.5 9.5V14.5A2 2 0 0 1 13.5 16.5H4.5A2 2 0 0 1 2.5 14.5V9.5A2 2 0 0 1 4.5 7.5H5.17" />
      <path d="m15.5 10.25 5-2.5v8.5l-5-2.5" />
      <path d="m4 4 16 16" />
    </IconShell>
  );
}

export function ScreenIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 17H4a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M9 20h6" />
      <path d="M12 17v3" />
      <path d="m12 8.5 3 3" />
      <path d="m12 8.5-3 3" />
      <path d="M12 8.5v6" />
    </IconShell>
  );
}

export function CameraSwapIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M5 4v4" />
      <path d="M7 6H3.5" />
      <path d="M19 20v-4" />
      <path d="M17 18h3.5" />
      <path d="M13.5 9h4.5a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="m18 12.5-2.5 2.5-2.5-2.5" />
      <path d="M10.5 15H6a1.5 1.5 0 0 1-1.5-1.5v-2" />
      <path d="m6 11.5 2.5-2.5 2.5 2.5" />
    </IconShell>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 10h.01" />
      <path d="M15.5 10h.01" />
      <path d="M8.5 14a4.2 4.2 0 0 0 7 0" />
    </IconShell>
  );
}

export function SendArrowIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M4.5 12h14" />
      <path d="m13 6.5 6 5.5-6 5.5" />
    </IconShell>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M9.25 14.75 14.75 9.25" />
      <path d="M10.5 7.25 11.75 6a4 4 0 0 1 5.65 5.65l-1.25 1.25" />
      <path d="M13.5 16.75 12.25 18a4 4 0 0 1-5.65-5.65l1.25-1.25" />
    </IconShell>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </IconShell>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5Z" />
      <path d="M13.8 20.5a2 2 0 0 1-3.6 0" />
    </IconShell>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M12 17v4" />
      <path d="M8.5 10.5V4.5h7v6l3 3.5h-13l3-3.5Z" />
    </IconShell>
  );
}

export function MaximizeIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M8.5 4.5h-4v4" />
      <path d="M4.5 4.5 10 10" />
      <path d="M15.5 4.5h4v4" />
      <path d="M19.5 4.5 14 10" />
      <path d="M8.5 19.5h-4v-4" />
      <path d="M4.5 19.5 10 14" />
      <path d="M15.5 19.5h4v-4" />
      <path d="M19.5 19.5 14 14" />
    </IconShell>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M4.5 6.5h15" />
      <path d="M4.5 11.5h15" />
      <path d="M4.5 16.5h15" />
    </IconShell>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </IconShell>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M9.5 7 4.5 12l5 5" />
      <path d="M5 12h8a6 6 0 0 1 6 6v1" />
    </IconShell>
  );
}

export function ForwardIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="m14.5 7 5 5-5 5" />
      <path d="M19 12h-8a6 6 0 0 0-6 6v1" />
    </IconShell>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M5 12h.01" />
      <path d="M12 12h.01" />
      <path d="M19 12h.01" />
    </IconShell>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconShell>
  );
}

export function HashIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M9.25 4.5 7.75 19.5" />
      <path d="M16.25 4.5 14.75 19.5" />
      <path d="M5 9h15" />
      <path d="M4 15h15" />
    </IconShell>
  );
}

export function DirectMessageIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="8.25" r="3.25" />
      <path d="M5.25 19.5c1.2-3.15 3.45-4.75 6.75-4.75s5.55 1.6 6.75 4.75" />
    </IconShell>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="m9 6 6 6-6 6" />
    </IconShell>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M7.2 14.2c3.1 3.1 6.5 4.2 9.5 4.1a2 2 0 0 0 1.8-1.3l.7-2a1.5 1.5 0 0 0-.75-1.8l-2.25-1.1a1.6 1.6 0 0 0-1.75.23l-.9.73a10.7 10.7 0 0 1-4.58-4.58l.73-.9a1.6 1.6 0 0 0 .23-1.75L8.8 3.6a1.5 1.5 0 0 0-1.8-.75l-2 .7a2 2 0 0 0-1.3 1.8c-.1 3 1 6.4 3.5 8.85Z" />
    </IconShell>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M4 9.5h3.5L12 5.75v12.5L7.5 14.5H4a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 4 9.5Z" />
      <path d="M16 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </IconShell>
  );
}

export function HeadphonesIcon(props: IconProps) {
  return <IconShell {...props}>{headphonesBase}</IconShell>;
}

export function HeadphonesOffIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M4.5 13V11.5A7.5 7.5 0 0 1 5.48 7.79" />
      <path d="M7.69 5.36A7.5 7.5 0 0 1 19.5 11.5V13" />
      <path d="M6.25 13h1.5a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5h-.5A2.75 2.75 0 0 1 4.5 16.75V14.75A1.75 1.75 0 0 1 6.25 13Z" />
      <path d="M14.75 14.5A1.5 1.5 0 0 1 16.25 13H17.75A1.75 1.75 0 0 1 19.5 14.75V16.75A2.75 2.75 0 0 1 18.55 18.55" />
      <path d="M14.75 17.1V18A1.5 1.5 0 0 0 16.25 19.5H16.75A2.75 2.75 0 0 0 18.65 18.65" />
      <path d="m4 4 16 16" />
    </IconShell>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M17.85 12.9a7.8 7.8 0 0 0 .05-1.4l2.05-1.55-2-3.46-2.42 1a8 8 0 0 0-1.2-.7L14 3.5h-4l-.34 3.28a8 8 0 0 0-1.2.7l-2.42-1-2 3.46L6.09 11.5a7.8 7.8 0 0 0 .05 1.4l-2.1 1.6 2 3.46 2.48-1.03c.38.27.78.5 1.22.67L10 20.5h4l.26-2.9c.44-.18.85-.4 1.22-.67l2.48 1.03 2-3.46-2.1-1.6Z" />
    </IconShell>
  );
}

export function StatusIcon({ status, className }: IconProps & { status: "online" | "busy" | "away" | "offline" }) {
  return (
    <svg className={className || "ui-icon ico"} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <circle cx="6" cy="6" r="4" />
      {status === "away" ? <path d="M6 2a4 4 0 0 0 4 4 4 4 0 1 1-4-4Z" /> : null}
      {status === "offline" ? <circle cx="6" cy="6" r="2.2" /> : null}
    </svg>
  );
}
