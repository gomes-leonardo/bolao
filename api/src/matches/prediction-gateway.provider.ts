import { createPrismaPredictionsGateway, type Db } from "@bolao/core";
import {
  placePrediction,
  requirePredictionsVisible,
  type PlacePredictionCommand,
  type PlacedPrediction,
} from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";

export const PREDICTION_USE_CASES = Symbol("PREDICTION_USE_CASES");

export interface PredictionUseCases {
  place(command: PlacePredictionCommand): Promise<PlacedPrediction>;
  requireVisible(matchId: number): Promise<void>;
}

/**
 * Liga a porta do palpite ao adapter do Prisma e entrega os casos de uso já
 * amarrados nela.
 *
 * É aqui que a escolha de implementação acontece, e é o único arquivo que
 * precisa mudar para trocá-la — nem o caso de uso nem o service sabem que
 * existe Prisma do outro lado (ADR 0008).
 *
 * A borda recebe os dois casos de uso e **não** a porta: com a porta em mão,
 * `windowOf` fica chamável de dentro do service, e um código futuro que
 * pré-valide a janela antes de gravar reabriria exatamente a corrida que o ADR
 * 0004 fechou, sem quebrar nenhum teste.
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const predictionUseCasesProvider: Provider = {
  provide: PREDICTION_USE_CASES,
  inject: [DB],
  useFactory: (db: Db): PredictionUseCases => {
    const gateway = createPrismaPredictionsGateway(db);
    return {
      place: (command) => placePrediction(gateway, command),
      requireVisible: (matchId) => requirePredictionsVisible(gateway, matchId),
    };
  },
};
