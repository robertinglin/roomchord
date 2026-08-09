import type { MatterhornManagementRole, MatterhornManagementScope, MatterhornRoleRule } from "matterhorn-sdk/browser";

export type ConfiguredMemberAccess = {
  scope: MatterhornManagementScope;
  grants: Array<{ roleName: string; operations: string[] }>;
};

function matches(rule: MatterhornRoleRule, scope: MatterhornManagementScope) {
  return (rule.scopeType === scope.scopeType || rule.scopeType === "*")
    && (rule.scopeId === scope.scopeId || rule.scopeId === "*");
}

export function configuredMemberAccess(
  roleIds: readonly string[],
  roles: readonly MatterhornManagementRole[],
  scopes: readonly MatterhornManagementScope[]
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
