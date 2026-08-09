const { test, expect, findFrame, openChannel } = require("./fixtures/mosh.cjs");

async function openManagement(page, tab) {
  const frame = await findFrame(page);
  await frame.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(frame.getByRole("dialog", { name: "Manage" })).toBeVisible();
  await frame.getByRole("button", { name: new RegExp(`^${tab}`) }).click();
  return frame;
}

test.describe("Mosh integrations and catalog-only custom media", () => {
  test("keeps integration secrets private through the real management surface", async ({ mosh }) => {
    const frame = await openManagement(mosh.pages.admin, "Integrations");
    const unavailable = frame.getByRole("region", { name: "Integrations unavailable" });
    await expect(unavailable).toHaveCount(0);

    const integrationId = `e2e-integration-${Date.now()}`;
    const displayName = "E2E encrypted integration";
    await frame.getByLabel("Integration ID").fill(integrationId);
    await frame.getByLabel("Integration display name").fill(displayName);
    await frame.getByRole("button", { name: "Create identity and install" }).click();
    const installation = frame.getByRole("button", { name: `Select ${displayName}` });
    await expect(installation).toBeVisible();
    await installation.click();

    const secret = `e2e-private-${Date.now()}`;
    await frame.getByLabel("Secret name").fill("api-key");
    await frame.getByLabel("Secret value").fill(secret);
    await frame.getByRole("button", { name: "Store secret" }).click();
    await expect(frame.getByLabel("Secret name")).toHaveValue("");
    await expect(frame.getByLabel("Secret value")).toHaveValue("");
    await expect(frame.locator("body")).not.toContainText(secret);
  });

  test("uses typed custom-media references with consent and safe rendering boundaries", async ({ mosh }) => {
    const frame = await openChannel(mosh.pages.admin);
    await frame.getByRole("button", { name: "Open custom media catalog" }).click();
    const catalog = frame.getByRole("region", { name: "Custom media catalog" });
    await expect(catalog).toBeVisible();
    await expect(catalog.getByRole("note")).toContainText("encrypted room reference");
    await expect(catalog).not.toContainText(/https?:\/\/|<\/?(?:script|html|img)\b|javascript:/i);
    await expect(catalog.locator('a[href^="http"], audio[src^="http"], video[src^="http"], img[src^="http"]')).toHaveCount(0);

    const useButtons = catalog.getByRole("button", { name: "Use in message" });
    const referenceGate = frame.getByRole("status").filter({ hasText: "accepted-operation reference validator" });
    const unavailable = frame.getByRole("note").filter({ hasText: "Custom media is unavailable" });
    if (await referenceGate.isVisible().catch(() => false)) {
      await expect(referenceGate).toBeVisible();
      for (let index = 0; index < await useButtons.count(); index += 1) {
        await expect(useButtons.nth(index)).toBeDisabled();
      }
    } else if (await unavailable.isVisible().catch(() => false)) {
      await expect(useButtons).toHaveCount(0);
    } else {
      expect(await useButtons.count()).toBeGreaterThan(0);
      for (let index = 0; index < await useButtons.count(); index += 1) {
        await expect(useButtons.nth(index)).toBeEnabled();
      }
      await useButtons.first().click();
      await expect(frame.getByText(/custom media item attached/)).toBeVisible();
    }

    await catalog.getByLabel("Custom media type").selectOption("voice");
    const recordButton = catalog.getByRole("button", { name: "Record voice message" });
    await expect(recordButton).toBeVisible();
    if (await recordButton.isDisabled()) {
      await expect(catalog.getByRole("status").filter({ hasText: "Encrypted Files v2 is unavailable" })).toBeVisible();
    }

    const providerQuery = catalog.getByLabel("Custom media provider query");
    if (await providerQuery.count()) {
      await providerQuery.fill("e2e-party");
      const consent = catalog.getByRole("checkbox", { name: /Allow this provider/ });
      await expect(consent).not.toBeChecked();
      await expect(catalog.getByRole("button", { name: "Search provider" })).toBeDisabled();
      await consent.check();
      const search = catalog.getByRole("button", { name: "Search provider" });
      await expect(search).toBeEnabled();
      await search.click();
      await expect(search).toBeEnabled();
      await expect(catalog.getByRole("alert")).toHaveCount(0);
    } else {
      await expect(catalog.getByRole("status").filter({ hasText: "No authorized media providers" })).toBeVisible();
    }
  });
});
