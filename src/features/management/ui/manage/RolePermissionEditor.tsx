import React, { useMemo, useState } from "react";
import type { ManagementAction, ManagementScope, RoleRule } from "matterhorn-sdk/browser";
import { actionLabel, isRoleManagementOperation, permissionDecision, removeRoleScope, setPermissionDecision, type PermissionDecision } from "@features/management/model/rolePermissions";
import { button, field, layout, misc, panel } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

export function RolePermissionEditor({
  actions,
  scopes,
  value,
  onChange
}: {
  actions: ManagementAction[];
  scopes: ManagementScope[];
  value: RoleRule[];
  onChange: (rules: RoleRule[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visibleActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return actions.filter((action) => !isRoleManagementOperation(action.operationType) && (!normalized || `${actionLabel(action)} ${action.operationType}`.toLowerCase().includes(normalized)));
  }, [actions, query]);

  function change(scope: ManagementScope, action: ManagementAction, decision: PermissionDecision) {
    onChange(setPermissionDecision(value, scope, action.operationType, decision));
  }

  if (!actions.length || !scopes.length) {
    return <p {...stylex.props(misc.hint)}>Permission catalog unavailable. Reload the room before editing scoped access.</p>;
  }

  return (
    <section {...stylex.props(panel.panel)} aria-label="Scoped role permissions">
      <header {...stylex.props(panel.head)}><h4 {...stylex.props(panel.h3)}>Scoped permissions</h4></header>
      <div {...stylex.props(panel.body)}>
        <label {...stylex.props(field.field)}>
          <span {...stylex.props(field.label)}>Filter actions</span>
          <input aria-label="Filter permissions" value={query} onChange={(event) => setQuery(event.target.value)} {...stylex.props(field.input)} />
        </label>
        <div {...stylex.props(layout.rowStack)}>
          {value.map((rule, index) => {
            const scope = scopes.find((item) => item.scopeType === rule.scopeType && item.scopeId === rule.scopeId);
            const resolvedScope = scope || { scopeType: rule.scopeType, scopeId: rule.scopeId, label: `${rule.scopeType}: ${rule.scopeId}` };
            return (
              <div {...stylex.props(panel.panel)} key={`${rule.scopeType}:${rule.scopeId}`}>
                <div {...stylex.props(button.actions)}>
                  <label {...stylex.props(field.field)}>
                    <span {...stylex.props(field.label)}>Scope {index + 1}</span>
                    <select aria-label={`Scope ${index + 1}`} value={`${resolvedScope.scopeType}\u0000${resolvedScope.scopeId}`} onChange={(event) => {
                      const [scopeType, scopeId] = event.target.value.split("\u0000");
                      const next = value.filter((_item, itemIndex) => itemIndex !== index);
                      onChange([...next, { scopeType, scopeId, allowOperations: [...rule.allowOperations], denyOperations: [...rule.denyOperations] }]);
                    }} {...stylex.props(field.select)}>
                      {scopes.map((item) => <option key={`${item.scopeType}:${item.scopeId}`} value={`${item.scopeType}\u0000${item.scopeId}`}>{item.label}</option>)}
                    </select>
                  </label>
                  {value.length > 1 ? <button type="button" onClick={() => onChange(removeRoleScope(value, resolvedScope))} {...stylex.props(button.btn, button.danger, button.sm)}>Remove scope</button> : null}
                </div>
                <div {...stylex.props(layout.rowStack)}>
                  {visibleActions.map((action) => {
                    const selected = permissionDecision(rule, action.operationType);
                    return (
                      <div {...stylex.props(button.actions)} key={action.operationType}>
                        <span>{actionLabel(action)}</span>
                        <select aria-label={`${actionLabel(action)} permission`} value={selected} onChange={(event) => change(resolvedScope, action, event.target.value as PermissionDecision)} {...stylex.props(field.select)}>
                          <option value="inherit">Inherit</option>
                          <option value="allow">Allow</option>
                          <option value="deny">Deny</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div {...stylex.props(button.actions, button.actionsEnd)}>
          <button type="button" onClick={() => onChange([...value, { scopeType: scopes[0].scopeType, scopeId: scopes[0].scopeId, allowOperations: [], denyOperations: [] }])} {...stylex.props(button.btn, button.ghost, button.sm)}>Add scope</button>
        </div>
      </div>
    </section>
  );
}
