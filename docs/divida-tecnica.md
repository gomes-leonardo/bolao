# Dívida técnica e próximos passos

O que ficou conscientemente para depois, em ordem aproximada de quando vai doer.

## Próximas etapas do roadmap (fora do escopo de propósito)

- **Autenticação JWT (fase 4, do Leo):** cadastro e login por e-mail e senha e a validação do access
  token já funcionam. Faltam `refresh_tokens`, a renovação do token no front e aposentar o
  `X-Dev-User-Id`. Contrato em [`auth-contract.md`](auth-contract.md).
- **Redis:** o ranking é recalculado no Postgres a cada leitura. O ponto de troca é uma linha em
  `api/src/ranking/ranking.provider.ts`: escrever um `RankingGateway` com um método, `talliesOf`.
  A regra de ordenação e empate não é tocada, porque ela não está lá.
- **Tempo real:** polling de 30 s ([ADR 0006](adr/0006-polling-em-vez-de-tempo-real.md)).
- **Agendamento do CLI:** o `import` roda à mão; um cron entra junto com servidores e deploy.
- **CI/CD e deploy:** nenhum pipeline ainda. Ao fazer o deploy, o `packages/core` precisa de build
  ([ADR 0001](adr/0001-monorepo-com-core-compartilhado.md)).

## Camadas (Épico 0 entregue)

A [ADR 0008](adr/0008-camadas-e-direcao-das-dependencias.md), com a emenda de fechamento, nomeou
as camadas e cobriu a API inteira. Com o Postgres parado, `npm test` passa com 198 testes.
`@Inject(DB)` existe em dois lugares: `health.controller.ts`, isento por escrito na ADR, e
`db.module.ts`, que é o provedor do token.

O que ficou:

- **`registerResult` continua recebendo `Db` direto**, e é a última regra compartilhada que fala
  com o Prisma. O épico que tira o cálculo de pontos da transação (#18) é o dono natural dessa
  migração: trazê-la para cá arrastaria o CLI sem necessidade.
- **`locked` custa uma query a mais por leitura de jogo.** Ela roda depois da leitura, porque
  precisa dos ids, e fora de transação — então `locked` pode estar milissegundos velho. Aceitável
  enquanto for exibição, porque a autoridade sobre gravar continua sendo o comando de escrita
  (ADR 0004). Se um dia couber tudo numa query só, é `$queryRaw` com dois joins de time e um de
  palpite, e o ganho é pequeno.
- **`authenticate` não virou caso de uso.** A porta das contas é injetada crua, e a regra do
  sentinela e da equivalência dos dois ramos do login segue na borda (ADR 0005). Está escrito na
  ADR 0008 por quê. Se a autenticação ganhar regra de verdade — bloqueio por tentativas, por
  exemplo, que é do Épico 2 —, vale reavaliar.
- **A prova da cerca ainda é manual.** Escrever o import proibido e ver o lint vermelho é um
  procedimento, não um teste. Um caso que rode o ESLint programaticamente sobre um arquivo
  temporário resolveria, e nada hoje impede que alguém relaxe o `regex` sem ninguém notar.
- **`packages/core` continua com domínio e infraestrutura no mesmo pacote.** A separação física
  em `packages/domain` segue recusada pelo mesmo motivo de antes, e vale revisitar quando o core
  ganhar build, no Épico 5 (#29).
- **O `isOwner` de cada membro na listagem é calculado na borda**, comparando com o `ownerId` do
  bolão. É shaping de uma linha, não decisão; se a listagem ganhar mais regra, ela acompanha o
  resto para o domínio.
- **Lacunas na rede de integração**, achadas ao usá-la como rede: não cobrem `GET /pools/:id` no
  caminho feliz, `PATCH` com o nome igual ao atual, nem a paginação de `/pools/:id/members` além
  da primeira página. A refatoração não passou por esses caminhos, mas a próxima pode.

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
