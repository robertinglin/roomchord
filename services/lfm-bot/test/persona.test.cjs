const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { loadPersona } = require("../src/persona.cjs");

test("loads a bounded mounted persona and defaults to the configured bot name", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lfm-persona-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "persona.txt");
  await fs.writeFile(file, "You are Sunny and answer weather questions.\n");
  assert.equal(await loadPersona(file, "Sunny"), "You are Sunny and answer weather questions.");
  assert.match(await loadPersona(undefined, "Nimbus"), /You are Nimbus/);
  await fs.writeFile(file, "");
  await assert.rejects(() => loadPersona(file, "Sunny"), /between 1/);
});
