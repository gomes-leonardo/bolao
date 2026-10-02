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
api/            NestJS (fase 3)
cli/            comandos de importação e resultado (fase 2)
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
