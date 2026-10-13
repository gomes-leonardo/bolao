/**
 * A camada de domínio: regras, erros, portas e casos de uso.
 *
 * Nada aqui importa framework, Prisma ou o client do banco — a regra de lint em
 * `eslint.config.js` recusa, e o ADR 0008 explica por quê. É esse barril que o
 * subpath `@bolao/core/domain` publica, e é por isso que importá-lo não arrasta
 * o Prisma para quem consome.
 */
export {
  currentRoundOf,
  pendingPredictionsOf,
} from "./matches/current-round.ts";
export {
  MatchNotFoundError,
  NoMatchesImportedError,
} from "./matches/match-errors.ts";
export {
  type MatchRow,
  type MatchesGateway,
  type PredictionRecord,
  type TeamRecord,
  type WallRow,
} from "./matches/matches-gateway.ts";
export {
  NotPoolOwnerError,
  PoolNotVisibleError,
} from "./membership/membership-errors.ts";
export {
  type MembershipGateway,
  type PoolAccess,
} from "./membership/membership-gateway.ts";
export { requireMember, requireOwner } from "./membership/require-member.ts";
export {
  PredictionLockedError,
  PredictionsHiddenError,
} from "./predictions/prediction-errors.ts";
export {
  toPredictionWindow,
  type PredictionWindow,
  type WindowReading,
} from "./predictions/prediction-window.ts";
export {
  type PlacePredictionCommand,
  type PlacedPrediction,
  type PredictionsGateway,
} from "./predictions/predictions-gateway.ts";
export { placePrediction } from "./predictions/place-prediction.ts";
export { requirePredictionsVisible } from "./predictions/reveal-predictions.ts";
export { rankStandings, type Standing } from "./ranking/rank-standings.ts";
export {
  type MemberTally,
  type PoolTally,
  type RankingGateway,
} from "./ranking/ranking-gateway.ts";
export {
  type CreateUserCommand,
  type UserCredentials,
  type UserIdentity,
  type UsersGateway,
} from "./users/users-gateway.ts";
export { MAX_INVITE_CODE_ATTEMPTS, createPool } from "./pools/create-pool.ts";
export { joinPool } from "./pools/join-pool.ts";
export {
  AlreadyMemberError,
  CannotRemoveOtherMemberError,
  InviteCodeExhaustedError,
  InviteCodeNotFoundError,
  OwnerCannotLeaveError,
  PoolMemberNotFoundError,
} from "./pools/pool-errors.ts";
export { summarizePool, type PoolOverview } from "./pools/pool-summary.ts";
export {
  type CreatePoolCommand,
  type MemberRecord,
  type PoolRecord,
  type PoolsGateway,
} from "./pools/pools-gateway.ts";
export { removePoolMember } from "./pools/remove-member.ts";
