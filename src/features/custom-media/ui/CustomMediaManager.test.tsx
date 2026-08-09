import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomMediaManager } from "@features/custom-media/ui/CustomMediaManager";

describe("CustomMediaManager", () => {
  it("exposes a compact room media control for the message composer", () => {
    render(<CustomMediaManager client={{ capabilities: () => ({ encryptedFiles: false, driveAssets: false, providerSearch: false, providerUpload: false }) } as never} scopeType="channel" scopeId="general" />);
    expect(screen.getByRole("button", { name: "Open custom media catalog" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Room media library" })).not.toBeInTheDocument();
  });
});
