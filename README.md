# Bolão

Bolão do Brasileirão entre amigos: palpites de placar, pontuação automática e ranking por bolão.

Projeto de estudo do roadmap Full Stack do [roadmap.sh](https://roadmap.sh/full-stack).

## Stack

- **API:** NestJS + Prisma + PostgreSQL
- **CLI:** Node + commander (importa jogos e registra resultados)
- **Web:** React 19 + Vite + TypeScript + Tailwind 4 + TanStack Query + React Router

## Estrutura

```
packages/core   regra de negócio compartilhada + schema e migrations do Prisma
cli/            importa jogos da football-data e registra resultados
api/            API REST em NestJS
web/            front em React + Vite + Tailwind (identidade Carimbou)
docs/           contrato da autenticação (fase 4)
web/            React (fase 5)
```

## Rodando localmente

Requisitos: Node 22.18+, Docker.

```bash
npm run setup        # copia os .env.example de cada pacote e instala as dependências
npm run db:up        # sobe o Postgres 18 na porta 5433
npm run db:migrate   # aplica as migrations e gera o Prisma Client
```

Cada pacote tem o próprio `.env` (por exemplo `packages/core/.env`). Para usar outra porta no
host, exporte `POSTGRES_HOST_PORT` antes do `db:up` **e** ajuste a porta em `DATABASE_URL` e
`TEST_DATABASE_URL` no `packages/core/.env`.

> Atualizando de uma versão antiga em que o serviço do compose se chamava `db`? Rode
> `docker compose down --remove-orphans` uma vez antes do `db:up`.

| Script                    | O que faz                                                                      |
| ------------------------- | ------------------------------------------------------------------------------ |
| `setup`                   | cria os `.env` que faltam a partir dos `.env.example` e roda `npm install`     |
| `lint` / `lint:fix`       | ESLint no monorepo                                                             |
| `format` / `format:check` | Prettier no monorepo                                                           |
| `typecheck`               | `tsc --noEmit` em cada pacote                                                  |
| `test`                    | testes unitários (`*.spec.ts`) de todos os pacotes                             |
| `test:integration`        | testes contra Postgres real (`*.integration.spec.ts`), precisa do `db:up`      |
| `db:up` / `db:down`       | sobe / derruba o Postgres                                                      |
| `db:migrate`              | aplica migrations pendentes (`prisma migrate dev`) e gera o client             |
| `db:migrate:new <nome>`   | gera uma migration a partir do schema **sem aplicar**, para editar o SQL antes |
| `db:reset`                | **apaga o banco** e reaplica todas as migrations. Só em dev                    |
| `db:generate`             | regenera o Prisma Client                                                       |

## CLI

Importa a tabela do Brasileirão e registra resultados. A configuração fica em `cli/.env`:
`DATABASE_URL` e, para usar a API, `FOOTBALL_DATA_API_KEY` (chave gratuita em
[football-data.org](https://www.football-data.org/client/register)).

```bash
npm run cli -- import --round 28                 # rodada da temporada atual, pela API
npm run cli -- import -r 27 -s 2026 -f cli/fixtures/bsa-2026-amostra.json   # sem API
npm run cli -- result --match 980011 2-1         # placar final digitado à mão
```

- `import` cria ou atualiza times e jogos (é seguro rodar de novo). Todo jogo encerrado da
  rodada tem os palpites recalculados a cada import. Se um jogo deixa de estar encerrado
  (atraso da API, jogo anulado), os pontos dele voltam a ficar vazios.
- **A football-data é a fonte da verdade.** O `result` manual é o plano B para quando a API está
  fora, e o próximo `import` sobrescreve o que foi digitado à mão.
- `result` encerra um jogo pelo id da football-data e recalcula os pontos. Recusa jogo que ainda
  não começou.
- Jogo adiado (`POSTPONED`) fica com os palpites travados até a API remarcar a data.
- Status da football-data: `TIMED` vira agendado; `IN_PLAY`, `PAUSED` e `SUSPENDED` viram ao vivo
  (jogo interrompido não pontua até ter resultado final); `AWARDED` (W.O.) pontua pelo placar
  oficial.
- `cli/fixtures/bsa-2026-amostra.json` é uma amostra **fictícia** (rodada 27 encerrada e rodada 28
  por jogar) para desenvolver sem chave.

## API

```bash
npm run cli -- import -r 27 -s 2026 -f cli/fixtures/bsa-2026-amostra.json
npm run cli -- import -r 28 -s 2026 -f cli/fixtures/bsa-2026-amostra.json
npm run db:seed      # usuários, bolões e palpites de dev (idempotente)
npm run api          # http://localhost:3333/api
```

Configuração em `api/.env`. A autenticação JWT é a fase 4 (contrato em
[`docs/auth-contract.md`](docs/auth-contract.md)). Até lá, com `AUTH_MODE=dev`, a API aceita o header
`X-Dev-User-Id` com um dos ids que o `db:seed` imprime:

```bash
curl localhost:3333/api/pools -H 'X-Dev-User-Id: <id>'
```

| Rota                                          | O que faz                                            |
| --------------------------------------------- | ---------------------------------------------------- |
| `GET /health`                                 | pública                                              |
| `GET /me`                                     | usuário atual                                        |
| `GET /matches?round=`                         | jogos da rodada (atual por padrão) com o meu palpite |
| `GET /matches/:id`                            | um jogo                                              |
| `PUT /matches/:id/prediction`                 | cria ou edita o palpite (`409` depois do apito)      |
| `POST /pools` · `GET /pools?page&pageSize`    | cria / lista meus bolões com posição e pendências    |
| `GET` · `PATCH` · `DELETE /pools/:id`         | ver (membro), renomear e apagar (dono)               |
| `POST /pools/join`                            | entra pelo código de convite                         |
| `GET /pools/:id/members` · `DELETE …/:userId` | membros; o dono remove, o membro sai, o dono não sai |
| `GET /pools/:id/ranking?round=`               | classificação: pontos, depois cravadas               |
| `GET /pools/:id/matches/:matchId/predictions` | o muro da galera, só depois do apito                 |

- **Erros:** sempre no formato `{ "error": { "code", "message", "details"? } }`. Os códigos estão em
  `packages/core/src/contracts/responses.ts`.
- **Quem não é membro** recebe `404`, para não revelar que o bolão existe.
- **A trava do palpite** é checada no mesmo comando SQL que grava, então não há janela entre checar e
  gravar.

## Web

```bash
npm run dev          # API (3333) e web (http://localhost:5174) juntos
```

Configuração em `web/.env`. Com `VITE_AUTH_MODE=dev`, a tela de login mostra o **modo dev**: entra com
o id de um usuário do `db:seed`. O login com e-mail e senha já chama `/auth/login` e
`/auth/register` (contrato da fase 4) e avisa enquanto essas rotas não existem.

- **Identidade:** tokens de cor, fonte e animação no `@theme` de `web/src/styles.css` (Tailwind 4).
  Design no [Claude Design](https://claude.ai/artifact/KVYbVSHby5PLrw9t1PWU7t).
- **Organização:** `components/` só renderiza (props e callbacks); `features/*/use*.ts` cuida de dados e
  estado (TanStack Query); `pages/` liga os dois; `api/` é o único lugar que fala HTTP.
- **Contratos:** os tipos de resposta, os schemas dos formulários e a regra de pontos (projeção do muro
  da galera) vêm de `@bolao/core`. O front não reimplementa nada disso.
- **Tempo real:** sem WebSocket/SSE nesta etapa. A rodada e o muro são buscados de novo a cada 30 s
  enquanto há jogo ao vivo.

## Testes

- **Unitários** (`*.spec.ts`) ficam ao lado do arquivo testado e não tocam o banco.
- **Integração** (`*.integration.spec.ts`) rodam contra um banco dedicado, definido em
  `TEST_DATABASE_URL`. Ele é criado do zero, recebe as migrations e é apagado no fim. Se apontar
  para o banco de desenvolvimento, a suíte aborta antes de tocar em qualquer coisa.

## Migrations

O `schema.prisma` não expressa `CHECK` nem extensões. Toda migration que precisa deles é criada com
`npm run db:migrate:new <nome>`, editada à mão e só então aplicada com `npm run db:migrate`.
O Prisma ignora esses objetos ao comparar schema e banco, então eles não geram drift.

O Prisma Migrate é forward-only: desfazer uma migration já aplicada é escrever uma nova.

## Decisões e dívidas

- [ADRs](docs/adr/): monorepo com `core` em TS-fonte, Prisma com CHECKs à mão, palpite global com
  pontos gravados, trava no SQL, costura da auth, polling em vez de tempo real e a identidade Carimbou.
- [Dívida técnica e próximos passos](docs/divida-tecnica.md), incluindo o espaço "o que eu aprendi".
- [Contrato da autenticação](docs/auth-contract.md) (fase 4).
