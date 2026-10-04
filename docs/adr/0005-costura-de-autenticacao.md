# 0005 · Costura de autenticação com guard de desenvolvimento

**Status:** aceita · 2026-10-03

## Contexto

A autenticação JWT é a fase 4, feita pelo Leo. A API e o front precisavam existir e ser testáveis antes
dela, sem que a troca depois exigisse refatoração.

## Decisão

- **API:** um `APP_GUARD` global preenche `request.user = { id }`. Os controllers usam `@CurrentUser()`;
  as rotas abertas usam `@Public()`.
- **Guard provisório:** o `DevAuthGuard` aceita `X-Dev-User-Id` **só com `AUTH_MODE=dev`**, confere se o
  usuário existe e, fora desse modo, responde 401 em tudo.
- **Front:** a sessão é `{ kind: "dev", userId }` ou `{ kind: "token", accessToken }`. O login e o
  cadastro já chamam `/auth/*` conforme o [contrato](../auth-contract.md).

## Consequências

- A fase 4 troca só o guard (e acrescenta as rotas e o refresh). Nenhum controller muda.
- Enquanto `AUTH_MODE=dev` estiver ligado, qualquer um se passa por qualquer usuário. É aceitável só em
  desenvolvimento local.
