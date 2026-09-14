import { describe, it, expect } from "vitest";
import { classifyNetworkError, shouldAutoRetry } from "../lib/retry.js";

describe("unknown outcome", () => {
  it("HIGH risk POST timeout is unknown with blocked retry", () => {
    expect(classifyNetworkError("HIGH", "POST", true)).toBe("unknown");
    const decision = shouldAutoRetry("unknown", "HIGH", "POST", null, 1, 3);
    expect(decision.retry).toBe(false);
    expect(decision.decision).toBe("BLOCKED");
  });

  it("LOW risk GET timeout is failed and may retry", () => {
    expect(classifyNetworkError("LOW", "GET", true)).toBe("failed");
    const decision = shouldAutoRetry("failed", "LOW", "GET", null, 1, 3);
    expect(decision.retry).toBe(true);
  });
});
