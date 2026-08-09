const fs = require("node:fs");
const path = require("node:path");
const { test, expect, message, findFrame } = require("./fixtures/mosh.cjs");

test("applies a rebuilt development iframe without losing room state", async ({ mosh }) => {
  const marker = `Mosh rebuilt ${Date.now()}`;
  const body = `state-before-rebuild-${Date.now()}`;
  const page = mosh.pages.admin;
  const frameBefore = await findFrame(page);
  const actorBefore = await frameBefore.getByRole("button", { name: /\(you\)$/ }).first().getAttribute("aria-label");
  expect(actorBefore).toBeTruthy();
  await message(page, body);

  const sidebarPath = path.join(mosh.project, "src/widgets/chat-shell/ui/ChatSidebar.tsx");
  const stylesPath = path.join(mosh.project, "src/app/styles.css");
  const source = fs.readFileSync(sidebarPath, "utf8");
  const styles = fs.readFileSync(stylesPath, "utf8");
  const rebuilt = source.replace('appName="Mosh"', `appName=${JSON.stringify(marker)}`);
  expect(rebuilt).not.toBe(source);
  fs.writeFileSync(sidebarPath, rebuilt);
  fs.writeFileSync(stylesPath, `${styles}\n/* ${marker} */\n`);
  await expect.poll(
    () => mosh.output.text,
    { timeout: 90_000, message: "Matterhorn should rebuild the changed development frontend" }
  ).toContain("Matterhorn frontend bundle rebuilt. Reload the browser.");
  await expect(page.getByTestId("matterhorn-development-update")).toBeVisible({ timeout: 30_000 });
  const reload = page.getByTestId("matterhorn-development-reload");
  await expect(reload).toBeVisible({ timeout: 30_000 });
  await reload.click();

  const frameAfter = await findFrame(page);
  await expect(frameAfter.getByText(marker, { exact: true })).toBeVisible();
  await expect(frameAfter.getByText(body, { exact: true })).toBeVisible();
  await expect(frameAfter.getByRole("button", { name: /\(you\)$/ }).first()).toHaveAttribute("aria-label", actorBefore);
});
