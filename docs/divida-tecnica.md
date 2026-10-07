# Dívida técnica e próximos passos

O que ficou conscientemente para depois, em ordem aproximada de quando vai doer.

## Próximas etapas do roadmap (fora do escopo de propósito)

- **Autenticação JWT (fase 4, do Leo):** cadastro e login por e-mail e senha e a validação do access
  token já funcionam. Faltam `refresh_tokens`, a renovação do token no front e aposentar o
  `X-Dev-User-Id`. Contrato em [`auth-contract.md`](auth-contract.md).
- **Redis:** o ranking é recalculado no Postgres a cada leitura; o ponto de troca é o `RankingService`.
- **Tempo real:** polling de 30 s ([ADR 0006](adr/0006-polling-em-vez-de-tempo-real.md)).
- **Agendamento do CLI:** o `import` roda à mão; um cron entra junto com servidores e deploy.
- **CI/CD e deploy:** nenhum pipeline ainda. Ao fazer o deploy, o `packages/core` precisa de build
  ([ADR 0001](adr/0001-monorepo-com-core-compartilhado.md)).

## Front

- **Bundle de 504 kB** (155 kB gzip): dividir por rota com `React.lazy` e avaliar o peso do zod no cliente.
- **`useCurrentPool`:** guarda a seleção em estado local mais `localStorage`. Dois componentes montados ao
  mesmo tempo não se sincronizam; se isso crescer, vira contexto ou parâmetro de rota.
- **Lista de bolões:** busca até 50 sem paginação na tela.
- **Testes:** só existem testes de componentes e funções; não há testes de página nem E2E (Playwright).
- **Escudos:** são placeholders. Usar os da football-data exige decidir a questão de marca.

## API e dados

- **Erros do framework:** todo 400 sai como "JSON inválido.". Hoje só o body-parser gera esse tipo de erro.
- **`join` com o bolão apagado no meio:** a FK estoura e a resposta é 500. A janela é mínima.
- **Status `SUSPENDED`:** fica "ao vivo" indefinidamente se a football-data nunca mandar o resultado.
- **Recálculo no import:** todo import reescreve os pontos dos jogos encerrados da rodada. É barato na
  escala atual.
- **Dados de dev:** o `db:seed` cria todos os usuários com a senha única `carimbou123`, então dá para
  entrar pela tela de e-mail e senha.

## O que eu aprendi

_Espaço do Leo._
