import { describe, it, expect } from "vitest";
import { backoffMs, shouldAutoRetry } from "../lib/retry.js";

describe("retry policy", () => {
  it("uses exponential backoff steps", () => {
    expect(backoffMs(1)).toBe(10_000);
    expect(backoffMs(2)).toBe(30_000);
    expect(backoffMs(3)).toBe(90_000);
  });

  it("retries transient 500 until max attempts", () => {
    const d1 = shouldAutoRetry("failed", "LOW", "GET", 500, 1, 3);
    expect(d1.retry).toBe(true);
    const d3 = shouldAutoRetry("failed", "LOW", "GET", 500, 3, 3);
    expect(d3.retry).toBe(false);
  });

  it("does not retry permanent 400", () => {
    const d = shouldAutoRetry("failed", "LOW", "GET", 400, 1, 3);
    expect(d.retry).toBe(false);
  });
});
