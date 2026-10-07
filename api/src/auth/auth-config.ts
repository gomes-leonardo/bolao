import { DEFAULT_BCRYPT_ROUNDS } from "@bolao/core/auth";

export const AUTH_CONFIG = Symbol("AUTH_CONFIG");

export interface AuthConfig {
  accessSecret: string;
  bcryptRounds: number;
}

export function loadAuthConfig(): AuthConfig {
  const accessSecret = process.env["JWT_ACCESS_SECRET"];
  if (!accessSecret)
    throw new Error("JWT_ACCESS_SECRET não definida. Confere o api/.env.");

  const rawRounds = process.env["BCRYPT_ROUNDS"];
  const bcryptRounds =
    rawRounds === undefined ? DEFAULT_BCRYPT_ROUNDS : Number(rawRounds);
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 4 || bcryptRounds > 31)
    throw new Error(
      "BCRYPT_ROUNDS precisa ser um inteiro entre 4 e 31. Confere o api/.env.",
    );

  return { accessSecret, bcryptRounds };
}
