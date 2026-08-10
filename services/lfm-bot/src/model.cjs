const MAX_MOSH_MESSAGE_LENGTH = 4000;
const RESERVED_MODEL_TOKENS = ["<|startoftext|>", "<|im_start|>", "<|im_end|>"];

function escapedModelContent(value) {
  let content = typeof value === "string" ? value : "";
  for (const token of RESERVED_MODEL_TOKENS) content = content.replaceAll(token, token.replace("<", "‹"));
  return content;
}

function abortError(signal) {
  return signal?.reason instanceof Error ? signal.reason : new Error("Local model operation was aborted.");
}

function withAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortError(signal));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (error) => { signal.removeEventListener("abort", abort); reject(error); }
    );
  });
}

function lfmPrompt(messages) {
  const turns = Array.isArray(messages) ? messages : [];
  let prompt = "<|startoftext|>";
  for (const message of turns) {
    const role = ["system", "user", "assistant"].includes(message?.role) ? message.role : "user";
    const content = escapedModelContent(message?.content);
    prompt += `<|im_start|>${role}\n${content}<|im_end|>\n`;
  }
  return `${prompt}<|im_start|>assistant\n`;
}

function generatedText(result) {
  const generated = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
  if (typeof generated === "string") return generated.trim();
  if (!Array.isArray(generated)) return "";
  for (let index = generated.length - 1; index >= 0; index -= 1) {
    const item = generated[index];
    if (item?.role === "assistant" && typeof item.content === "string") return item.content.trim();
  }
  return "";
}

async function loadTextGenerationPipeline(options) {
  const transformers = await import("@huggingface/transformers");
  transformers.env.cacheDir = options.cacheDir;
  const runtime = { dtype: options.dtype };
  if (options.device && options.device !== "cpu") runtime.device = options.device;
  return await transformers.pipeline("text-generation", options.modelId, runtime);
}

function createLocalModel(options, dependencies = {}) {
  const loadPipeline = dependencies.loadPipeline || loadTextGenerationPipeline;
  let pipelinePromise;
  let inferenceTail = Promise.resolve();

  function pipeline(signal) {
    if (!pipelinePromise) {
      const loading = Promise.resolve().then(() => loadPipeline({ ...options, signal }));
      const pending = loading.catch((error) => {
        if (pipelinePromise === pending) pipelinePromise = undefined;
        throw error;
      });
      pipelinePromise = pending;
    }
    return withAbort(pipelinePromise, signal);
  }

  async function run(messages, signal) {
    const generate = await pipeline(signal);
    const result = await withAbort(Promise.resolve(generate(lfmPrompt(messages), {
      max_new_tokens: options.maxNewTokens,
      do_sample: options.temperature > 0,
      temperature: options.temperature || undefined,
      top_k: 40,
      repetition_penalty: 1.08,
      return_full_text: false,
      ...(signal ? { signal } : {})
    })), signal);
    const text = generatedText(result)
      .replace(/<\|im_end\|>[\s\S]*$/u, "")
      .slice(0, MAX_MOSH_MESSAGE_LENGTH)
      .trim();
    if (!text) throw new Error("The local model returned an empty response.");
    if (RESERVED_MODEL_TOKENS.some((token) => text.includes(token))) {
      throw new Error("The local model returned reserved control tokens.");
    }
    return text;
  }

  return {
    ready(options = {}) { return pipeline(options.signal); },
    generate(messages, options = {}) {
      const pending = inferenceTail.then(() => run(messages, options.signal));
      inferenceTail = pending.catch(() => undefined);
      return pending;
    }
  };
}

module.exports = { RESERVED_MODEL_TOKENS, createLocalModel, escapedModelContent, generatedText, lfmPrompt, loadTextGenerationPipeline };
