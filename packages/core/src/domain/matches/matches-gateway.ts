import type { MatchStatus } from "../../matches/match-status.ts";

/**
 * O time como a leitura de jogo precisa dele.
 *
 * Tipo de domínio, não o `TeamView` de `contracts`: o formato de fio é da
 * borda, e os dois são estruturalmente idênticos de propósito, então a
 * conversão é de graça e o typecheck quebra na borda se o contrato mudar.
 */
export interface TeamRecord {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crestUrl: string | null;
}

export interface PredictionRecord {
  home: number;
  away: number;
  points: number | null;
}

/**
 * Um jogo, como o domínio e a borda o leem.
 *
 * `locked` vem preenchido pelo adapter, avaliado pelo mesmo fragmento SQL da
 * gravação do palpite e com o relógio do Postgres. Não é uma conveniência: era
 * o único jeito de ter um predicado só. Calcular `locked` aqui, em TypeScript,
 * seria escrever o predicado uma segunda vez e com outro relógio, que é
 * exatamente a dívida que o ADR 0008 registrou.
 */
export interface MatchRow {
  id: number;
  season: number;
  round: number;
  kickoffAt: Date;
  status: MatchStatus;
  locked: boolean;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  myPrediction: PredictionRecord | null;
}

/**
 * Uma linha do muro da galera: o membro e o palpite dele, se houver.
 *
 * O muro lê `pool_members`, então esta operação é uma leitura de bolão morando
 * na porta de jogos. A razão decisiva é topológica, não estética: `PoolsModule`
 * importa `MatchesModule`, então pôr isto em `PoolsGateway` e injetar a porta de
 * bolões no `PredictionsService` fecharia um ciclo de módulos e exigiria
 * `forwardRef`. O custo aceito é o adapter de jogos conhecer `pool_members`.
 */
export interface WallRow {
  user: { id: number; name: string };
  prediction: PredictionRecord | null;
}

export interface MatchesGateway {
  /** Rodada do próximo jogo da temporada que ainda não encerrou. */
  firstUnfinishedRound(season: number): Promise<number | null>;

  /** Última rodada importada da temporada. */
  lastRound(season: number): Promise<number | null>;

  matchesOfRound(
    userId: number,
    season: number,
    round: number,
  ): Promise<MatchRow[]>;

  matchById(userId: number, matchId: number): Promise<MatchRow | null>;

  /**
   * Jogos da rodada que ainda aceitam palpite e que o usuário não palpitou.
   *
   * O "ainda aceita palpite" é o mesmo fragmento da gravação, então esta conta
   * e a trava nunca discordam.
   */
  countOpenWithoutPrediction(
    userId: number,
    season: number,
    round: number,
  ): Promise<number>;

  /** Palpites dos membros de um bolão num jogo, em ordem alfabética. */
  wallEntriesOf(poolId: number, matchId: number): Promise<WallRow[]>;
}
