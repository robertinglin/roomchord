import type { ManagementRole, ManagementScope, RoleRule } from "matterhorn-sdk/browser";

export type ConfiguredMemberAccess = {
  scope: ManagementScope;
  grants: Array<{ roleName: string; operations: string[] }>;
};

function matches(rule: RoleRule, scope: ManagementScope) {
  return (rule.scopeType === scope.scopeType || rule.scopeType === "*")
    && (rule.scopeId === scope.scopeId || rule.scopeId === "*");
}

export function configuredMemberAccess(
  roleIds: readonly string[],
  roles: readonly ManagementRole[],
  scopes: readonly ManagementScope[]
): ConfiguredMemberAccess[] {
  const assigned = roles.filter((role) => roleIds.includes(role.id));
  return scopes.map((scope) => ({
    scope,
    grants: assigned.flatMap((role) => role.rules.filter((rule) => matches(rule, scope)).map((rule) => ({
      roleName: role.name,
      operations: [...new Set([...rule.allowOperations, ...rule.denyOperations])]
    })))
  }));
}
