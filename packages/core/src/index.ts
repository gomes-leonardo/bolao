export { createDb, type Db } from "./db.ts";
export {
  MatchNotFoundError,
  registerResult,
  type RegisterResultInput,
} from "./matches/register-result.ts";
export {
  scorePrediction,
  type Points,
  type Score,
} from "./scoring/score-prediction.ts";
