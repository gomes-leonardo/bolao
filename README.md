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

Requisitos: Node 22.18+ (roda TypeScript direto, sem build), Docker.

```bash
cp .env.example .env
npm install
npm run db:up        # sobe o Postgres 18 na porta 5433
npm run db:migrate   # aplica as migrations e gera o Prisma Client
npm run db:check     # valida as constraints do banco
```

| Script | O que faz |
| --- | --- |
| `db:up` / `db:down` | sobe / derruba o Postgres |
| `db:migrate` | aplica migrations pendentes (`prisma migrate dev`) |
| `db:migrate:new <nome>` | gera uma migration a partir do schema **sem aplicar**, para editar o SQL antes |
| `db:reset` | **apaga o banco** e reaplica todas as migrations. Só em dev |
| `db:generate` | regenera o Prisma Client |
| `db:check` | roda inserts válidos e inválidos contra o banco e confere as constraints |

## Migrations

O `schema.prisma` não expressa `CHECK` nem extensões. Toda migration que precisa deles é criada com
`npm run db:migrate:new <nome>`, editada à mão e só então aplicada com `npm run db:migrate`.
O Prisma ignora esses objetos ao comparar schema e banco, então eles não geram drift.

O Prisma Migrate é forward-only: desfazer uma migration já aplicada é escrever uma nova.
