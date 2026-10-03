# Bolão

Bolão do Brasileirão entre amigos: palpites de placar, pontuação automática e ranking por bolão.

Projeto de estudo do roadmap Full Stack do [roadmap.sh](https://roadmap.sh/full-stack).

## Stack

- **API:** NestJS + Prisma + PostgreSQL
- **CLI:** Node + commander (importa jogos e registra resultados)
- **Web:** React + Vite + TypeScript + Tailwind

## Estrutura

```
packages/core   regra de negócio compartilhada + schema e migrations do Prisma
cli/            importa jogos da football-data e registra resultados
api/            NestJS (fase 3)
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

- `import` cria ou atualiza times e jogos (é seguro rodar de novo). Jogos que chegam encerrados
  já têm os palpites pontuados. Se o placar oficial mudar depois, os pontos são recalculados.
- `result` encerra um jogo pelo id da football-data e recalcula os pontos. Recusa jogo que ainda
  não começou.
- Status da football-data: `TIMED` vira agendado; `IN_PLAY`, `PAUSED` e `SUSPENDED` viram ao vivo
  (jogo interrompido não pontua até ter resultado final); `AWARDED` (W.O.) pontua pelo placar
  oficial.
- `cli/fixtures/bsa-2026-amostra.json` é uma amostra **fictícia** (rodada 27 encerrada e rodada 28
  por jogar) para desenvolver sem chave.

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
