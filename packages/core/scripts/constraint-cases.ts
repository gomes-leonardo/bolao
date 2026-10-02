export type Expectation =
  | "ok"
  | "unique_violation"
  | "check_violation"
  | "foreign_key_violation"
  | "restrict_violation"
  | "not_null_violation";

export interface ConstraintCase {
  table: string;
  name: string;
  sql: string;
  expect: Expectation;
  constraint?: string;
  verify?: string;
}

export const fixtures = `
  INSERT INTO users (id, name, email, password_hash, updated_at) VALUES
    (1, 'Ana', 'ana@bolao.dev', 'hash', now()),
    (2, 'Beto', 'beto@bolao.dev', 'hash', now());

  INSERT INTO teams (id, external_id, name, short_name, tla) VALUES
    (1, 100, 'Clube Alfa', 'Alfa', 'ALF'),
    (2, 101, 'Clube Beta', 'Beta', 'BET');

  INSERT INTO matches (id, external_id, season, round, home_team_id, away_team_id, kickoff_at, updated_at) VALUES
    (1, 500, 2026, 1, 1, 2, now() + interval '1 day', now());

  INSERT INTO pools (id, name, invite_code, owner_id, season, updated_at) VALUES
    (1, 'Resenha', 'ABCD1234', 1, 2026, now());

  INSERT INTO pool_members (pool_id, user_id) VALUES (1, 1);

  -- ids explícitos não avançam a sequence; sem isso o próximo INSERT colide na PK
  SELECT setval(pg_get_serial_sequence(t, 'id'), 1000)
  FROM unnest(ARRAY['users', 'teams', 'matches', 'pools']) AS t;
`;

export const cases: ConstraintCase[] = [
  {
    table: "users",
    name: "e-mail é único sem diferenciar maiúsculas",
    sql: `INSERT INTO users (name, email, password_hash, updated_at) VALUES ('Outra', 'ANA@Bolao.dev', 'hash', now())`,
    expect: "unique_violation",
    constraint: "users_email_key",
  },
  {
    table: "users",
    name: "nome em branco é rejeitado",
    sql: `INSERT INTO users (name, email, password_hash, updated_at) VALUES ('   ', 'c@bolao.dev', 'hash', now())`,
    expect: "check_violation",
    constraint: "users_name_not_blank",
  },
  {
    table: "users",
    name: "e-mail sem @ é rejeitado",
    sql: `INSERT INTO users (name, email, password_hash, updated_at) VALUES ('Caio', 'caio.bolao.dev', 'hash', now())`,
    expect: "check_violation",
    constraint: "users_email_has_at",
  },
  {
    table: "teams",
    name: "tla precisa ser 3 caracteres maiúsculos",
    sql: `INSERT INTO teams (external_id, name, short_name, tla) VALUES (102, 'Clube Gama', 'Gama', 'gam')`,
    expect: "check_violation",
    constraint: "teams_tla_format",
  },
  {
    table: "teams",
    name: "não apaga time que tem jogos",
    sql: `DELETE FROM teams WHERE id = 1`,
    expect: "restrict_violation",
    constraint: "matches_home_team_id_fkey",
  },
  {
    table: "matches",
    name: "time não joga contra si mesmo",
    sql: `INSERT INTO matches (external_id, season, round, home_team_id, away_team_id, kickoff_at, updated_at) VALUES (501, 2026, 1, 1, 1, now(), now())`,
    expect: "check_violation",
    constraint: "matches_teams_differ",
  },
  {
    table: "matches",
    name: "rodada fora de 1..38 é rejeitada",
    sql: `INSERT INTO matches (external_id, season, round, home_team_id, away_team_id, kickoff_at, updated_at) VALUES (501, 2026, 39, 1, 2, now(), now())`,
    expect: "check_violation",
    constraint: "matches_round_range",
  },
  {
    table: "matches",
    name: "status desconhecido é rejeitado",
    sql: `UPDATE matches SET status = 'paused' WHERE id = 1`,
    expect: "check_violation",
    constraint: "matches_status_valid",
  },
  {
    table: "matches",
    name: "placar só com um lado preenchido é rejeitado",
    sql: `UPDATE matches SET home_score = 1 WHERE id = 1`,
    expect: "check_violation",
    constraint: "matches_scores_paired",
  },
  {
    table: "matches",
    name: "placar negativo é rejeitado",
    sql: `UPDATE matches SET home_score = -1, away_score = 0 WHERE id = 1`,
    expect: "check_violation",
    constraint: "matches_scores_non_negative",
  },
  {
    table: "matches",
    name: "jogo encerrado exige placar",
    sql: `UPDATE matches SET status = 'finished' WHERE id = 1`,
    expect: "check_violation",
    constraint: "matches_finished_has_score",
  },
  {
    table: "matches",
    name: "jogo encerrado com placar é aceito",
    sql: `UPDATE matches SET status = 'finished', home_score = 2, away_score = 0 WHERE id = 1`,
    expect: "ok",
  },
  {
    table: "matches",
    name: "time inexistente é rejeitado",
    sql: `INSERT INTO matches (external_id, season, round, home_team_id, away_team_id, kickoff_at, updated_at) VALUES (501, 2026, 1, 1, 999, now(), now())`,
    expect: "foreign_key_violation",
    constraint: "matches_away_team_id_fkey",
  },
  {
    table: "pools",
    name: "código de convite fora do formato é rejeitado",
    sql: `INSERT INTO pools (name, invite_code, owner_id, season, updated_at) VALUES ('Firma', 'abc', 1, 2026, now())`,
    expect: "check_violation",
    constraint: "pools_invite_code_format",
  },
  {
    table: "pools",
    name: "código de convite é único",
    sql: `INSERT INTO pools (name, invite_code, owner_id, season, updated_at) VALUES ('Firma', 'ABCD1234', 2, 2026, now())`,
    expect: "unique_violation",
    constraint: "pools_invite_code_key",
  },
  {
    table: "pools",
    name: "não apaga usuário que é dono de bolão",
    sql: `DELETE FROM users WHERE id = 1`,
    expect: "restrict_violation",
    constraint: "pools_owner_id_fkey",
  },
  {
    table: "pool_members",
    name: "usuário não entra duas vezes no mesmo bolão",
    sql: `INSERT INTO pool_members (pool_id, user_id) VALUES (1, 1)`,
    expect: "unique_violation",
    constraint: "pool_members_pkey",
  },
  {
    table: "pool_members",
    name: "apagar o bolão remove os membros",
    sql: `DELETE FROM pools WHERE id = 1`,
    expect: "ok",
    verify: `SELECT count(*) = 0 AS ok FROM pool_members WHERE pool_id = 1`,
  },
];
