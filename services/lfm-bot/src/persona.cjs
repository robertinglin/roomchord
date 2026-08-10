const fs = require("node:fs/promises");
const { defaultSystemPrompt } = require("./bot.cjs");

const MAX_PERSONA_BYTES = 32 * 1024;

async function loadPersona(file, displayName) {
  if (!file) return defaultSystemPrompt(displayName);
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("LFM bot persona must be a regular file.");
  if (stat.size < 1 || stat.size > MAX_PERSONA_BYTES) {
    throw new Error(`LFM bot persona must be between 1 and ${MAX_PERSONA_BYTES} bytes.`);
  }
  const prompt = String(await fs.readFile(file, "utf8")).trim();
  if (!prompt) throw new Error("LFM bot persona must not be empty.");
  return prompt;
}

module.exports = { MAX_PERSONA_BYTES, loadPersona };
