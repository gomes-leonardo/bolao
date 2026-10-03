const MAX_GOALS = 99;

interface ScoreStepperProps {
  team: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean | undefined;
}

export function ScoreStepper({
  team,
  value,
  onChange,
  disabled,
}: ScoreStepperProps) {
  const buttonClass =
    "size-11 border-2 border-ink text-[22px] leading-none disabled:opacity-40";

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[15px] font-bold">{team}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Menos um gol do ${team}`}
          className={buttonClass}
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <output
          aria-label={`Gols do ${team}`}
          className="w-10 text-center font-display text-[44px] leading-none font-black tabular-nums stretch-condensed"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label={`Mais um gol do ${team}`}
          className={buttonClass}
          disabled={disabled || value >= MAX_GOALS}
          onClick={() => onChange(Math.min(MAX_GOALS, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
