# SeaArt JavaScript SDK

SeaArt AI 平台的 Node.js SDK。该版本从 `seaart_sdk_go` 翻译而来，公开三类能力：

- `client.modal` / `client.Modal`：多模态任务接口
- `client.llm` / `client.LLM`：LLM 透传接口
- `client.passthrough` / `client.Passthrough`：厂商原始 API 透传接口

仓库地址：<https://github.com/SeaArt-Infra2/sea_sdk_js>

## 要求

- Node.js 18+
- ESM 项目
- 无第三方运行时依赖

## 安装

当前仓库可直接通过 GitHub 地址安装：

```bash
npm install github:SeaArt-Infra/sea_sdk_js
```

发布到 npm 后可按包名安装：

```bash
npm install sea_sdk_js
```

## 初始化

```js
import { Client } from 'sea_sdk_js';

const client = new Client({
  apiKey: 'sa-your-api-key',
});
```

默认网关配置：

- `baseURL`: `https://gateway.example.com`
- `modelBaseURL`: `https://gateway.example.com/model`
- `llmBaseURL`: `https://gateway.example.com/llm`
- `passthroughBaseURL`: `https://gateway.example.com/model`

如果显式传入 `baseURL`，SDK 会默认派生：

- `modelBaseURL = baseURL + "/model"`
- `llmBaseURL = baseURL + "/llm"`
- `passthroughBaseURL = modelBaseURL`

也可以分别覆盖：

```js
const client = new Client({
  apiKey: 'sa-your-api-key',
  baseURL: 'https://gateway.example.com',
  modelBaseURL: 'https://mm-gateway.example.com',
  llmBaseURL: 'https://llm-gateway.example.com',
  passthroughBaseURL: 'https://mm-gateway.example.com',
  timeout: 60_000,
  project: 'my-project',
});
```

请求会自动带上：

- `Authorization: Bearer {apiKey}`
- `User-Agent: seaart-sdk-js/{version}`
- `X-Project: {project}`，当 `project` 不为空时

## 请求选项

```js
import { withHeader, withHeaders } from 'sea_sdk_js';

await client.llm.listModels(withHeader('X-Trace-Id', 'trace-123'));

await client.llm.chatCompletions(
  { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] },
  withHeaders({ 'X-Tenant-Id': 'tenant-a' }),
);
```

## Modal API

### 创建任务

```js
const task = await client.modal.create({
  model: 'vidu_q3_reference',
  input: [
    {
      type: 'message',
      role: 'user',
      content: [
        { type: 'text', text: 'cinematic shot' },
        { type: 'image_url', url: 'https://example.com/ref1.webp' },
      ],
    },
  ],
  parameters: {
    duration: 5,
  },
});

console.log(task.id, task.status);
```

### Builder

```js
import { imageURL, newTask, text } from 'sea_sdk_js';

const body = newTask('vidu_q3_reference')
  .user(
    text('cinematic shot'),
    imageURL('https://example.com/ref1.webp'),
    imageURL('https://example.com/ref2.webp'),
  )
  .param('duration', 5)
  .metadata('trace_id', 'trace-123')
  .build();

const task = await client.modal.create(body);
```

Go 风格别名也可用：

```js
const task = await client.Modal.Create(body);
```

### 等待任务完成

```js
import {
  withPollCallback,
  withPollInterval,
  withPollTimeout,
} from 'sea_sdk_js';

const done = await client.modal.wait(
  'task_abc123',
  withPollInterval(3000),
  withPollTimeout(5 * 60_000),
  withPollCallback((status, progress) => {
    console.log(status, progress);
  }),
);

console.log(done.output);
```

创建后的 `task` 也可以直接等待：

```js
const done = await task.wait(withPollInterval(3000));
```

### 模型列表和参数详情

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

### 图片/视频鉴黄

```js
import {
  ImageScanRiskTypeChild,
  ImageScanRiskTypeErotic,
  ImageScanRiskTypePolity,
  ImageScanRiskTypeViolent,
} from 'sea_sdk_js';

const resp = await client.modal.scanImage({
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

console.log(resp.ok, resp.nsfw_level, resp.risk_types);
```

Go SDK 的字段风格也会被归一化：

```js
await client.modal.scanImage({
  URI: 'https://example.com/video.mp4',
  RiskTypes: [ImageScanRiskTypeErotic, ImageScanRiskTypeViolent],
  IsVideo: 1,
  Duration: 12.5,
});
```

### 敏感词和人脸检测

```js
const textScan = await client.modal.scanText({
  text: 'prompt to check',
  scene: 1,
  area_types: [2],
  way: 0,
});
console.log(textScan.data.is_sensitive);
console.log(textScan.data.sensitive_words);
console.log(textScan.data.combination);

const faceScan = await client.modal.scanFace({
  uri: 'https://example.com/image.jpg',
  is_video: 0,
  scene: 'avatar',
});
```

`scanText` 的 `data` 包含 `sensitive_words`、`is_sensitive` 和 `combination`。`scanText` 和 `scanFace` 会把未建模响应字段保留在 `extra`。

## LLM API

非流式方法返回原始 JSON 字符串，使用 `decode()` 解析：

```js
import { decode } from 'sea_sdk_js';

const raw = await client.llm.chatCompletions({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hi' }],
  max_tokens: 16,
});

const resp = decode(raw);
console.log(resp.choices[0].message.content);
```

已支持的 LLM 方法：

- `client.llm.chatCompletions(payload)`
- `client.llm.chatCompletionsStream(payload)`
- `client.llm.messages(payload)`
- `client.llm.messagesStream(payload)`
- `client.llm.responses(payload)`
- `client.llm.responsesStream(payload)`
- `client.llm.rerank(payload)`
- `client.llm.embeddings(payload)`
- `client.llm.listModels()`

非流式方法会拒绝 `stream: true`，请改用对应的 stream 方法。

### 流式 SSE

流式方法返回 async iterable：

```js
for await (const event of client.llm.chatCompletionsStream({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hi' }],
})) {
  if (event.done) {
    break;
  }

  const chunk = decode(event.data);
  console.log(chunk);
}
```

文本拼接 helper：

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

## Passthrough API

Passthrough 会原样返回 HTTP 状态码、响应头和 body。即使上游返回 4xx/5xx，也不会转成 SDK 错误。

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

原始 body：

```js
const body = new TextEncoder().encode('{"contents":[{"parts":[{"text":"paint a cat"}]}]}');

const resp = await client.passthrough.requestRaw(
  'POST',
  'google/v1beta/models/gemini-2.5-flash-image:generateContent',
  body,
);
```

## 错误

SDK 错误统一为 `SeaArtError`：

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

错误分类：

- `auth`
- `quota`
- `timeout`
- `network`
- `task_failed`
- `general`

## 测试

```bash
npm test
```
