interface WordmarkProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "border-[3px] px-2 pt-[3px] pb-[2px] text-lg",
  md: "border-[3px] px-2.5 pt-1 pb-0.5 text-xl",
  lg: "border-[5px] px-4 pt-2 pb-1.5 text-5xl",
};

export function Wordmark({ size = "md" }: WordmarkProps) {
  return (
    <span
      className={`inline-block -rotate-3 self-start border-fluor-orange font-display leading-none font-black tracking-[0.02em] text-fluor-orange stretch-semi misprint-pink ${sizes[size]}`}
    >
      CARIMBOU
    </span>
  );
}
