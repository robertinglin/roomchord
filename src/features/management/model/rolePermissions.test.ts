import { describe, expect, it } from "vitest";
import { cloneRoleRules, permissionDecision, removeRoleScope, setPermissionDecision } from "@features/management/model/rolePermissions";

const scope = { scopeType: "channel", scopeId: "general", label: "# general" };

describe("role permission rules", () => {
  it("starts new roles with no effective permissions", () => {
    expect(cloneRoleRules(undefined)).toEqual([]);
    expect(permissionDecision(undefined, "message.send")).toBe("inherit");
  });

  it("sets one explicit decision without retaining an opposite decision", () => {
    const allowed = setPermissionDecision([], scope, "message.send", "allow");
    expect(allowed).toEqual([{ scopeType: "channel", scopeId: "general", allowOperations: ["message.send"], denyOperations: [] }]);
    const denied = setPermissionDecision(allowed, scope, "message.send", "deny");
    expect(permissionDecision(denied[0], "message.send")).toBe("deny");
    expect(denied[0].allowOperations).toEqual([]);
    expect(denied[0].denyOperations).toEqual(["message.send"]);
  });

  it("removes a scope without mutating the draft", () => {
    const rules = setPermissionDecision([], scope, "message.send", "allow");
    const next = removeRoleScope(rules, scope);
    expect(next).toEqual([]);
    expect(rules).not.toBe(next);
    expect(rules[0].allowOperations).toEqual(["message.send"]);
  });
});
