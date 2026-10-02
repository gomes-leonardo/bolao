import type { ConstraintCase } from "./constraint-cases.ts";

const insert = (values: string) =>
  `INSERT INTO predictions (user_id, match_id, home_score, away_score, updated_at) VALUES ${values}`;

export const predictionCases: ConstraintCase[] = [
  {
    table: "predictions",
    name: "palpite válido é aceito e nasce sem pontos",
    sql: insert(`(1, 1, 2, 1, now())`),
    expect: "ok",
    verify: `SELECT points IS NULL AS ok FROM predictions WHERE user_id = 1 AND match_id = 1`,
  },
  {
    table: "predictions",
    name: "um palpite por usuário por jogo",
    sql: insert(`(1, 1, 1, 0, now()), (1, 1, 2, 2, now())`),
    expect: "unique_violation",
  },
  {
    table: "predictions",
    name: "usuários diferentes palpitam no mesmo jogo",
    sql: insert(`(1, 1, 1, 0, now()), (2, 1, 0, 0, now())`),
    expect: "ok",
  },
  {
    table: "predictions",
    name: "placar negativo é rejeitado",
    sql: insert(`(1, 1, -1, 0, now())`),
    expect: "check_violation",
  },
  {
    table: "predictions",
    name: "placar acima de 99 é rejeitado",
    sql: insert(`(1, 1, 100, 0, now())`),
    expect: "check_violation",
  },
  {
    table: "predictions",
    name: "placar é obrigatório",
    sql: insert(`(1, 1, NULL, 0, now())`),
    expect: "not_null_violation",
  },
  {
    table: "predictions",
    name: "pontos só podem ser 0, 1 ou 3",
    sql: `${insert(`(1, 1, 2, 1, now())`)}; UPDATE predictions SET points = 2 WHERE user_id = 1`,
    expect: "check_violation",
  },
  {
    table: "predictions",
    name: "pontos 3 é aceito",
    sql: `${insert(`(1, 1, 2, 1, now())`)}; UPDATE predictions SET points = 3 WHERE user_id = 1`,
    expect: "ok",
  },
  {
    table: "predictions",
    name: "jogo inexistente é rejeitado",
    sql: insert(`(1, 999, 1, 0, now())`),
    expect: "foreign_key_violation",
  },
  {
    table: "predictions",
    name: "não apaga jogo que tem palpites",
    sql: `${insert(`(1, 1, 1, 0, now())`)}; DELETE FROM matches WHERE id = 1`,
    expect: "restrict_violation",
  },
  {
    table: "predictions",
    name: "apagar o usuário remove os palpites dele",
    sql: `${insert(`(2, 1, 1, 0, now())`)}; DELETE FROM users WHERE id = 2`,
    expect: "ok",
    verify: `SELECT count(*) = 0 AS ok FROM predictions WHERE user_id = 2`,
  },
  {
    table: "predictions",
    name: "existe índice para buscar palpites por jogo",
    sql: `SELECT 1`,
    expect: "ok",
    verify: `SELECT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
      WHERE i.indrelid = 'predictions'::regclass AND a.attname = 'match_id'
    ) AS ok`,
  },
];
