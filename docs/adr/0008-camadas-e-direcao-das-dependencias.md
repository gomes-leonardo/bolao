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

## Emenda · fechamento do épico, 2026-10-13

Os limites acima foram resolvidos, menos o último. O que esta emenda acrescenta são as duas
coisas que **não** eram simples aplicação da decisão original.

### A regra que estava dentro do SQL de leitura

O `RankingService` somava, ordenava, desempatava e atribuía posição num `RANK() OVER` dentro de
`$queryRaw`. É o mesmo tipo de nó que a trava do palpite, mas resolvido do lado contrário: ali a
regra era inseparável do comando de escrita e ficou no adapter; aqui ela é separável, e a linha
passa entre agregação e ordenação.

A porta `RankingGateway` devolve **talha** — soma e cravadas por membro, sem ordem e sem posição.
`SUM` e `COUNT` são acesso a dado; _o que ganha de quê e como empate vira posição_ é regra, e
mora em `rankStandings`.

O que a forma da porta já revela do Épico 2, antes de ele começar: `talliesOf` recebe `round?`,
e um sorted set por `(bolão, temporada)` não filtra por rodada — vai precisar de chave por
rodada ou de cair para SQL. E tem que guardar `exactHits` também, porque o desempate depende
dele.

**Nota de comportamento:** o desempate por nome saiu da collation do Postgres e passou para
`localeCompare(nome, "pt-BR")`, e a diferença é maior do que parece. O banco ordena por **byte** —
`datlocprovider = c`, conferido no container, apesar de o `datcollate` dizer `en_US.utf8` —, onde
toda maiúscula vem antes de toda minúscula e o acento vai para o fim:

```
Postgres:  Alves, Ana, Bruno, Joao, João, Zeca, ada, ana, Ávila
pt-BR:     ada, Alves, ana, Ana, Ávila, Bruno, Joao, João, Zeca
```

O que muda é **caixa antes de acento**, não só acento. `["Bruno", "ana"]` inverte, e é ASCII puro:
num produto em que a pessoa digita o próprio nome como quiser, nome em minúscula é mais comum que
nome acentuado. A ordem em pt-BR é a correta para o produto, e a mudança afeta só a exibição
**dentro** de uma posição já empatada — o nome nunca decidiu a posição de ninguém, nem antes nem
agora.

Dois casos em `rank-standings.spec.ts` prendem a escolha, um de caixa e um de acento, e os dois
ficam vermelhos sob uma comparação de byte. Sem eles a decisão seria comentário: todos os outros
nomes dos testes são ASCII capitalizado com inicial distinta, e ordenam igual nos dois esquemas.

O que **não** acompanhou: `wallEntriesOf` ordena os membros do muro com `ORDER BY` do Postgres, na
collation de byte. O produto tem duas ordens de nome, então a frase "pt-BR é a ordem correta" vale
hoje pela metade. Está registrado na dívida técnica.

### O `isLocked` resolveu-se pelo caminho oposto ao previsto

O limite acima dizia que mover a regra da janela para o domínio implicaria reimplementar o
predicado lá. Está certo, e é por isso que ela **não** foi movida: `locked` passou a **vir do
adapter**, avaliado pelo mesmo fragmento `Prisma.sql` da gravação e com o relógio do Postgres.
"Usar a regra de domínio" aqui significa ler o único predicado que existe, não reescrevê-lo.

O predicado estava em quatro lugares, não três: a gravação, o `windowOf`, o `isLocked` e o
`match.count` de palpites pendentes do `matches.service.ts` — os dois últimos em TypeScript e
com o relógio da aplicação. Agora existe em um, e quatro operações o consomem.

Custa uma query de flags por leitura de jogo, feita **depois** da leitura porque precisa dos ids.
Fora de transação, então `locked` pode estar milissegundos velho. É aceitável porque `locked` é
exibição e a autoridade continua sendo a gravação (ADR 0004), e porque a alternativa — reescrever
a leitura do jogo inteira em `$queryRaw` para caber numa query só — é um risco maior do que o
problema. Flag ausente vira trancado: falhar fechado.

### A cerca ganhou uma linha

O `regex` passou a incluir `(^|/)contracts(/|$)`. O nome `@bolao/core/contracts` já caía no
`group`, mas `../../contracts/responses.ts` por caminho relativo passava. Sem essa linha, "o
domínio define os próprios tipos, não os de fio" seria combinado e não garantia.

Os tipos novos do domínio existem por **duas** razões diferentes, e confundi-las apaga o
aprendizado:

- **Duplicata deliberada**, campo a campo igual ao tipo de fio: `Standing` ≡ `RankingEntry`,
  `PoolOverview` ≡ `PoolSummary`, `WallRow` ≡ `WallEntry`. A borda devolve direto, sem conversão
  nenhuma, e o typecheck quebra **lá** se o contrato mudar — que é onde a decisão de contrato
  pertence. A duplicata custa nada e compra a independência.
- **Representação de domínio que genuinamente difere do fio**: `MatchRow` tem `kickoffAt: Date`
  contra `string`, e `homeScore`/`awayScore` separados contra `score: { home, away } | null`.
  Aqui `toMatchView` faz conversão de verdade, e o tipo separado não é cerimônia: `Date` é o que o
  banco devolve, ISO-8601 é o que o JSON pede, e quem decide isso é a borda.

### Onde a camada continuou não entrando

Além do `GET /health`, dois casos novos:

- **a porta das contas é injetada crua**, sem caso de uso em cima. A regra da autenticação é
  costura de borda ([ADR 0005](0005-costura-de-autenticacao.md)) — o hash do sentinela e a
  equivalência dos dois ramos do login —, e trazê-la para o domínio exigiria uma porta de
  hashing para nada. A porta existe para o `auth.service.ts` parar de conhecer o Prisma;
- **`summarizePool` é função pura, sem porta.** Porta existe para o I/O de que uma regra
  precisa, e esta recebe o resultado do I/O que a borda já fez. O fan-out das três leituras e a
  deduplicação por temporada ficam na borda, porque otimização de N+1 não é decisão que se possa
  errar.

O inverso também apareceu: onde a porta é injetada, ela entra **amarrada em casos de uso**, não
crua, sempre que um método dela devolve resultado em vez de lançar. `findVisiblePool` devolvendo
`null` sem ninguém lançar é um bypass silencioso de autorização; `firstUnfinishedRound` sem o
fallback muda a rodada exibida; `createWithInviteCode` sem a política perde o retry. É o mesmo
argumento que tirou o `windowOf` do alcance da borda.

### Consequências do fechamento

- Com o Postgres parado, `npm test` passa com **198 testes**. Eram 155, e o domínio cobria só o
  fluxo do palpite. Agora cobre também autorização de membro e dono, ordenação e empate da
  classificação, composição do resumo do bolão e colisão de código de convite.
- Os sete `*.integration.spec.ts` da API passam **sem uma asserção alterada**. Foram a rede desta
  refatoração inteira, e o `ranking.integration.spec.ts` é o que prova, contra o banco de
  verdade, que `rankStandings` reproduz o `RANK()`.
- `@Inject(DB)` existe em dois lugares: `health.controller.ts`, isento pelo critério acima, e
  `db.module.ts`, que é o provedor do token.
- O contrato HTTP não mudou. As nove mensagens de erro que saíram dos services para
  `domain-errors.ts` foram conferidas uma a uma contra o `origin/main` — nenhum teste pega uma
  troca de frase, porque os de integração afirmam `error.code`.
- O `packages/core` continua com domínio e infraestrutura no mesmo pacote, pelo mesmo motivo de
  antes. Revisitar quando o core ganhar build.
