# 0006 · Polling em vez de tempo real

**Status:** aceita · 2026-10-03

## Contexto

O design mostra placar ao vivo e o muro da galera mudando durante o jogo. WebSocket e SSE estão fora do
escopo desta etapa do roadmap, e o placar só muda quando o CLI sincroniza com a football-data.

## Decisão

- Enquanto houver jogo `live`, o front busca a rodada e o muro de novo a cada 30 s (`refetchInterval`
  do TanStack Query).
- "AO VIVO" aparece **sem o minuto do jogo**.
- A football-data é a fonte da verdade. O `result` manual do CLI é o plano B quando ela está fora.

## Consequências

- É simples e não precisa de infraestrutura nova.
- A latência é de até 30 s mais o intervalo do CLI, e há requisições mesmo quando nada mudou.
- Quando o roadmap chegar em tempo real, a troca fica nos hooks `useRound` e `useWall`.
