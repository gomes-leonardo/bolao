import type { MatchView } from "@bolao/core/contracts";
import type { StampTone } from "../../components/Stamp";

export interface Verdict {
  label: string;
  tone: StampTone;
}

/** O carimbo do card: trancado no apito, veredito quando o jogo acaba. */
export function verdictOf(match: MatchView): Verdict | null {
  if (match.status === "finished") {
    const points = match.myPrediction?.points;
    if (points === 3) return { label: "CRAVOU +3", tone: "orange" };
    if (points === 1) return { label: "NA TRAVE +1", tone: "blue" };
    if (points === 0) return { label: "PASSOU LONGE", tone: "muted" };
    return { label: "SEM PALPITE", tone: "muted" };
  }
  if (match.status === "postponed") return { label: "ADIADO", tone: "muted" };
  if (match.status === "cancelled")
    return { label: "CANCELADO", tone: "muted" };
  if (match.locked) return { label: "TRANCADO", tone: "pink" };
  return null;
}
