import type { MatchStatus } from "../matches/match-status.ts";

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "NOT_OWNER"
  | "NOT_FOUND"
  | "POOL_NOT_FOUND"
  | "MATCH_NOT_FOUND"
  | "MEMBER_NOT_FOUND"
  | "PREDICTION_LOCKED"
  | "PREDICTIONS_HIDDEN"
  | "ALREADY_MEMBER"
  | "OWNER_CANNOT_LEAVE"
  | "PAYLOAD_TOO_LARGE"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: { path: string; message: string }[];
  };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface UserView {
  id: number;
  name: string;
  email: string;
}

export interface PoolSummary {
  id: number;
  name: string;
  inviteCode: string;
  season: number;
  isOwner: boolean;
  memberCount: number;
  myPosition: number;
  myPoints: number;
  pendingPredictions: number;
}

export interface MemberView {
  id: number;
  name: string;
  isOwner: boolean;
  joinedAt: string;
}

export interface TeamView {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crestUrl: string | null;
}

export interface PredictionView {
  home: number;
  away: number;
  points: number | null;
}

export interface MatchView {
  id: number;
  season: number;
  round: number;
  kickoffAt: string;
  status: MatchStatus;
  locked: boolean;
  homeTeam: TeamView;
  awayTeam: TeamView;
  score: { home: number; away: number } | null;
  myPrediction: PredictionView | null;
}

export interface RoundView {
  season: number;
  round: number;
  matches: MatchView[];
}

export interface RankingEntry {
  position: number;
  user: { id: number; name: string };
  points: number;
  exactHits: number;
}

export interface RankingView {
  poolId: number;
  season: number;
  round: number | null;
  entries: RankingEntry[];
}

export interface WallEntry {
  user: { id: number; name: string };
  prediction: PredictionView | null;
}

export interface WallView {
  match: MatchView;
  entries: WallEntry[];
}
