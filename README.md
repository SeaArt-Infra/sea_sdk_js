# SeaArt JavaScript SDK

SeaArt AI 平台的 Node.js SDK。该版本从 `seaart_sdk_go` 翻译而来，公开三类能力：

- `client.modal` / `client.Modal`：多模态任务接口
- `client.llm` / `client.LLM`：大语言模型透传接口
- `client.passthrough` / `client.Passthrough`：厂商原始 API 透传接口

仓库地址：<https://github.com/SeaArt-Infra/sea_sdk_js>

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

- `baseURL`：`https://gateway.example.com`
- `modelBaseURL`：`https://gateway.example.com/model`
- `llmBaseURL`：`https://gateway.example.com/llm`
- `passthroughBaseURL`：`https://gateway.example.com/model`

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

## 多模态任务 API

多模态任务请求统一使用 `input[0].params` 承载模型字段。不同模型的 `params` 结构可能不同：有些模型需要 `input` / `parameters` 两层，有些模型直接把模型字段平铺在 `params` 下。

`moderation` 为可选布尔字段：`true` 表示开白，`false` 表示非开白。

### 创建任务

```js
const task = await client.modal.create({
  moderation: true,
  model: 'alibaba_wanx26_i2v_flash',
  input: [
    {
      params: {
        input: {
          img_url: 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg',
          prompt: '小狗和女孩在秋天的公园里快乐地玩耍',
        },
        parameters: {
          resolution: '720P',
          duration: 5,
          prompt_extend: true,
          watermark: false,
        },
      },
    },
  ],
});

console.log(task.id, task.status);
```

### 预扣费查询

预扣费查询路由为 `/model/v1/generation/precharge`，请求参数与创建任务相同。

```js
const resp = await client.modal.precharge({
  id: 'd88pmute87128c73e9r0d0',
  model: 'volces_seedream_4_5',
  input: [{ params: { prompt: 'A dog' } }],
  moderation: false,
});

console.log(resp.status);
console.log(resp.data.billing_model, resp.data.cost, resp.data.currency);
```

成功响应示例：

```json
{
  "data": {
    "billing_model": "volces_seedream_4_5",
    "cost": "0.035714285714",
    "currency": "USD",
    "discount": 0.7,
    "hash": "v1:18a733f04d227d572950ed8f1f98a9ba4cd37c168c5c98c05a5e574984f58eaf",
    "model": "volces_seedream_4_5",
    "original_model": "volces_seedream_4_5",
    "sample_count": 4,
    "updated_at": 1780633394064
  },
  "status": "success"
}
```

未匹配上预扣费数据时，可能返回：

```json
{
  "data": {
    "cost": null,
    "hash": "v1:02833b68895eeb61bf214d35fd669502ef788e4c8d58505893414ae9632ca8ab",
    "model": "volces_seedream_4_5",
    "original_model": "volces_seedream_4_5",
    "reason": "COST_CACHE_MISS"
  },
  "status": "failed"
}
```

### Builder

```js
import { newTask } from 'sea_sdk_js';

const body = newTask('alibaba_wanx26_i2v_flash')
  .moderation(true)
  .params({
    input: {
      img_url: 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg',
      prompt: '小狗和女孩在秋天的公园里快乐地玩耍',
    },
    parameters: {
      resolution: '720P',
      duration: 5,
      prompt_extend: true,
      watermark: false,
    },
  })
  .metadata('trace_id', 'trace-123')
  .build();

const task = await client.modal.create(body);
```

模型字段平铺在 `params` 下的示例：

```js
const body = newTask('grok_imagine_image')
  .field('dash_scope', true)
  .moderation(true)
  .params({
    aspect_ratio: '1:2',
    prompt: 'Lego art version of Superman and Batman，Night scene',
    n: 1,
    resolution: '1k',
  })
  .build();
```

Go 风格别名也可用：

```js
const task = await client.Modal.Create(body);
const preview = await client.Modal.Precharge(body);
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

## 大语言模型 API

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

## 厂商透传 API

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
