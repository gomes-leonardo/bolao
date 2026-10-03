import type { ReactNode } from "react";

export type StampTone = "orange" | "pink" | "blue" | "muted";

const tones: Record<StampTone, string> = {
  orange: "border-fluor-orange text-fluor-orange-ink",
  pink: "border-fluor-pink text-fluor-pink-ink",
  blue: "border-ink-blue text-[#2F5BC4]",
  muted: "border-ink-muted text-ink-muted",
};

interface StampProps {
  children: ReactNode;
  tone?: StampTone;
  size?: "sm" | "md";
}

/** A assinatura do Carimbou: bate no papel com um tranco. */
export function Stamp({ children, tone = "orange", size = "md" }: StampProps) {
  return (
    <span
      className={`inline-block animate-stamp rotate-(--stamp-tilt) border-[3px] font-display leading-tight font-black tracking-[0.05em] whitespace-nowrap stretch-semi [--stamp-tilt:-8deg] ${
        size === "sm" ? "px-1.5 text-[13px]" : "px-2.5 py-0.5 text-base"
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
