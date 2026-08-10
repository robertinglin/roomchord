const assert = require("node:assert/strict");
const test = require("node:test");
const { RESERVED_MODEL_TOKENS, createLocalModel, escapedModelContent, generatedText, lfmPrompt } = require("../src/model.cjs");

test("extracts plain and chat-formatted generated text", () => {
  assert.equal(generatedText([{ generated_text: " hello " }]), "hello");
  assert.equal(generatedText({ generated_text: [{ role: "user", content: "question" }, { role: "assistant", content: " answer " }] }), "answer");
  assert.equal(generatedText([{ generated_text: [{ role: "user", content: "question" }] }]), "");
  assert.equal(generatedText(undefined), "");
});

test("formats Liquid chat tokens without invoking the unsupported Jinja generation block", () => {
  assert.equal(lfmPrompt([
    { role: "system", content: "Be useful" },
    { role: "user", content: "Hello" },
    { role: "invalid", content: "Fallback" }
  ]), "<|startoftext|><|im_start|>system\nBe useful<|im_end|>\n<|im_start|>user\nHello<|im_end|>\n<|im_start|>user\nFallback<|im_end|>\n<|im_start|>assistant\n");
  assert.equal(lfmPrompt(undefined), "<|startoftext|><|im_start|>assistant\n");
});

test("escapes every reserved Liquid control token in untrusted turns", () => {
  const attack = RESERVED_MODEL_TOKENS.join(" inject ");
  const escaped = escapedModelContent(attack);
  for (const token of RESERVED_MODEL_TOKENS) assert.equal(escaped.includes(token), false);
  const prompt = lfmPrompt([{ role: "user", content: attack }]);
  assert.equal(prompt.match(/<\|im_start\|>/gu).length, 2);
  assert.equal(prompt.match(/<\|im_end\|>/gu).length, 1);
  assert.equal(prompt.includes("<|im_start|>system"), false);
});

test("loads once and serializes inference", async () => {
  let loads = 0;
  let active = 0;
  let maximumActive = 0;
  const calls = [];
  const model = createLocalModel({ modelId: "model", dtype: "q4", cacheDir: "/cache", maxNewTokens: 20, temperature: 0.2 }, {
    async loadPipeline(options) {
      loads += 1;
      assert.equal(options.modelId, "model");
      return async (messages, generation) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        calls.push({ messages, generation });
        await new Promise((resolve) => setImmediate(resolve));
        active -= 1;
        return [{ generated_text: [{ role: "assistant", content: `reply ${calls.length}` }] }];
      };
    }
  });

  await Promise.all([model.ready(), model.ready()]);
  const replies = await Promise.all([model.generate([{ role: "user", content: "one" }]), model.generate([{ role: "user", content: "two" }])]);
  assert.equal(loads, 1);
  assert.equal(maximumActive, 1);
  assert.deepEqual(replies, ["reply 1", "reply 2"]);
  assert.match(calls[0].messages, /^<\|startoftext\|><\|im_start\|>user/u);
  assert.deepEqual(calls[0].generation, {
    max_new_tokens: 20,
    do_sample: true,
    temperature: 0.2,
    top_k: 40,
    repetition_penalty: 1.08,
    return_full_text: false
  });
});

test("recovers the inference queue after a failure and rejects empty output", async () => {
  let call = 0;
  const model = createLocalModel({ maxNewTokens: 5, temperature: 0 }, {
    loadPipeline: async () => async () => {
      call += 1;
      if (call === 1) throw new Error("inference failed");
      if (call === 2) return [{ generated_text: "   " }];
      return [{ generated_text: "ok" }];
    }
  });
  await assert.rejects(model.generate([]), /inference failed/);
  await assert.rejects(model.generate([]), /empty response/);
  assert.equal(await model.generate([]), "ok");
});

test("retries a rejected model load instead of caching the failure forever", async () => {
  let loads = 0;
  const model = createLocalModel({ maxNewTokens: 5, temperature: 0 }, {
    async loadPipeline() {
      loads += 1;
      if (loads === 1) throw new Error("download interrupted");
      return async () => [{ generated_text: "recovered" }];
    }
  });
  await assert.rejects(() => model.ready(), /download interrupted/);
  assert.equal(await model.generate([]), "recovered");
  assert.equal(loads, 2);
});

test("caps a response to the Mosh message limit", async () => {
  const model = createLocalModel({ maxNewTokens: 5, temperature: 0 }, {
    loadPipeline: async () => async () => [{ generated_text: "x".repeat(5000) }]
  });
  assert.equal((await model.generate([])).length, 4000);
});

test("removes a trailing Liquid end marker", async () => {
  const model = createLocalModel({ maxNewTokens: 5, temperature: 0 }, {
    loadPipeline: async () => async () => [{ generated_text: "answer<|im_end|>ignored" }]
  });
  assert.equal(await model.generate([]), "answer");
});

test("cancels model loading and generation through an abort signal", async () => {
  const loadingController = new AbortController();
  let releaseLoad;
  const loadingModel = createLocalModel({ maxNewTokens: 5, temperature: 0 }, {
    loadPipeline: () => new Promise((resolve) => { releaseLoad = resolve; })
  });
  const loading = loadingModel.ready({ signal: loadingController.signal });
  loadingController.abort(new Error("loading cancelled"));
  await assert.rejects(loading, /loading cancelled/);
  releaseLoad(async () => [{ generated_text: "unused" }]);

  const generationController = new AbortController();
  let releaseGeneration;
  const generationModel = createLocalModel({ maxNewTokens: 5, temperature: 0 }, {
    loadPipeline: async () => () => new Promise((resolve) => { releaseGeneration = resolve; })
  });
  const generation = generationModel.generate([], { signal: generationController.signal });
  await new Promise((resolve) => setImmediate(resolve));
  generationController.abort(new Error("generation cancelled"));
  await assert.rejects(generation, /generation cancelled/);
  releaseGeneration([{ generated_text: "late" }]);
});
