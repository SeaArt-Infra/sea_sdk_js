# SeaArt JavaScript SDK

> Beta: SDK API 和 SeaArt gateway 行为仍可能随网关版本调整。

Node.js SDK for SeaArt AI gateway APIs. It wraps multimodal generation tasks, model metadata, content safety scans, LLM passthrough APIs, SSE streaming, and provider passthrough requests.

The package is ESM-only and requires Node.js 18 or newer.

Repository: <https://github.com/SeaArt-Infra/sea_sdk_js>

## Available Resources

| Resource | Client field | What it does |
| --- | --- | --- |
| Multimodal | `client.modal` / `client.Modal` | Create generation tasks, precharge tasks, poll task results, list models, fetch model skill docs, and run image/text/face/audio scans |
| LLM | `client.llm` / `client.LLM` | Call chat completions, messages, responses, rerank, embeddings, model listing, and stream-compatible endpoints |
| Passthrough | `client.passthrough` / `client.Passthrough` | Send raw provider-shaped requests through the model gateway while keeping status, headers, and body |

## How It Works

1. Create a reusable `Client` with an API key and optional gateway endpoints.
2. The SDK derives `modelBaseURL`, `llmBaseURL`, and `passthroughBaseURL` from `baseURL` unless they are set explicitly.
3. Requests automatically include `Authorization: Bearer {apiKey}`, `User-Agent: seaart-sdk-js/{version}`, and `X-Project` when `project` is set.
4. Multimodal tasks return task handles that can be polled with `client.modal.wait` or `task.wait`.
5. LLM non-streaming methods return raw JSON strings; decode them with `decode(raw)`.

## Quick Start

Install from GitHub:

```bash
npm install github:SeaArt-Infra/sea_sdk_js
```

After npm publishing, install by package name:

```bash
npm install sea_sdk_js
```

Create a client and submit a multimodal task:

```js
import { Client, newTask } from 'sea_sdk_js';

const client = new Client({
  apiKey: 'sa-your-api-key',
});

const task = await client.modal.create(
  newTask('alibaba_wanx26_i2v_flash')
    .moderation(true)
    .params({
      input: {
        img_url: 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg',
        prompt: 'A dog and a girl playing in an autumn park',
      },
      parameters: {
        resolution: '720P',
        duration: 5,
        prompt_extend: true,
        watermark: false,
      },
    })
    .build(),
);

console.log(task.id, task.status);
```

## Configuration

Use the default gateway:

```js
const client = new Client({
  apiKey: 'sa-your-api-key',
});
```

Override endpoints when your environment uses custom routing:

```js
const client = new Client({
  apiKey: 'sa-your-api-key',
  baseURL: 'https://gateway.example.com',
  project: 'my-project',
  timeout: 60_000,
});
```

`baseURL` is the root gateway URL. If `modelBaseURL`, `llmBaseURL`, or `passthroughBaseURL` are set, they override the derived service URL for that area.

## Request Options

Attach per-request headers to any resource call:

```js
import { withHeader, withHeaders } from 'sea_sdk_js';

const raw = await client.llm.chatCompletions(
  {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'hello' }],
  },
  withHeader('X-Trace-Id', 'trace-123'),
);

await client.llm.listModels(withHeaders({ 'X-Tenant-Id': 'tenant-a' }));
```

## Multimodal Tasks

Create tasks with a raw request object or the task builder. The builder keeps model-specific parameters under `input[0].params` and avoids SDK-side provider enums.

```js
const body = newTask('volces_seedream_4_5')
  .moderation(false)
  .params({ prompt: 'A dog' })
  .metadata('trace_id', 'trace-123')
  .build();

const task = await client.modal.create(body);
```

Precharge uses the same request shape as task creation:

```js
const preview = await client.modal.precharge(
  newTask('volces_seedream_4_5')
    .moderation(false)
    .field('id', 'd88pmute87128c73e9r0d0')
    .params({ prompt: 'A dog' })
    .build(),
);

console.log(preview.status, preview.data.cost, preview.data.currency);
```

Wait for completion from the client or from a task handle:

```js
import {
  withPollCallback,
  withPollInterval,
  withPollTimeout,
} from 'sea_sdk_js';

const done = await client.modal.wait(
  task.id,
  withPollInterval(3000),
  withPollTimeout(5 * 60_000),
  withPollCallback((status, progress) => {
    console.log(status, progress);
  }),
);
```

```js
const done = await task.wait(withPollInterval(3000));
```

Go-style aliases are available for migration compatibility:

```js
const task = await client.Modal.Create(body);
const preview = await client.Modal.Precharge(body);
```

## Model Metadata

Search models and fetch model skill markdown:

```js
const models = await client.modal.listModels({
  query: 'animate',
  input: 'image',
  output: 'video',
  type: 'i2v',
  provider: 'alibaba',
  limit: 2,
});

const skillMarkdown = await client.modal.getModelSkill('alibaba_animate_anyone_detect');
```

## Safety Scans

The modal resource also exposes safety scan APIs:

```js
import {
  ImageScanRiskTypeChild,
  ImageScanRiskTypeErotic,
  ImageScanRiskTypePolity,
  ImageScanRiskTypeViolent,
} from 'sea_sdk_js';

const imageScan = await client.modal.scanImage({
  uri: 'https://example.com/image.jpg',
  risk_types: [
    ImageScanRiskTypePolity,
    ImageScanRiskTypeErotic,
    ImageScanRiskTypeViolent,
    ImageScanRiskTypeChild,
  ],
  detected_age: 0,
  is_video: 0,
});
```

```js
const textScan = await client.modal.scanText({
  text: 'prompt to check',
  scene: 1,
  area_types: [2],
  way: 0,
});
```

```js
const faceScan = await client.modal.scanFace({
  uri: 'https://example.com/image.jpg',
  is_video: 0,
  scene: 'avatar',
});
```

```js
const audioScan = await client.modal.scanAudio({
  uri: 'https://example.com/audio/test.mp3',
  rec_type: 'AUDIOPOLITICAL_MOAN_ANTHEN',
  duration: 15,
});
```

`scanText`, `scanFace`, and `scanAudio` preserve unmodeled response fields in `extra`. Go-style request field names such as `URI`, `RiskTypes`, and `IsVideo` are normalized.

## LLM APIs

Non-streaming LLM methods return raw JSON strings:

```js
import { decode } from 'sea_sdk_js';

const raw = await client.llm.chatCompletions({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hello' }],
  max_tokens: 64,
});

const resp = decode(raw);
console.log(resp.choices[0].message.content);
```

Streaming methods return async iterables of SSE events:

```js
for await (const event of client.llm.chatCompletionsStream({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hello' }],
})) {
  if (event.done) {
    break;
  }

  const chunk = decode(event.data);
  console.log(chunk.choices?.[0]?.delta?.content ?? '');
}
```

Use text assemblers for Responses or Messages streams:

```js
import { ResponsesStreamTextAssembler } from 'sea_sdk_js';

const text = new ResponsesStreamTextAssembler();

for await (const event of client.llm.responsesStream({
  model: 'gpt-4.1-mini',
  input: 'hello',
})) {
  if (!event.done) {
    text.add(decode(event.data));
  }
}

console.log(text.text());
```

## Provider Passthrough

Use passthrough when the caller needs a provider-native API shape. Paths must be relative and include the provider prefix, such as `/kling/...`, `/vidu/...`, or `/google/...`.

```js
const resp = await client.passthrough.post(
  '/kling/v1/videos/text2video',
  {
    model_name: 'kling-v1',
    prompt: 'cinematic shot',
  },
  withHeader('X-Trace-Id', 'trace-123'),
);

console.log(resp.statusCode);
console.log(resp.headers.get('x-task-route'));
console.log(resp.json());
```

Use `requestRaw` to forward raw bytes:

```js
const body = new TextEncoder().encode('{"contents":[{"parts":[{"text":"paint a cat"}]}]}');

const resp = await client.passthrough.requestRaw(
  'POST',
  '/google/v1beta/models/gemini-2.5-flash-image:generateContent',
  body,
);
```

## API Reference

| Area | Methods |
| --- | --- |
| Modal | `create`, `precharge`, `get`, `wait`, `listModels`, `searchModels`, `getModelSkill`, `scanImage`, `scanText`, `scanFace`, `scanAudio` |
| Task | `wait` |
| LLM | `chatCompletions`, `chatCompletionsStream`, `messages`, `messagesStream`, `responses`, `responsesStream`, `rerank`, `embeddings`, `listModels` |
| Passthrough | `request`, `requestRaw`, `get`, `post`, `put`, `delete` |
| Helpers | `newTask`, `decode`, `withHeader`, `withHeaders`, `withPollInterval`, `withPollTimeout`, `withPollCallback` |

## Errors

SDK errors use `SeaArtError` with a stable `kind`:

```js
import { ErrAuth, SeaArtError } from 'sea_sdk_js';

try {
  await client.llm.listModels();
} catch (error) {
  if (error instanceof SeaArtError && error.kind === ErrAuth) {
    console.error('invalid credentials');
  }
}
```

Common kinds include `auth`, `quota`, `timeout`, `network`, `task_failed`, and `general`.

## Development

```bash
npm test
```

## Next Steps

- Use `client.modal.create` and `client.modal.wait` for generation task workflows.
- Use `client.llm.*Stream` methods for SSE streaming.
- Use `ResponsesStreamTextAssembler` or `MessagesStreamTextAssembler` for streamed text assembly.
- Use `client.passthrough` only when you need provider-native request shapes.
