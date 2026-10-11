import type { ManagementAction, ManagementScope, RoleRule } from "matterhorn-sdk/browser";

export type PermissionDecision = "inherit" | "allow" | "deny";

export function isRoleManagementOperation(operationType: string): boolean {
  return operationType.startsWith("access.role.") || operationType.startsWith("scope.member.");
}

export function cloneRoleRules(rules: readonly RoleRule[] | undefined): RoleRule[] {
  return (rules || []).map((rule) => ({
    scopeType: rule.scopeType,
    scopeId: rule.scopeId,
    allowOperations: [...rule.allowOperations],
    denyOperations: [...rule.denyOperations]
  }));
}

export function permissionDecision(rule: RoleRule | undefined, operationType: string): PermissionDecision {
  if (rule?.allowOperations.includes(operationType)) return "allow";
  if (rule?.denyOperations.includes(operationType)) return "deny";
  return "inherit";
}

export function setPermissionDecision(
  rules: readonly RoleRule[],
  scope: Pick<ManagementScope, "scopeType" | "scopeId">,
  operationType: string,
  decision: PermissionDecision
): RoleRule[] {
  const next = cloneRoleRules(rules);
  let rule = next.find((item) => item.scopeType === scope.scopeType && item.scopeId === scope.scopeId);
  if (!rule) {
    rule = { scopeType: scope.scopeType, scopeId: scope.scopeId, allowOperations: [], denyOperations: [] };
    next.push(rule);
  }
  rule.allowOperations = rule.allowOperations.filter((item) => item !== operationType);
  rule.denyOperations = rule.denyOperations.filter((item) => item !== operationType);
  if (decision === "allow") rule.allowOperations.push(operationType);
  if (decision === "deny") rule.denyOperations.push(operationType);
  return next;
}

export function removeRoleScope(rules: readonly RoleRule[], scope: Pick<ManagementScope, "scopeType" | "scopeId">): RoleRule[] {
  return cloneRoleRules(rules).filter((rule) => rule.scopeType !== scope.scopeType || rule.scopeId !== scope.scopeId);
}

export function actionLabel(action: ManagementAction): string {
  return action.label || action.operationType.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ");
}

export function roleScopeRules(role: { rules?: readonly RoleRule[] } | undefined): RoleRule[] {
  return cloneRoleRules(role?.rules);
}
