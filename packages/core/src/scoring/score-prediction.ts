export interface Score {
  home: number;
  away: number;
}

export type Points = 0 | 1 | 3;

const outcome = (score: Score) => Math.sign(score.home - score.away);

export function scorePrediction(prediction: Score, result: Score): Points {
  if (prediction.home === result.home && prediction.away === result.away)
    return 3;
  return outcome(prediction) === outcome(result) ? 1 : 0;
}
