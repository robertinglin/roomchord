import React, { useMemo } from "react";
import type { ManagementRole, ManagementScope } from "matterhorn-sdk/browser";
import { configuredMemberAccess } from "@features/management/model/memberAccess";
import { panel, row, layout, misc } from "@shared/ui/manage.styles";
import * as stylex from "@stylexjs/stylex";

export function MemberAccessInspector({
  memberName,
  roleIds,
  roles,
  scopes
}: {
  memberName: string;
  roleIds: string[];
  roles: ManagementRole[];
  scopes: ManagementScope[];
}) {
  const entries = useMemo(() => configuredMemberAccess(roleIds, roles, scopes), [roleIds, roles, scopes]);
  if (!roles.length || !scopes.length) return null;
  return (
    <section {...stylex.props(panel.panel)} aria-label={`Effective access for ${memberName}`}>
      <header {...stylex.props(panel.head)}>
        <h3 {...stylex.props(panel.h3)}>Access inspector</h3>
      </header>
      <div {...stylex.props(panel.body)}>
        <p {...stylex.props(misc.hint)}>Configured role grants are shown below. Matterhorn remains the source of truth for effective access, overrides, and precedence.</p>
        <div {...stylex.props(layout.rowStack)}>
          {entries.map((entry) => (
            <div {...stylex.props(row.row)} key={`${entry.scope.scopeType}:${entry.scope.scopeId}`}>
              <span {...stylex.props(row.rowMain)}>
                <span {...stylex.props(row.rowTitle)}>{entry.scope.label}</span>
                <span {...stylex.props(row.rowSub)}>{entry.grants.length ? entry.grants.map((grant) => `${grant.roleName}${grant.operations.length ? ` · ${grant.operations.join(", ")}` : " · scope rule present"}`).join("; ") : "No configured role grant"}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
