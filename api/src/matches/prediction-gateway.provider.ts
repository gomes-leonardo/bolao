import { createPrismaPredictionsGateway, type Db } from "@bolao/core";
import type { PredictionsGateway } from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";

export const PREDICTION_GATEWAY = Symbol("PREDICTION_GATEWAY");

/**
 * Liga a porta do domínio ao adapter do Prisma.
 *
 * É aqui que a escolha de implementação acontece, e é o único arquivo que
 * precisa mudar para trocá-la — nem o caso de uso nem o service sabem que
 * existe Prisma do outro lado (ADR 0008).
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const predictionGatewayProvider: Provider = {
  provide: PREDICTION_GATEWAY,
  inject: [DB],
  useFactory: (db: Db): PredictionsGateway =>
    createPrismaPredictionsGateway(db),
};
