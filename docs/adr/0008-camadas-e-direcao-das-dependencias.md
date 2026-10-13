# 0008 · Camadas e direção das dependências

**Status:** aceita · 2026-10-12

Estende a [ADR 0001](0001-monorepo-com-core-compartilhado.md).

## Contexto

A regra de negócio e o acesso a dados dividiam o mesmo arquivo. Os services da API recebiam o
Prisma Client no construtor (`@Inject(DB) private readonly db: Db`) e falavam `$queryRaw`
direto, então exercitar uma decisão de negócio exigia subir o Postgres e bater na rota. Dos seis
services, só o de autenticação tinha teste unitário.

Isso não doía na v0.1.0. O que dói é o que vem: os próximos épicos são, quase todos, troca ou
adição de infraestrutura em volta das mesmas regras — Redis no lugar do `SUM` em SQL, o cálculo
de pontos saindo da transação para um consumer, o mesmo consumer virando Lambda. Sem fronteira,
cada um escreve regra nova grudada em infraestrutura nova, e a conta da refatoração cresce a
cada entrega.

O `packages/core` já tinha o começo da separação: `scorePrediction` e `match-status` são regra
pura e testada, o `registerResult` já é um caso de uso compartilhado entre CLI e API, e os
subpaths `./contracts` e `./scoring` existem para o front não carregar o Prisma. Faltava
nomear as camadas e fazer a direção ser verificada em vez de combinada.

## Decisão

### Três camadas

| Camada       | Onde                            | O que pode conhecer                                                     |
| ------------ | ------------------------------- | ----------------------------------------------------------------------- |
| **domain**   | `packages/core/src/domain/**`   | só outras partes do domínio e regra pura (`scoring`). Zero I/O          |
| **adapters** | `packages/core/src/adapters/**` | o domínio e o banco. É quem implementa as portas                        |
| **HTTP**     | `api/src/**`                    | tudo. Nest, DI, e a tradução de erro de domínio para código de resposta |

O domínio guarda regras, erros, **portas** (interfaces de que ele precisa) e casos de uso. A
dependência aponta sempre para dentro: o adapter conhece o domínio, o domínio não conhece o
adapter.

### A direção é verificada por ferramenta

`eslint.config.js` cerca a camada pura — `domain/**`, `scoring/**` e `matches/match-status.ts`,
porque `domain → scoring → qualquer coisa` seria um caminho não vigiado. O que a cerca recusa:

| Proibido                                               | Por quê                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `@nestjs/*`, `@prisma/*`                               | framework e ORM não são assunto do domínio                                    |
| `@bolao/core` e subpaths                               | o pacote pelo próprio nome puxaria o barril inteiro, e com ele o Prisma       |
| `node:*`                                               | "Zero I/O" é promessa desta decisão; sem isto só metade dela seria verificada |
| `../db.ts`, `../../prisma.ts`, `./generated/prisma/**` | o client por caminho relativo                                                 |
| `../../adapters/**`                                    | **o vizinho mais próximo e o atalho mais tentador**                           |
| `../../api/src/**`                                     | a borda                                                                       |

São dois padrões de `no-restricted-imports`, não um, porque o schema da regra é `oneOf` entre
`group` e `regex`, e só o `regex` casa caminho relativo. O `adapters` precisa estar no `regex`
justamente por isso: o adapter importa o `Prisma` como **valor**, então um único
`import … from "../../adapters/…"` arrastaria o client inteiro para dentro do domínio com lint
e typecheck verdes.

Há ainda um `no-restricted-syntax` no mesmo bloco, porque `no-restricted-imports` visita só
`ImportDeclaration` e os `export … from` — não existe handler de `ImportExpression`, então um
`await import("@nestjs/common")` passaria pela cerca inteira. Ele cobre a mesma lista da tabela.

O que a cerca **não** pega: `await import(\`../../prisma.ts\`)`com backtick, porque o nó é`TemplateLiteral`e não`Literal`. Ficou assim de propósito — o modelo de ameaça aqui é o
acidente e o atalho, não a evasão deliberada, e quem escreve backtick num especificador
constante está contornando de propósito.

A prova de que a regra funciona é escrever cada import proibido e ver o lint vermelho com a
mensagem. Foi feito para os oito casos: pacote por nome, client relativo, re-export, adapter
relativo, `node:*` e `import()` dinâmico de framework, client e adapter.

Dentro do core as camadas se importam por **caminho relativo**, nunca por `@bolao/core/...`: o
pacote referenciando a si mesmo pelo nome é o atalho que deixaria o domínio puxar o barril
inteiro, e com ele o Prisma.

### A regra que não cabia numa abstração ingênua

A trava do palpite ([ADR 0004](0004-trava-do-palpite-no-sql.md)) é uma decisão de domínio cuja
implementação é inseparável do banco: checar o horário e gravar têm que ser o mesmo comando.

Uma porta com `findMatch()` e depois `savePrediction()` — o desenho óbvio — reabriria a janela
que o ADR 0004 fechou. A porta `PredictionsGateway` resolve assim:

- **`placeWhileOpen(command)`** grava num comando indivisível e devolve `null` quando nada foi
  gravado, **sem dizer por quê**. O predicado inteiro mora no adapter, num único fragmento
  `Prisma.sql` que as duas queries consomem.
- **`windowOf(matchId)`** só lê. Roda depois de uma gravação que não pegou linha, para escolher
  entre 404 e 409 — o que o `match.count` já fazia antes —, e no muro da galera. **Nunca
  antecede nem autoriza uma gravação.**

A gravação é a autoridade. Se ela não aconteceu, a leitura da janela decide só a mensagem: mesmo
que a janela volte a ler "aberta" no instante seguinte, o resultado é palpite trancado. Isso
está pinado por dois testes, um deles verificando que `windowOf` **não é chamado** quando a
gravação deu certo.

O ganho colateral: o predicado da janela estava escrito duas vezes, na gravação e no muro, e
manter as duas em sincronia era um combinado. Agora é um fragmento só.

### Onde a camada não entra

A camada existe para proteger **regra de negócio**. Código que não decide nada não ganha porta
nem caso de uso, e aplicar as camadas por simetria é cerimônia.

O exemplo escrito é **`GET /health`**: ele faz `SELECT 1` para dizer se o processo alcança o
banco. É um probe de liveness, não tem regra nenhuma, e envolvê-lo numa porta `HealthProbe` com
caso de uso acrescentaria três arquivos e zero garantia. Por isso `health.controller.ts`
continua recebendo o Prisma Client, de propósito.

O critério: se não existe decisão que se possa errar, não existe o que proteger.

## Consequências

- A regra do palpite roda e é testada sem Postgres, sem Nest e sem Prisma. Com o container
  parado, `npm test` passa.
- Trocar o Postgres por outra coisa nesse fluxo passa a ser escrever um adapter, não reescrever
  a regra.
- `api/src/common/domain-errors.ts` é o **único** ponto de tradução de erro de domínio para
  resposta HTTP. A mensagem que o cliente recebe é a de lá; a do erro de domínio serve para log
  e para o CLI, que não tem código de resposta.
- **O contrato HTTP é o mesmo, com uma exceção num ramo de corrida.** Status, código e mensagem
  de todas as respostas do fluxo são caractere a caractere os de antes. A exceção: se a linha do
  jogo desaparecer entre o `matches.byId` e a leitura da janela, o muro agora responde
  404 `MATCH_NOT_FOUND` onde antes respondia 409 `PREDICTIONS_HIDDEN`. Só é alcançável com o
  jogo apagado no meio da requisição, nenhum teste passa por aí, e 404 é a resposta mais
  correta das duas — mas é uma diferença, e está registrada aqui em vez de passar em silêncio.
- O `packages/core` continua com domínio e infraestrutura no mesmo pacote. A separação física
  (`packages/domain`) foi considerada e recusada para o piloto: criaria workspace, symlink e
  tsconfig novos para provar um desenho que ainda não tinha sido provado. Revisitar quando o
  core ganhar build, no épico de containerização.
- `erasableSyntaxOnly` já proibia enum e parameter properties no core, então o domínio não
  consegue usar decorator do Nest nem `constructor(private readonly x)` mesmo que alguém tente.
  Metade da fronteira é garantida pelo compilador, não pelo lint.

### Limites deste piloto

Isto cobriu **um** fluxo vertical, o do palpite e do muro. Fica para as tasks do épico:

- os cinco services restantes — `pools`, `ranking`, `membership`, `matches` e `auth`;
- `me.controller.ts`, que ainda recebe o Prisma Client;
- **`isLocked` em `api/src/matches/match-view.ts`**, que é uma terceira ocorrência da regra da
  janela — em TypeScript e com o relógio da aplicação, usada só para exibir `MatchView.locked`.
  Não foi mexida de propósito: movê-la para o domínio implicaria reimplementar o predicado lá,
  o oposto do que esta decisão pede. Ela é inofensiva enquanto for só exibição; se algum dia
  autorizar algo, passa a ser bug.
- `registerResult` continua recebendo `Db` direto. O épico que tira o cálculo de pontos da
  transação é o dono natural dessa migração.
