export { createPrismaMatchesGateway } from "./adapters/prisma/prisma-matches-gateway.ts";
export { createPrismaMembershipGateway } from "./adapters/prisma/prisma-membership-gateway.ts";
export { createPrismaPredictionsGateway } from "./adapters/prisma/prisma-predictions-gateway.ts";
export { createPrismaPoolsGateway } from "./adapters/prisma/prisma-pools-gateway.ts";
export { createPrismaRankingGateway } from "./adapters/prisma/prisma-ranking-gateway.ts";
export { createPrismaUsersGateway } from "./adapters/prisma/prisma-users-gateway.ts";
export { violatedUniqueConstraint } from "./adapters/prisma/unique-constraint.ts";
export { createDb, type Db } from "./db.ts";
export { matchStatuses, type MatchStatus } from "./matches/match-status.ts";
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
