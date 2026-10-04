import type { ReactNode } from "react";

type Tilt = "left" | "right" | "slight" | "none";

const tilts: Record<Tilt, string> = {
  left: "[--paper-tilt:-0.8deg]",
  right: "[--paper-tilt:0.6deg]",
  slight: "[--paper-tilt:-0.3deg]",
  none: "[--paper-tilt:0deg]",
};

interface PaperProps {
  children: ReactNode;
  tilt?: Tilt | undefined;
  tape?: "left" | "right" | undefined;
  highlighted?: boolean | undefined;
  className?: string;
}

/** O lambe: papel claro colado no asfalto, levemente torto, às vezes com fita. */
export function Paper({
  children,
  tilt = "none",
  tape,
  highlighted,
  className = "",
}: PaperProps) {
  return (
    <div
      className={`relative animate-paste rotate-(--paper-tilt) bg-paper text-ink ${tilts[tilt]} ${
        highlighted
          ? "outline-[3px] outline-offset-[3px] outline-fluor-orange"
          : ""
      } ${className}`}
    >
      {tape && (
        <span
          aria-hidden
          className={`absolute -top-2 h-4 w-14 bg-tape/75 ${
            tape === "left" ? "left-6 -rotate-[4deg]" : "right-7 rotate-[5deg]"
          }`}
        />
      )}
      {children}
    </div>
  );
}
