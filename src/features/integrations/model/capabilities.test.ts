import { describe, expect, it } from "vitest";
import { integrationCapabilityGroups, integrationCapabilityInfo, integrationCapabilityLabel } from "@shared/model/integrationCapabilities";

describe("integration capability vocabulary", () => {
  it("humanizes known capability identifiers", () => {
    expect(integrationCapabilityLabel("events.ingress")).toBe("Receive room events");
    expect(integrationCapabilityInfo("commands.invoke").group).toBe("Commands");
  });

  it("keeps unknown capabilities visible without exposing a blank label", () => {
    expect(integrationCapabilityInfo("future.capability")).toMatchObject({ label: "Future Capability" });
  });

  it("groups requested capabilities for management summaries", () => {
    expect(integrationCapabilityGroups(["events.ingress", "secrets.write", "commands.invoke"])).toEqual([
      { group: "Messaging", capabilities: ["events.ingress"] },
      { group: "Secrets", capabilities: ["secrets.write"] },
      { group: "Commands", capabilities: ["commands.invoke"] }
    ]);
  });
});
