import { Link } from "react-router";

const FIRST_ROUND = 1;
const LAST_ROUND = 38;

const linkClass =
  "flex min-h-11 items-center gap-1 px-3 text-sm font-bold text-muted hover:text-paper";

export function RoundNav({ round }: { round: number }) {
  return (
    <nav aria-label="Outras rodadas" className="flex justify-between px-3 pb-2">
      {round > FIRST_ROUND ? (
        <Link to={`/rodada?rodada=${round - 1}`} className={linkClass}>
          ‹ Rodada {round - 1}
        </Link>
      ) : (
        <span />
      )}
      {round < LAST_ROUND && (
        <Link to={`/rodada?rodada=${round + 1}`} className={linkClass}>
          Rodada {round + 1} ›
        </Link>
      )}
    </nav>
  );
}
