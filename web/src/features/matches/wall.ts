import type { WallEntry } from "@bolao/core/contracts";
import { scorePrediction, type Score } from "@bolao/core/scoring";

export type WallMark = "exact" | "outcome" | "miss" | "none";

/** Como o palpite está em relação ao placar atual. A regra é a mesma que pontua no backend. */
export function markOf(entry: WallEntry, score: Score | null): WallMark {
  if (!entry.prediction) return "none";
  if (!score) return "miss";
  const points = scorePrediction(entry.prediction, score);
  return points === 3 ? "exact" : points === 1 ? "outcome" : "miss";
}

export interface WallSummary {
  exact: number;
  outcome: number;
  miss: number;
}

export function summarize(
  entries: WallEntry[],
  score: Score | null,
): WallSummary {
  const summary: WallSummary = { exact: 0, outcome: 0, miss: 0 };
  for (const entry of entries) {
    const mark = markOf(entry, score);
    if (mark !== "none") summary[mark]++;
  }
  return summary;
}
