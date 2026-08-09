import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RolePermissionEditor } from "./RolePermissionEditor";

describe("RolePermissionEditor", () => {
  it("edits an authoritative action decision within a selected scope", async () => {
    const user = userEvent.setup();
    let rules: any[] = [{ scopeType: "channel", scopeId: "general", allowOperations: [], denyOperations: [] }];
    render(
      <RolePermissionEditor
        actions={[{ name: "messageSend", operationType: "message.send", label: "Send messages" }]}
        scopes={[{ scopeType: "channel", scopeId: "general", label: "# general" }]}
        value={rules}
        onChange={(next) => { rules = next; }}
      />
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Send messages permission" }), "allow");
    expect(rules[0].allowOperations).toEqual(["message.send"]);
    expect(rules[0].denyOperations).toEqual([]);
  });

  it("keeps role-management operations out of custom role editing", () => {
    render(
      <RolePermissionEditor
        actions={[
          { name: "messageSend", operationType: "message.send", label: "Send messages" },
          { name: "roleDefine", operationType: "access.role.define", label: "Define roles" }
        ]}
        scopes={[{ scopeType: "channel", scopeId: "general", label: "# general" }]}
        value={[{ scopeType: "channel", scopeId: "general", allowOperations: [], denyOperations: [] }]}
        onChange={() => undefined}
      />
    );

    expect(screen.getByRole("combobox", { name: "Send messages permission" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Define roles permission" })).not.toBeInTheDocument();
  });
});
