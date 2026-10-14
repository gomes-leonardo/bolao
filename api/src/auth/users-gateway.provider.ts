import { createPrismaUsersGateway, type Db } from "@bolao/core";
import type { UsersGateway } from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";

export const USERS_GATEWAY = Symbol("USERS_GATEWAY");

/**
 * Liga a porta das contas ao adapter do Prisma.
 *
 * A porta é injetada crua, não embrulhada em casos de uso como a de membership,
 * porque aqui não existe caso de uso para embrulhar: a regra da autenticação é
 * da borda (ADR 0005), e o que esta porta resolve é o `auth.service.ts` parar
 * de conhecer o Prisma. Em membership o embrulho era necessário porque
 * `findVisiblePool` devolvendo `null` sem ninguém lançar seria um bypass de
 * autorização; nenhum método daqui tem essa propriedade.
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const usersGatewayProvider: Provider = {
  provide: USERS_GATEWAY,
  inject: [DB],
  useFactory: (db: Db): UsersGateway => createPrismaUsersGateway(db),
};
