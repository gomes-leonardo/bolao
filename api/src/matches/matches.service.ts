import { Inject, Injectable } from "@nestjs/common";
import type { MatchView, RoundView, WallEntry } from "@bolao/core/contracts";
import { MatchNotFoundError } from "@bolao/core/domain";
import { currentSeason } from "../common/season.js";
import { toMatchView } from "./match-view.js";
import { MATCHES, type Matches } from "./matches.provider.js";

/**
 * A borda dos jogos: resolve a temporada corrente e passa do domínio para o
 * formato de fio. Nenhuma regra mora aqui.
 */
@Injectable()
export class MatchesService {
  constructor(@Inject(MATCHES) private readonly matches: Matches) {}

  currentRound(season: number): Promise<number> {
    return this.matches.currentRound(season);
  }

  async round(userId: number, round?: number): Promise<RoundView> {
    const season = currentSeason();
    const selected = round ?? (await this.matches.currentRound(season));
    const matches = await this.matches.matchesOfRound(userId, season, selected);
    return { season, round: selected, matches: matches.map(toMatchView) };
  }

  async byId(userId: number, matchId: number): Promise<MatchView> {
    const match = await this.matches.matchById(userId, matchId);
    if (!match) throw new MatchNotFoundError(matchId);
    return toMatchView(match);
  }

  pendingPredictions(userId: number, season: number): Promise<number> {
    return this.matches.pendingPredictions(userId, season);
  }

  /**
   * As linhas do muro. `WallRow` e `WallEntry` são estruturalmente idênticos,
   * então a anotação de retorno é a única conversão necessária.
   */
  wallEntries(poolId: number, matchId: number): Promise<WallEntry[]> {
    return this.matches.wallEntriesOf(poolId, matchId);
  }
}
