import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PresencePanel } from "./PresencePanel";

describe("PresencePanel bot presentation", () => {
  it("renders a badge only for authoritative bot members", () => {
    render(<PresencePanel
      actor={{ memberId: "self", role: "member", name: "Self" } as never}
      roomMembers={{
        helper: { memberId: "helper", displayName: "Guest 123", serviceDisplayName: "Helper", kind: "bot", status: "online" },
        spoof: { memberId: "spoof", displayName: "Weather BOT", serviceId: "fake", status: "online" }
      } as never}
      presence={{ helper: { memberId: "helper", displayName: "Guest 999", status: "online" } } as never}
      embeds={[]}
      threads={[]}
      rooms={[]}
      screenShares={[]}
      voiceTokens={[]}
      canManageRoles={false}
      onMention={vi.fn()}
      onOpenMemberProfile={vi.fn()}
      onSetMemberBlock={vi.fn()}
      onSetMemberIgnore={vi.fn()}
      onSetMemberRoles={vi.fn()}
    />);
    expect(screen.getAllByLabelText("Bot account")).toHaveLength(1);
    expect(screen.getByText("Helper")).toBeInTheDocument();
    expect(screen.queryByText("Guest 999")).not.toBeInTheDocument();
  });
});
