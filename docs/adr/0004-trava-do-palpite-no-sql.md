# 0004 · A trava do palpite mora no SQL

**Status:** aceita · 2026-10-03

## Contexto

O palpite só pode ser editado até o apito, e a validação precisa estar no backend. "Checar o horário,
depois gravar" deixa uma janela em que o jogo começa entre as duas operações.

## Decisão

- **Um comando só:**
  `INSERT … SELECT … FROM matches WHERE status = 'scheduled' AND kickoff_at > now() FOR SHARE ON CONFLICT DO UPDATE`.
- **Sem linha afetada:** o jogo não existe (404) ou está trancado (409 `PREDICTION_LOCKED`).
- **Concorrência com o resultado:** o `FOR SHARE` conflita com o lock que o `registerResult` pega ao
  encerrar o jogo.
- **Muro da galera:** revela os palpites com o **mesmo predicado e o mesmo relógio** (o do Postgres), em
  vez do relógio da API.
- **Prova:** um teste de mutação (remover o predicado do horário) deixa a suíte vermelha.

## Consequências

- Não há corrida, e o relógio de referência é um só.
- Jogo adiado fica trancado até a API remarcar a data.
