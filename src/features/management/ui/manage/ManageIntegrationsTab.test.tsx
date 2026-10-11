import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { IntegrationController } from "matterhorn-sdk/browser";
import { ManageIntegrationsTab } from "@features/management/ui/manage/ManageIntegrationsTab";

const installation = {
  integrationId: "calendar-bot",
  displayName: "Calendar Bot",
  publicKey: "public-key",
  capabilities: ["events.ingress", "events.egress", "secrets.write", "commands.register", "commands.invoke", "commands.result", "webhooks.manage"],
  status: "enabled" as const,
  installedAt: 1,
  updatedAt: 1
};

function controller(overrides: Partial<IntegrationController> = {}) {
  const value = {
    createIdentity: vi.fn(async () => ({ signedIdentity: { identity: { integrationId: "new-bot" } }, privateKey: "private" })),
    verifyIdentity: vi.fn(),
    install: vi.fn(async () => undefined),
    uninstall: vi.fn(async () => undefined),
    enable: vi.fn(async () => undefined),
    disable: vi.fn(async () => undefined),
    storeSecret: vi.fn(async () => undefined),
    rotateSecret: vi.fn(async () => undefined),
    ingress: vi.fn(async () => undefined),
    egress: vi.fn(async () => undefined),
    registerCommand: vi.fn(async () => undefined),
    unregisterCommand: vi.fn(async () => undefined),
    invokeCommand: vi.fn(async () => undefined),
    publishCommandResult: vi.fn(async () => undefined),
    registerWebhook: vi.fn(async () => undefined),
    removeWebhook: vi.fn(async () => undefined),
    setWebhookRateLimit: vi.fn(async () => undefined),
    setWebhookModeratorPolicy: vi.fn(async () => undefined),
    list: vi.fn(async () => [installation]),
    subscribe: vi.fn(() => () => undefined),
    ...overrides
  } as unknown as IntegrationController;
  return value;
}

async function selectIntegration(value = controller()) {
  render(<ManageIntegrationsTab controller={value} canManage />);
  await waitFor(() => expect(screen.getByRole("button", { name: /Select Calendar Bot/ })).toBeInTheDocument());
  return value;
}

describe("ManageIntegrationsTab", () => {
  it("shows explicit unavailable and authorization states", () => {
    const { rerender } = render(<ManageIntegrationsTab canManage={false} />);
    expect(screen.getByText("Matterhorn integrations are unavailable for this room connection.")).toBeInTheDocument();
    rerender(<ManageIntegrationsTab controller={controller()} canManage={false} />);
    expect(screen.getByText("Moderator authorization is required to manage integrations.")).toBeInTheDocument();
  });

  it("installs a signed identity with requested capabilities and handles lifecycle actions", async () => {
    const user = userEvent.setup();
    const value = controller();
    render(<ManageIntegrationsTab controller={value} canManage />);
    await user.type(screen.getByRole("textbox", { name: "Integration ID" }), "new-bot");
    await user.type(screen.getByRole("textbox", { name: "Integration display name" }), "New Bot");
    await user.click(screen.getByRole("button", { name: "Create identity and install" }));
    await waitFor(() => expect(value.install).toHaveBeenCalledWith(expect.objectContaining({ capabilities: expect.arrayContaining(["events.ingress", "secrets.write"]) })));
    expect(value.createIdentity).toHaveBeenCalledWith(expect.objectContaining({ integrationId: "new-bot", displayName: "New Bot" }));

    cleanup();
    const selected = await selectIntegration(value);
    await user.click(screen.getAllByRole("button", { name: "Disable" })[0]);
    await waitFor(() => expect(selected.disable).toHaveBeenCalledWith("calendar-bot"));
    await user.click(screen.getByRole("button", { name: "Uninstall" }));
    expect(selected.uninstall).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm uninstall" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm uninstall" }));
    await waitFor(() => expect(selected.uninstall).toHaveBeenCalledWith("calendar-bot"));
  });

  it("targets the lifecycle row that was acted on", async () => {
    const user = userEvent.setup();
    const other = { ...installation, integrationId: "other-bot", displayName: "Other Bot" };
    const value = controller({ list: vi.fn(async () => [installation, other]) });
    render(<ManageIntegrationsTab controller={value} canManage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Select Other Bot" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Select Other Bot" }));
    await user.click(screen.getAllByRole("button", { name: "Disable" })[1]);
    await waitFor(() => expect(value.disable).toHaveBeenCalledWith("other-bot"));
  });

  it("stores and rotates secrets, and sends encrypted ingress and egress payloads", async () => {
    const user = userEvent.setup();
    const value = await selectIntegration();
    await user.type(screen.getByRole("textbox", { name: "Secret name" }), "api-key");
    await user.type(screen.getByLabelText("Secret value"), "secret-value");
    await user.click(screen.getByRole("button", { name: "Store secret" }));
    await waitFor(() => expect(value.storeSecret).toHaveBeenCalledWith({ integrationId: "calendar-bot", secretName: "api-key", secret: "secret-value" }));
    expect(screen.getByLabelText("Secret value")).toHaveValue("");
    await user.type(screen.getByRole("textbox", { name: "Secret name" }), "api-key");
    await user.type(screen.getByLabelText("Secret value"), "rotated-secret");
    await user.click(screen.getByRole("button", { name: "Rotate secret" }));
    await waitFor(() => expect(value.rotateSecret).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Send ingress" }));
    await waitFor(() => expect(value.ingress).toHaveBeenCalledWith({ integrationId: "calendar-bot", payload: { type: "event" } }));
    await user.click(screen.getByRole("button", { name: "Send egress" }));
    await waitFor(() => expect(value.egress).toHaveBeenCalledWith({ integrationId: "calendar-bot", payload: { type: "event" } }));
  });

  it("registers, invokes, and publishes command results", async () => {
    const user = userEvent.setup();
    const value = await selectIntegration();
    await user.type(screen.getByRole("textbox", { name: "Command ID" }), "sync");
    await user.type(screen.getByRole("textbox", { name: "Command name" }), "sync");
    await user.click(screen.getByRole("button", { name: "Register command" }));
    await waitFor(() => expect(value.registerCommand).toHaveBeenCalledWith(expect.objectContaining({ integrationId: "calendar-bot", commandId: "sync", name: "sync" })));
    await user.click(screen.getByRole("button", { name: "Invoke command" }));
    await waitFor(() => expect(value.invokeCommand).toHaveBeenCalledWith({ integrationId: "calendar-bot", commandId: "sync", args: {} }));
    await user.type(screen.getByRole("textbox", { name: "Invocation ID" }), "inv-1");
    await user.click(screen.getByRole("button", { name: "Publish command result" }));
    await waitFor(() => expect(value.publishCommandResult).toHaveBeenCalledWith({ integrationId: "calendar-bot", commandId: "sync", invocationId: "inv-1", result: {} }));
  });

  it("registers and manages webhook rate limits and moderator policy", async () => {
    const user = userEvent.setup();
    const value = await selectIntegration();
    await user.type(screen.getByRole("textbox", { name: "Webhook ID" }), "hook-1");
    await user.click(screen.getByRole("checkbox", { name: "Require moderator approval" }));
    await user.click(screen.getByRole("button", { name: "Register webhook" }));
    await waitFor(() => expect(value.registerWebhook).toHaveBeenCalledWith(expect.objectContaining({ integrationId: "calendar-bot", webhookId: "hook-1", moderatorPolicy: { requireModeratorApproval: true } })));
    await user.click(screen.getByRole("button", { name: "Update rate limit" }));
    await waitFor(() => expect(value.setWebhookRateLimit).toHaveBeenCalledWith(expect.objectContaining({ integrationId: "calendar-bot", webhookId: "hook-1" })));
    await user.click(screen.getByRole("button", { name: "Update policy" }));
    await waitFor(() => expect(value.setWebhookModeratorPolicy).toHaveBeenCalledWith({ integrationId: "calendar-bot", webhookId: "hook-1", policy: { requireModeratorApproval: true } }));
    await user.click(screen.getByRole("button", { name: "Remove webhook" }));
    expect(value.removeWebhook).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm remove webhook" }));
    await waitFor(() => expect(value.removeWebhook).toHaveBeenCalledWith({ integrationId: "calendar-bot", webhookId: "hook-1" }));
  });

  it("reports invalid encrypted payload JSON and controller failures", async () => {
    const user = userEvent.setup();
    const value = controller({ ingress: vi.fn(async () => { throw new Error("ingress denied"); }) });
    await selectIntegration(value);
    await user.clear(screen.getByRole("textbox", { name: "Integration event payload" }));
    await user.type(screen.getByRole("textbox", { name: "Integration event payload" }), "not-json");
    await user.click(screen.getByRole("button", { name: "Send ingress" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Event payload must be valid JSON");
    await user.clear(screen.getByRole("textbox", { name: "Integration event payload" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Integration event payload" }), { target: { value: "{}" } });
    await user.click(screen.getByRole("button", { name: "Send ingress" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ingress denied");
  });

  it("refreshes from the public subscription and reports non-Error list failures", async () => {
    let notify: ((next: typeof installation[]) => void) | undefined;
    const value = controller({
      subscribe: vi.fn((listener: (next: typeof installation[]) => void) => { notify = listener; return () => undefined; })
    });
    render(<ManageIntegrationsTab controller={value} canManage />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Select Calendar Bot/ })).toBeInTheDocument());
    notify?.([{ ...installation, status: "disabled" }]);
    expect(await screen.findByRole("button", { name: "Select Calendar Bot" })).toBeInTheDocument();
    expect(screen.getAllByText("disabled").length).toBeGreaterThan(0);
    cleanup();
    const failing = controller({ list: vi.fn(async () => { throw "integration list unavailable"; }) });
    render(<ManageIntegrationsTab controller={failing} canManage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("integration list unavailable");
  });

  it("surfaces subscription setup failures without breaking the management panel", async () => {
    const value = controller({ subscribe: vi.fn(() => { throw new Error("integration subscription unavailable"); }) });
    render(<ManageIntegrationsTab controller={value} canManage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("integration subscription unavailable");
    expect(screen.getByRole("region", { name: "Install integration" })).toBeInTheDocument();
  });
});
