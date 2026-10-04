import { InvalidArgumentError } from "commander";
import { describe, expect, it } from "vitest";
import { parseScore } from "./parse-score.ts";

describe("parseScore", () => {
  it.each([
    ["2-1", { home: 2, away: 1 }],
    ["0-0", { home: 0, away: 0 }],
    ["10-0", { home: 10, away: 0 }],
    ["3x2", { home: 3, away: 2 }],
  ])("lê %s", (input, score) => {
    expect(parseScore(input)).toEqual(score);
  });

  it.each(["2", "2-", "-1", "a-b", "2-1-0", "-1-2", "100-0"])(
    "rejeita %s",
    (input) => {
      expect(() => parseScore(input)).toThrow(InvalidArgumentError);
    },
  );
});
