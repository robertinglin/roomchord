import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberAccessInspector } from "./MemberAccessInspector";

describe("MemberAccessInspector", () => {
  it("shows configured grants by scope and identifies Matterhorn as authoritative", () => {
    render(
      <MemberAccessInspector
        memberName="Lee"
        roleIds={["reviewer"]}
        roles={[{
          id: "reviewer",
          name: "Reviewer",
          rules: [{ scopeType: "channel", scopeId: "general", allowOperations: ["message.send"], denyOperations: [] }]
        }] as any}
        scopes={[
          { scopeType: "channel", scopeId: "general", label: "# general" },
          { scopeType: "channel", scopeId: "announcements", label: "# announcements" }
        ] as any}
      />
    );

    expect(screen.getByRole("region", { name: "Effective access for Lee" })).toBeInTheDocument();
    expect(screen.getByText("Reviewer · message.send")).toBeInTheDocument();
    expect(screen.getByText("No configured role grant")).toBeInTheDocument();
    expect(screen.getByText(/Matterhorn remains the source of truth/)).toBeInTheDocument();
  });
});
