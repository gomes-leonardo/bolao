import { describe, expect, it } from "vitest";
import { toMatchStatus } from "./status.ts";

describe("toMatchStatus", () => {
  it.each([
    ["SCHEDULED", "scheduled"],
    ["TIMED", "scheduled"],
    ["IN_PLAY", "live"],
    ["PAUSED", "live"],
    ["SUSPENDED", "live"],
    ["FINISHED", "finished"],
    ["AWARDED", "finished"],
    ["POSTPONED", "postponed"],
    ["CANCELLED", "cancelled"],
  ] as const)("%s vira %s", (apiStatus, status) => {
    expect(toMatchStatus(apiStatus)).toBe(status);
  });
});
