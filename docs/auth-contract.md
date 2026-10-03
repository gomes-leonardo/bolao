# Contrato da autenticação (fase 4)

Especificação para implementar a autenticação JWT na API. O front já é construído contra este
contrato. Enquanto ela não existe, a API roda com `AUTH_MODE=dev` e aceita o header
`X-Dev-User-Id` (veja [Onde encaixar](#onde-encaixar)).

## Regras de negócio

- **Senha:** mínimo de 8 caracteres, guardada com **bcrypt** em `users.password_hash`. Nunca volta em
  resposta nenhuma.
- **E-mail:** único sem diferenciar maiúsculas. A coluna já é `citext` com `UNIQUE`.
- **Access token:** JWT de vida curta (sugestão: 15 min), assinado com `JWT_ACCESS_SECRET`. O payload
  mínimo é `{ sub: <user id> }`. Vai no header `Authorization: Bearer <token>`.
- **Refresh token:** opaco e aleatório, de vida longa (sugestão: 7 dias). O banco guarda só o
  **hash**, nunca o token. Cada uso gera um novo par, e o refresh usado é revogado (**rotação**).
- **Reuso de refresh revogado:** é sinal de roubo. Revogue todos os refresh tokens daquele usuário.
- **Entrega do refresh:** decisão tua, mas registre o porquê:
  - cookie `httpOnly; Secure; SameSite=Strict` em `/api/auth`, protegido de XSS; ou
  - corpo da resposta, guardado pelo front, que é mais simples e mais exposto.

Se escolher o cookie: a API precisa de `enableCors({ origin, credentials: true })` (em
`api/src/app.setup.ts`) e o front de `fetch(..., { credentials: "include" })` (em
`web/src/api/client.ts`). Portas diferentes de `localhost` contam como o mesmo site, então
`SameSite=Strict` continua funcionando em dev.

## Tabela nova

Migration `create_refresh_tokens`, seguindo o fluxo do README (`db:migrate:new`, editar o SQL,
`db:migrate`):

| coluna       | tipo           | regra                                       |
| ------------ | -------------- | ------------------------------------------- |
| `id`         | serial         | PK                                          |
| `user_id`    | int            | FK `users`, `ON DELETE CASCADE`, com índice |
| `token_hash` | text           | `UNIQUE`                                    |
| `expires_at` | timestamptz(3) | obrigatório                                 |
| `revoked_at` | timestamptz(3) | `NULL` enquanto válido                      |
| `created_at` | timestamptz(3) | default `now()`                             |

## Rotas

Todas sob `/api`, com erros no formato padrão `{ "error": { "code", "message", "details"? } }`.
As quatro rotas de `/auth` são **públicas** (`@Public()`).

### `POST /auth/register`

```json
{ "name": "Leo", "email": "leo@resenha.com", "password": "12345678" }
```

| Status | Quando                                   | Corpo                                  |
| ------ | ---------------------------------------- | -------------------------------------- |
| 201    | criou                                    | `{ user: UserView, accessToken, ... }` |
| 400    | nome vazio, e-mail inválido, senha curta | `VALIDATION_FAILED` com `details`      |
| 409    | e-mail já usado                          | `EMAIL_TAKEN`                          |

O cadastro já devolve a sessão (mesmo corpo do login), para o front entrar direto.

### `POST /auth/login`

```json
{ "email": "leo@resenha.com", "password": "12345678" }
```

| Status | Quando                  | Corpo                                  |
| ------ | ----------------------- | -------------------------------------- |
| 200    | credenciais certas      | `{ user: UserView, accessToken, ... }` |
| 401    | e-mail ou senha errados | `INVALID_CREDENTIALS`                  |

A mensagem de erro é **a mesma** para e-mail inexistente e senha errada. O tempo de resposta também
não pode entregar qual dos dois falhou: compare com bcrypt mesmo quando o usuário não existe.

### `POST /auth/refresh`

Recebe o refresh token (do cookie ou do corpo, conforme a tua decisão).

| Status | Quando                                 | Corpo                          |
| ------ | -------------------------------------- | ------------------------------ |
| 200    | refresh válido                         | novo `accessToken` (+ refresh) |
| 401    | ausente, expirado, revogado ou reusado | `UNAUTHENTICATED`              |

### `POST /auth/logout`

Revoga o refresh token atual. Responde **204** mesmo que ele já esteja inválido (logout é idempotente).

### `GET /me` (já existe)

Protegida. Devolve `UserView` (`{ id, name, email }`).

## Onde encaixar

A API já isola "quem é o usuário" num guard global:

- `api/src/auth/auth.module.ts` registra o guard como `APP_GUARD`.
- `api/src/auth/dev-auth.guard.ts` é o provisório. Ele lê `X-Dev-User-Id` e preenche
  `request.user = { id }`.
- `@Public()` libera uma rota; `@CurrentUser()` lê `request.user` nos controllers.

A fase 4 cria um `JwtAuthGuard`, que valida o `Bearer`, preenche `request.user` do mesmo jeito e
respeita `@Public()`, e troca o provider no `AuthModule`. **Nenhum controller ou service muda.**
Mantenha o `DevAuthGuard` só se ele continuar bloqueado fora de `AUTH_MODE=dev`, ou apague.

Adicione os códigos `EMAIL_TAKEN` e `INVALID_CREDENTIALS` ao tipo `ApiErrorCode` em
`packages/core/src/contracts/responses.ts`, e os schemas zod de `register`/`login` em
`packages/core/src/contracts/requests.ts`: o front reusa os dois.

## Testes esperados

No padrão do resto da API (`api/src/test/test-app.ts`, app real + `fetch`):

- cadastro: sucesso, e-mail duplicado (inclusive com maiúsculas diferentes), validação;
- login: sucesso, senha errada e e-mail inexistente com a **mesma** resposta;
- rota protegida: sem token, token expirado, token com assinatura errada, token válido;
- refresh: rotação (o antigo deixa de funcionar), reuso revogando tudo, expirado;
- logout: revoga, e repetir continua 204.
