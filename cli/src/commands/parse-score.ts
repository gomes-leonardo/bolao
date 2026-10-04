import type { Score } from "@bolao/core";
import { InvalidArgumentError } from "commander";

const SCORE_PATTERN = /^(\d{1,2})[-x](\d{1,2})$/;

export function parseScore(input: string): Score {
  const match = SCORE_PATTERN.exec(input.trim());
  if (!match) {
    throw new InvalidArgumentError(
      `Placar inválido: "${input}". Use o formato 2-1.`,
    );
  }
  return { home: Number(match[1]), away: Number(match[2]) };
}

export function parsePositiveInt(input: string): number {
  const value = Number(input);
  if (!Number.isInteger(value) || value < 1) {
    throw new InvalidArgumentError(
      `"${input}" precisa ser um número inteiro positivo.`,
    );
  }
  return value;
}
