import { randomInt } from "node:crypto";

// Sem 0/O e 1/I/L: o código é digitado a partir de uma mensagem no WhatsApp.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

export function generateInviteCode(
  random: (max: number) => number = randomInt,
): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[random(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}
