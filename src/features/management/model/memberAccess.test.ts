import { describe, expect, it } from "vitest";
import { configuredMemberAccess } from "@features/management/model/memberAccess";

describe("configured member access", () => {
  it("projects matching role grants without claiming to replace authority resolution", () => {
    const result = configuredMemberAccess(
      ["reviewer"],
      [{ id: "reviewer", name: "Reviewer", rules: [{ scopeType: "channel", scopeId: "*", level: "editor", allowOperations: ["message.send"], denyOperations: [] }] }],
      [{ scopeType: "channel", scopeId: "general", label: "# general" }, { scopeType: "event", scopeId: "launch", label: "Launch" }]
    );
    expect(result[0].grants).toEqual([{ roleName: "Reviewer", operations: ["message.send"] }]);
    expect(result[1].grants).toEqual([]);
  });
});
