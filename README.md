# Sea JavaScript SDK

> Beta：SDK API 和 Sea gateway 行为仍可能随网关版本调整。

Sea AI 网关的 Node.js SDK，用于通过统一网关调用多模态、LLM 和厂商透传能力。

特点：

- ESM-only，要求 Node.js 18 或以上版本
- 保留原始请求透传能力
- 支持 SSE 流式响应解析
- 支持任务轮询和通用 task builder

## 功能导航

| 服务 | Client 字段 | 功能 |
|------|-------------|------|
| [多模态 API](#多模态-api) | `client.modal` / `client.Modal` | 模型列表、参数详情、生成任务、预扣费查询和厂商透传 |
| [图片/视频鉴黄](#图片视频鉴黄) | `client.modal.scanImage(...)` | 检测图片、GIF 或视频内容安全风险 |
| [敏感词检测](#敏感词检测) | `client.modal.scanText(...)` | 检测文本敏感词和组合词风险 |
| [人脸检测](#人脸检测) | `client.modal.scanFace(...)` | 检测图片或视频中的人脸相关结果 |
| [音频检测](#音频检测) | `client.modal.scanAudio(...)` | 检测音频内容风险 |
| [LLM API](#llm-api) | `client.llm` / `client.LLM` | OpenAI / Anthropic / Responses / Embeddings / Rerank 等兼容接口 |

## 安装

从 GitHub 安装最新代码：

```bash
npm install https://github.com/SeaArt-Infra/sea_sdk_js.git
```

发布到 npm 后，也可以通过包名安装：

```bash
npm install sea_sdk_js
```

要求：

- Node.js 18+
- ESM 项目

## 初始化

```js
import { Client } from 'sea_sdk_js';

const client = new Client({
  apiKey: 'sa-your-api-key',
});
```

通过 `baseURL` 配置统一网关地址，SDK 会基于该地址调用多模态、LLM 和透传等能力。

```js
const client = new Client({
  apiKey: 'sa-your-api-key',
  baseURL: 'https://gateway.example.com',
  timeout: 60_000,
  project: 'my-project',
});
```

## 多模态 API

### 模型列表和参数详情

```js
const models = await client.modal.listModels({
  query: '',
  limit: 2,
});
for (const hit of models.hits ?? []) {
  console.log(hit.name);
}

const skill = await client.modal.getModelSkill('alibaba_animate_anyone_detect');
console.log(skill);
```

`listModels` / `searchModels` 支持的查询参数：

- `query` -> `q`
- `input` -> `input`
- `output` -> `output`
- `type` -> `type`
- `provider` -> `provider`
- `limit` -> `limit`

### 生成任务

创建任务有两种常用方式：直接传入原始请求 object，或使用 `newTask` typed helper 构造请求体。两种方式最终都会调用 `client.modal.create(...)`。

**方式一：直接传入原始请求 object**

```js
import { withHeader } from 'sea_sdk_js';

const task = await client.modal.create(
  {
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
  },
  withHeader('X-Trace-Id', 'trace-123'),
);

console.log(task.id, task.status);
```

`moderation` 为布尔类型，非必传；`true` 表示开白，`false` 表示非开白。`params` 为模型参数，具体结构由模型定义决定。

**方式二：使用 Typed helper 构造请求体**

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

**轮询结果**

```js
import {
  withPollInterval,
  withPollTimeout,
} from 'sea_sdk_js';

const task = await client.modal.wait(
  'task_abc123',
  withPollInterval(3000),
  withPollTimeout(300_000),
);

console.log(task.status, task.progress, task.urls());
```

也可以在创建后继续等待：

```js
const task = await client.modal.create({ model: 'alibaba_wanx26_i2v_flash' });
const done = await task.wait(withPollInterval(5000));
```

为了兼容 Go 风格命名，也提供大写别名：

```js
const task = await client.Modal.Create(body);
```

### 预扣费查询

预扣费查询请求参数与创建任务相同，可用于提前预估费用。支持两种常用方式：直接传入原始请求 object，或使用 `newTask` typed helper 构造请求体。

**方式一：直接传入原始请求 object**

```js
const resp = await client.modal.precharge({
  id: 'd88pmute87128c73e9r0d0',
  model: 'volces_seedream_4_5',
  input: [
    {
      params: {
        prompt: 'A dog',
      },
    },
  ],
  moderation: false,
});

console.log(resp.status);
console.log(resp.data.billing_model, resp.data.cost, resp.data.currency);
```

**方式二：使用 Typed helper 构造请求体**

```js
const body = newTask('volces_seedream_4_5')
  .moderation(false)
  .field('id', 'd88pmute87128c73e9r0d0')
  .params({ prompt: 'A dog' })
  .build();

const resp = await client.modal.precharge(body);

console.log(resp.status);
console.log(resp.data.billing_model, resp.data.cost, resp.data.currency);
```

**响应示例**

```json
{
  "status": "success",
  "data": {
    "model": "volces_seedream_4_5",
    "original_model": "volces_seedream_4_5",
    "billing_model": "volces_seedream_4_5",
    "sample_count": 1,
    "cost": "0.2",
    "currency": "credit",
    "discount": 1,
    "hash": "example-hash",
    "updated_at": 1710000000
  }
}
```

### Passthrough API（厂商透传）

Passthrough 层保留厂商原始 API 形态。路径需要带厂商前缀，例如 `/kling/...`、`/vidu/...`、`/google/...`。

**方式一：JSON object 请求**

```js
const resp = await client.passthrough.post(
  '/kling/v1/videos/text2video',
  {
    model_name: 'kling-v1',
    prompt: 'cinematic shot',
  },
  withHeader('X-Trace-Id', 'trace-123'),
);

console.log(resp.statusCode, await resp.text());
```

**方式二：原始字节透传**

```js
const body = new TextEncoder().encode('{"contents":[{"parts":[{"text":"paint a cat"}]}]}');

const resp = await client.passthrough.requestRaw(
  'POST',
  '/google/v1beta/models/gemini-2.5-flash-image:generateContent',
  body,
);

console.log(resp.statusCode, await resp.text());
```

当前提供：

- `request`
- `requestRaw`
- `get`
- `post`
- `put`
- `delete`

## 图片/视频鉴黄

图片/视频鉴黄接口对应 `POST /v1/image/scan`，用于对图片、GIF 或视频内容进行安全风险检测。调用时需要提供待检测媒体 URL，并通过 `risk_types` 指定需要检测的风险类型。

```js
import {
  ImageScanRiskTypeChild,
  ImageScanRiskTypeErotic,
  ImageScanRiskTypePolity,
  ImageScanRiskTypeViolent,
} from 'sea_sdk_js';

const result = await client.modal.scanImage({
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

console.log(result.ok, result.nsfw_level, result.risk_types);
```

也支持视频检测：

```js
const result = await client.modal.scanImage({
  uri: 'https://example.com/video.mp4',
  risk_types: [ImageScanRiskTypeErotic, ImageScanRiskTypeViolent],
  is_video: 1,
  duration: 12.5,
});
```

**审核通过响应示例**

```json
{
  "label_items": [],
  "risk_types": [],
  "usage": {
    "cost": "0.1"
  },
  "ok": true,
  "nsfw_level": 0
}
```

**命中风险响应示例**

```json
{
  "nsfw_level": 5,
  "label_items": [
    {
      "name": "erotic_sexual_body",
      "score": 98,
      "risk_type": "EROTIC"
    }
  ],
  "risk_types": ["EROTIC"],
  "usage": {
    "cost": "0.1"
  },
  "ok": false
}
```

## 敏感词检测

敏感词检测接口对应 `POST /v1/text/scan`，用于检测输入文本中的敏感词、组合词和风险命中结果。

```js
const result = await client.modal.scanText({
  text: 'a cute cat sitting on the sofa',
  scene: 1,
  area_types: [2],
  way: 0,
});

console.log(result.data.is_sensitive);
console.log(result.data.sensitive_words);
console.log(result.extra);
```

**审核通过响应示例**

```json
{
  "usage": {
    "cost": "1"
  },
  "data": {
    "sensitive_words": [],
    "combination": null,
    "is_sensitive": false
  },
  "status": {
    "msg": "success",
    "request_id": "b5ebfb02a9d11adf98b05b397bd82e9e",
    "code": 10000
  }
}
```

## 人脸检测

人脸检测接口对应 `POST /v1/face/scan`，用于检测图片或视频中的人脸相关结果。调用时可以传入媒体 URL，也可以传入图片 base64 内容。

```js
const result = await client.modal.scanFace({
  uri: 'https://example.com/image.jpg',
  is_video: 0,
  scene: 'avatar',
});

console.log(result.ok, result.usage);
console.log(result.extra);
```

**响应字段**

| 字段 | 类型 | 说明 |
|------|------|------|
| `ok` | `boolean` | 检测请求是否成功完成 |
| `error` | `string` | 上游业务错误信息；成功时通常为空 |
| `usage` | `object` | 网关注入的计费信息 |
| `extra` | `object` | 上游返回的未建模字段，例如人脸数量等 |

**未检测到人脸响应示例（SDK 返回结构）**

```json
{
  "ok": true,
  "error": "",
  "usage": {
    "cost": "1"
  },
  "extra": {
    "face_count": 0
  }
}
```

**检测到人脸响应示例（SDK 返回结构）**

```json
{
  "ok": true,
  "error": "",
  "usage": {
    "cost": "0.002"
  },
  "extra": {
    "face_count": 1
  }
}
```

## 音频检测

音频检测接口对应 `POST /v1/audio/scan`，用于检测音频内容风险。调用时需要提供可访问的音频 URL，`duration` 用于计费和统计。

```js
const result = await client.modal.scanAudio({
  uri: 'https://example.com/audio/test.mp3',
  rec_type: 'AUDIOPOLITICAL_MOAN_ANTHEN',
  duration: 15,
});

console.log(result.riskLevel, result.allLabels);
console.log(result.extra);
```

**审核通过响应示例**

```json
{
  "code": 1100,
  "message": "成功",
  "requestId": "a63b89046c70435a4fb9a0d36439d0ee",
  "btId": "https://example.com/audio/sample.mp3",
  "detail": {
    "audioDetail": [],
    "audioTags": {},
    "audioText": "示例音频转写文本",
    "audioTime": 4,
    "code": 1100,
    "requestParams": {},
    "riskLevel": "PASS"
  }
}
```

## LLM API

非流式 LLM 方法返回原始 JSON 字符串，使用 `decode(raw)` 反序列化：

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

当前支持的方法：

| 方法 | 说明 |
|------|------|
| `chatCompletions` | 调用 OpenAI Chat Completions 兼容接口，返回原始 JSON 字符串 |
| `chatCompletionsStream` | 调用 Chat Completions 流式接口，返回可异步迭代的 SSE 流式事件 |
| `messages` | 调用 Anthropic Messages 兼容接口，返回原始 JSON 字符串 |
| `messagesStream` | 调用 Messages 流式接口，返回可异步迭代的 SSE 流式事件 |
| `responses` | 调用 OpenAI Responses 兼容接口，返回原始 JSON 字符串 |
| `responsesStream` | 调用 Responses 流式接口，返回可异步迭代的 SSE 流式事件 |
| `rerank` | 调用文本重排接口 |
| `embeddings` | 调用向量生成接口 |
| `listModels` | 查询 LLM 模型列表 |

流式方法返回可异步迭代的 SSE 流式事件：

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

Responses 或 Messages 流式响应可以使用文本拼接 helper：

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
