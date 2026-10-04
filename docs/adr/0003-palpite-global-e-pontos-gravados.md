# 0003 · Palpite global por jogo e pontos gravados no palpite

**Status:** aceita · 2026-10-02

## Contexto

Um usuário pode estar em vários bolões. Era preciso decidir se o palpite vale para um bolão só ou
para todos, e se os pontos são calculados na leitura ou gravados.

## Decisão

- **Palpite global:** um palpite por usuário por jogo (`UNIQUE(user_id, match_id)`), que conta em todos
  os bolões dele.
- **Pontos gravados:** `predictions.points` fica `NULL` até o jogo acabar. O `registerResult` calcula os
  pontos em TypeScript (`scorePrediction`, testável e compartilhado) e grava. O ranking é um `SUM` em SQL.
- **Correções:** corrigir um placar recalcula tudo. Se o jogo deixa de estar encerrado, os pontos
  voltam a `NULL`.

## Consequências

- O ranking é barato e o cálculo fica isolado, que é o ponto de troca quando o Redis entrar.
- Quem entra num bolão no meio do campeonato já chega com os pontos das rodadas anteriores.
- Os pontos são dado derivado, e a consistência depende de todo caminho que altera resultado passar
  pelo `registerResult` (hoje: o CLI).
