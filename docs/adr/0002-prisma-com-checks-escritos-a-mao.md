# 0002 · Prisma, com CHECKs escritos à mão nas migrations

**Status:** aceita · 2026-10-02

## Contexto

O Leo escolheu Prisma, o mais comum com NestJS no mercado. As regras de integridade do bolão (placar
pareado, status válido, pontos 0/1/3, código de convite) cabem melhor no banco do que só na aplicação,
mas o `schema.prisma` não expressa `CHECK` nem extensões.

## Decisão

- Toda migration que precisa de CHECK ou extensão (`citext`) é gerada com `migrate dev --create-only`,
  editada à mão e só depois aplicada.
- O Prisma ignora esses objetos no diff, então eles não geram drift (verificado).
- Uma suíte de integração (`constraints.integration.spec.ts`) tenta inserts válidos e inválidos e
  confere o SQLSTATE **e o nome da constraint** que disparou.
- IDs são `int` serial, não `bigint`, para evitar `BigInt` no JSON.

## Consequências

- As regras valem para qualquer cliente do banco, inclusive SQL cru no CLI.
- O Prisma Migrate é forward-only: desfazer uma migration já aplicada é escrever outra.
- O `migrate reset` é bloqueado quando quem chama é um agente de IA. Quem roda esse comando é o dev.
