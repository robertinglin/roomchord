import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AutoModControls } from "./AutoModControls";

const policy = { version: 2, enabled: true, rules: [{ id: "spam", action: "block" as const, match: "contains" as const, terms: ["spam"] }] };

describe("AutoModControls", () => {
  it("does not render for members without moderation access", () => {
    const { container } = render(<AutoModControls canModerate={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loads and publishes a policy with a rule", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn(async () => policy);
    const onPublish = vi.fn(async () => undefined);
    render(<AutoModControls canModerate onActive={onActive} onPublish={onPublish} />);
    expect(await screen.findByText("Version 2 · Enabled · 1 rule")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Terms (one per line)"));
    await user.type(screen.getByLabelText("Terms (one per line)"), "harassment\ninsult");
    await user.selectOptions(screen.getByLabelText("Match"), "exact");
    await user.click(screen.getByRole("button", { name: "Publish AutoMod policy" }));
    await waitFor(() => expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ version: 2, enabled: true, rules: [expect.objectContaining({ id: "spam", terms: ["harassment", "insult"] })] })));
    expect(onActive).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("status")).toHaveTextContent("published");
  });

  it("evaluates messages and applies all public override actions", async () => {
    const user = userEvent.setup();
    const onEvaluate = vi.fn(async () => ({ ok: false, action: "redact" as const, policyVersion: 2, ruleId: "spam" }));
    const onOverride = vi.fn(async () => undefined);
    const onRedact = vi.fn(async () => undefined);
    const onQuarantine = vi.fn(async () => undefined);
    render(<AutoModControls canModerate onEvaluate={onEvaluate} onOverride={onOverride} onRedact={onRedact} onQuarantine={onQuarantine} />);
    await user.type(screen.getByLabelText("Message to check"), "spam here");
    await user.click(screen.getByRole("button", { name: "Evaluate message" }));
    expect(onEvaluate).toHaveBeenCalledWith({ body: "spam here" });
    expect(await screen.findByText("Result: redact (spam)." )).toBeInTheDocument();
    await user.type(screen.getByLabelText("Message reference"), "message-1");
    await user.clear(screen.getByLabelText("Evaluation channel"));
    await user.type(screen.getByLabelText("Evaluation channel"), "general");
    await user.click(screen.getByRole("button", { name: "Evaluate message" }));
    await user.clear(screen.getByLabelText("Policy version"));
    await user.type(screen.getByLabelText("Policy version"), "2");
    await user.clear(screen.getByLabelText("Revision"));
    await user.type(screen.getByLabelText("Revision"), "4");
    await user.type(screen.getByLabelText("Channel scope (optional)"), "general");
    await user.type(screen.getByPlaceholderText("Only authorized moderators can view this reason"), "reviewed");
    await user.click(screen.getByRole("button", { name: "Allow message" }));
    await user.click(screen.getByRole("button", { name: "Redact message" }));
    await user.click(screen.getByRole("button", { name: "Quarantine message" }));
    await user.clear(screen.getByLabelText("Policy version"));
    await user.clear(screen.getByLabelText("Revision"));
    await user.clear(screen.getByLabelText("Channel scope (optional)"));
    await user.clear(screen.getByPlaceholderText("Only authorized moderators can view this reason"));
    await user.click(screen.getByRole("button", { name: "Allow message" }));
    expect(onOverride).toHaveBeenCalledWith(expect.objectContaining({ messageId: "message-1", action: "allow" }));
    expect(onRedact).toHaveBeenCalledWith(expect.objectContaining({ messageId: "message-1" }));
    expect(onQuarantine).toHaveBeenCalledWith(expect.objectContaining({ messageId: "message-1" }));
  });

  it("rejects empty rules and reports controller failures", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn(async () => { throw new Error("not authorized"); });
    const onActive = vi.fn(async () => undefined);
    render(<AutoModControls canModerate onActive={onActive} onPublish={onPublish} />);
    await user.click(screen.getByRole("button", { name: "Publish AutoMod policy" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add at least one term");
    await user.type(screen.getByLabelText("Terms (one per line)"), "spam");
    await user.click(screen.getByRole("button", { name: "Publish AutoMod policy" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not authorized");
  });

  it("surfaces policy loading errors", async () => {
    const onActive = vi.fn(async () => { throw new Error("policy unavailable"); });
    render(<AutoModControls canModerate onActive={onActive} onPublish={vi.fn(async () => undefined)} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("policy unavailable");
  });

  it("shows disabled multi-rule policies and their defaults", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn(async () => ({ version: 3, enabled: false, rules: [
      { id: "one", action: "redact" as const, terms: ["one"] },
      { id: "two", action: "quarantine" as const, terms: ["two"] }
    ] }));
    render(<AutoModControls canModerate onActive={onActive} onPublish={vi.fn(async () => undefined)} />);
    expect(await screen.findByText("Version 3 · Disabled · 2 rules")).toBeInTheDocument();
    expect(screen.getByText("redact when contains: one")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Enable automated moderation"));
    expect(screen.getByLabelText("Enable automated moderation")).toBeChecked();
  });

  it("publishes a new policy with optional scope and quarantine duration", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn(async () => undefined);
    const onPublish = vi.fn(async () => undefined);
    render(<AutoModControls canModerate onActive={onActive} onPublish={onPublish} />);
    expect(await screen.findByText("No AutoMod policy is active.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Rule name"));
    await user.selectOptions(screen.getByLabelText("Action"), "quarantine");
    await user.selectOptions(screen.getByLabelText("Match"), "exact");
    await user.type(screen.getByLabelText("Terms (one per line)"), "spoiler");
    await user.type(screen.getByLabelText("Channel scope (optional)"), "spoilers");
    await user.type(screen.getByLabelText("Quarantine duration (seconds, optional)"), "30");
    await user.click(screen.getByLabelText("Enable automated moderation"));
    await user.click(screen.getByRole("button", { name: "Publish AutoMod policy" }));
    await waitFor(() => expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, rules: [expect.objectContaining({ id: "mosh-rule", action: "quarantine", match: "exact", scopeId: "spoilers", durationMs: 30000 })] })));
  });
});
