import { describe, it, expect } from "vitest";
import { canTransition } from "../lib/execution-state.js";

describe("execution state transitions", () => {
  it("rejects invalid transitions", () => {
    expect(canTransition("SUCCEEDED", "RUNNING")).toBe(false);
    expect(canTransition("QUEUED", "SUCCEEDED")).toBe(false);
    expect(canTransition("RUNNING", "QUEUED")).toBe(false);
  });

  it("allows valid transitions", () => {
    expect(canTransition("QUEUED", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "UNKNOWN")).toBe(true);
    expect(canTransition("FAILED", "RETRYING")).toBe(true);
    expect(canTransition("RETRYING", "QUEUED")).toBe(true);
  });
});
