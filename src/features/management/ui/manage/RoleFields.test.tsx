import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RoleAccessEditor } from "./RoleFields";

describe("RoleAccessEditor", () => {
  it("keeps legacy role access visible but read-only while scoped catalog editing is available", async () => {
    const user = userEvent.setup();
    let rules: any[] = [{ scopeType: "channel", scopeId: "voice", allowOperations: [], denyOperations: [] }];
    render(
      <RoleAccessEditor
        roles={[{ id: "member", name: "Member", systemRole: true, rank: 1, archivedAt: null }] as any}
        value={{ member: "editor" }}
        onChange={() => undefined}
        permissionActions={[{ name: "mediaRoomJoin", operationType: "media.room.join", label: "Join media room" }]}
        permissionScopes={[{ scopeType: "channel", scopeId: "voice", label: "Voice" }]}
        scopedRulesByRole={{ member: rules }}
        scopedPermissionScope={{ scopeType: "channel", scopeId: "voice", label: "Voice" }}
        onScopedRulesChange={(_roleId, next) => { rules = next; }}
      />
    );

    expect(screen.getByRole("combobox", { name: "Member voice channel access" })).toBeDisabled();
    await user.click(screen.getByText("Member scoped permissions"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Join media room permission" }), "allow");
    expect(rules[0].allowOperations).toEqual(["media.room.join"]);
  });
});
