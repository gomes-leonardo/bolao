interface TeamCrestProps {
  tla: string;
  size?: "sm" | "lg";
}

/** Placeholder neutro: escudos de clubes são marcas registradas. */
export function TeamCrest({ tla, size = "sm" }: TeamCrestProps) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center border-2 border-ink font-bold ${
        size === "lg" ? "size-11 text-xs" : "size-[30px] text-[10px]"
      }`}
    >
      {tla}
    </span>
  );
}
