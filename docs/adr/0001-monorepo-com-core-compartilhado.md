# 0001 · Monorepo com um `core` compartilhado em TypeScript-fonte

**Status:** aceita · 2026-10-02

## Contexto

O CLI (fase 2) precisava pontuar palpites antes de a API (fase 3) existir. A API e o front também
precisam das mesmas regras e dos mesmos formatos de dados.

## Decisão

- **Layout:** npm workspaces com `/api`, `/web` e `/cli` na raiz, mais `packages/core`. O core guarda o
  schema Prisma e as migrations, a regra de pontos, o caso de uso `registerResult` e os contratos zod.
- **Sem build:** o core é consumido como **TypeScript-fonte**. O CLI e a API rodam no Node ≥ 22.18, que
  apaga os tipos em tempo de execução; o tsc só faz typecheck. Por isso o core usa
  `erasableSyntaxOnly`, sem enums nem parameter properties.
- **Subpaths para o front:** o front importa `@bolao/core/contracts` e `@bolao/core/scoring`, que não
  carregam o Prisma.

## Consequências

- Não existe etapa de build do core, e a mesma regra vale no CLI, na API e no front.
- Funciona porque o workspace é um symlink fora de `node_modules`: o Node se recusa a apagar tipos de
  arquivos dentro de `node_modules`. **Uma imagem de deploy que copie o pacote para `node_modules`
  quebra.** Quando o deploy entrar no roadmap, o core passa a ter build (`tsc` para `dist`).
