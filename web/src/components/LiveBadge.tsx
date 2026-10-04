export function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 bg-ink px-2 py-0.5 text-xs font-bold tracking-[0.1em] text-fluor-pink">
      <span
        aria-hidden
        className="size-[7px] animate-blink rounded-full bg-fluor-pink"
      />
      AO VIVO
    </span>
  );
}
