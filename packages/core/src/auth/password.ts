import { compare, hash } from "bcrypt";

export const DEFAULT_BCRYPT_ROUNDS = 12;

export function hashPassword(
  password: string,
  rounds: number,
): Promise<string> {
  return hash(password, rounds);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}
