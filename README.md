# ✨ ZodGPT

[![test](https://github.com/dzhng/zod-gpt/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/dzhng/zod-gpt/actions/workflows/test.yml)

Get structured, fully typed JSON outputs from OpenAI's new 0613 models via functions.

- [Introduction](#-introduction)
- [Usage](#-usage)
  - [Install](#install)
  - [Request](#request)
  - [Auto healing](#-auto-healing)
  - [Text Slicing](#-text-slicing)
- [Debugging](#-debugging)
- [Azure](#-azure)
- [API Reference](#-api-reference)

## 👋 Introduction

ZodGPT is a library for

- Receiving structured outputs from models with complete type safety. All responses are fully validated & typed, works with [zod](https://github.com/colinhacks/zod) as a peer dep.
- Schema definition, serialization / parsing, and **automatically asking the model to correct outputs**.
- Handle rate limit and any other API errors as gracefully as possible (e.g. exponential backoff for rate-limit).

With ZodGPT, you can simply query OpenAI's ChatGPT model like so:

```typescript
import { OpenAI, request } from 'zod-gpt';

const model = new OpenAI({ apiKey: 'YOUR_OPENAI_KEY' });

const response = await request(model, 'Generate a startup idea', {
  schema: z.object({
    name: z.string().describe('The name of the startup'),
    description: z.string().describe('What does this startup do?'),
  }),
});

// data will be typed as { name: string; description: string }
console.log(response.data);
```

## 🔨 Usage

### Install

This package is hosted on npm:

```
npm i zod-gpt
```

```
yarn add zod-gpt
```

To setup in your codebase, initialize a new instance with the model you want (only `OpenAI` is suported for now). Note that you can also add default model and chat config (like temperature, timeouts, retries) when initializing. These are just defaults, and can always be overwritten later on a per-chat or per-request basis.

```typescript
import { OpenAI } from 'zod-gpt';

const model = new OpenAI(
  { apiKey: 'YOUR_OPENAI_KEY' },
  { model: 'gpt-4-0613' },
);
```

### Request

To send a standard completion request with a given model, simply call the `request` method.

```typescript
const response = await requset(model, 'hello');

// data will be typed as string
console.log(response.data);
```

To add schema parsing and typing, simply add a `schema` key in the options argument.

```typescript
const response = await request(
  model,
  'Generate a step by step plan on how to run a hackathon',
  {
    schema: z.object({
      plan: z.array(
        z.object({
          reason: z.string().describe('Name the reasoning for this step'),
          id: z.string().describe('Unique step id'),
          task: z
            .string()
            .describe('What is the task to be done for this step?'),
        }),
      ),
    }),
  },
);

// data will be typed as { plan: { reason: string; id: string; task: string }[] }
console.info('Response:', response.data);
```

NOTE: the `schema` key ONLY takes object type schemas - this is a limitation of the `functions` API. If you need to generate arrays or other type of reponses, simply wrap them in an object like the above example.

### 🧑‍⚕️ Auto Healing

By default, ZodGPT has a reflection based logic to automatically detect and heal any schema errors (e.g. if the function api is not being used correctly, if the schema has parse errors.. etc). This means whenever these types of errors happen, ZodGPT will send a new message to re-ask the model to correct its own output, together with any error messages it gathered from parsing.

The logic is simple but incredabily powerful, and adds a layer of reliability model outputs. I suggest leaving this flag set to true (its default setting), unless if token usage or response time is a blocking issue.

### 📃 Text Slicing

A common error with LLM APIs is token usage - you are only allowed to fit a certain amount of data in the context window. In the case of ZodGPT, this means you are limited in the length of the content of the messages.

If you set a `contextSize` key, ZodGPT will automatically determine if the request will breach the token limit BEFORE sending the actual request to the model provider (e.g. OpenAI). This will save one network round-trip call and let you handle these type of errors in a responsive manner.

```typescript
const model = new OpenAI(
  { apiKey: 'YOUR_OPENAI_KEY' },
  { model: 'gpt-4-0613' },
);

try {
  const res = await request(...);
} catch (e) {
  if (e instanceof TokenError) {
    // handle token errors...
  }
}
```

A common way to handle token limit issues is to split your content. ZodGPT provides an `autoSlice` option to automatically split your text when a token overflow error is detected. It's smart enough to only split your text if it determines that it is above the token limit, and will try to preserve as much of the original text as possible.

```typescript
const response = await request(model, 'hello world, testing overflow logic', {
  // make sure `contextSize` is set when this flag is enabled
  autoSlice: true,
});
```

## 🤓 Debugging

ZodGPT usese the `debug` module for logging & error messages. To run in debug mode, set the `DEBUG` env variable:

`DEBUG=zodgpt:* yarn playground`

You can also specify different logging types via:

`DEBUG=zodgpt:error yarn playground`
`DEBUG=zodgpt:log yarn playground`

## 🔷 Azure

ZodGPT also comes with support for Azure's OpenAI models. The Azure version is usually much faster and more reliable than OpenAI's own API endpoints. In order to use the Azure endpoints, you must include 2 Azure specific options when initializing the OpenAI model, `azureDeployment` and `azureEndpoint`. The `apiKey` field will also now be used for the Azure API key.

You can find the Azure API key and endpoint in the [Azure Portal](https://portal.azure.com/). The Azure Deployment must be created under the [Azure AI Portal](https://oai.azure.com/).

Note that the `model` parameter in `ModelConfig` will be ignored when using Azure. This is because in the Azure system, the `model` is selected on deployment creation, not on run time.

```typescript
const model = new OpenAI({
  apiKey: 'AZURE_OPENAI_KEY',
  azureDeployment: 'AZURE_DEPLOYMENT_NAME',
  azureEndpoint: 'AZURE_ENDPOINT',
});
```

## ✅ API Reference

### Model

The only model ZodGPT supports currently is OpenAI's chat based models.

```typescript
const model = new OpenAI(openAiConfig, modelConfig);
```

#### OpenAI Config

```typescript
interface OpenAIConfig {
  apiKey: string;
}
```

#### Model Config

These model config map to OpenAI's config directly, see doc:
https://platform.openai.com/docs/api-reference/chat/create

```typescript
interface ModelConfig {
  model?: string;
  contextSize?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string | string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  logitBias?: Record<string, number>;
  user?: string;
}
```

#### Request

To send a request to a chat session:

```typescript
const res: Response = await request(model, prompt, options: RequestOptions);
```

**options**
You can override the default request options via this parameter. A request will automatically be retried if there is a ratelimit or server error.

```typescript
type RequestOptions = {
  // set a zod schema to enable JSON output
  schema?: T;

  // set to enable automatically slicing the prompt on token overflow. prompt will be sliced starting from the last character
  // default: false
  autoSlice?: boolean;

  // attempt to auto heal the output via reflection
  // default: true
  autoHeal?: boolean;

  // the number of time to retry this request due to rate limit or recoverable API errors
  // default: 3
  retries?: number;
  // default: 30s
  retryInterval?: number;
  // default: 60s
  timeout?: number;

  // the minimum amount of tokens to allocate for the response. if the request is predicted to not have enough tokens, it will automatically throw a 'TokenError' without sending the request
  // default: 200
  minimumResponseTokens?: number;
};
```

#### Response

Chat responses are in the following format:

```typescript
interface Response<T extends z.ZodType> {
  // parsed and typecasted data from the model
  data: z.infer<T>;

  // raw response from the completion API
  content?: string;
  name?: string;
  arguments?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### Misc

Note that if you want to bypass ZodGPT's request management logic, and send a request to the underlaying model directly, you can call the `request` method directly on the model. This will bypass the automatic schema and function definition logic, and let you work with the vanilla OpenAI completion API, while still retaining the logic of ratelimiting & timeout retries.

```typescript
const model = new OpenAI(openAiConfig, modelConfig);
const res = await model.request(message: string, options: ModelRequestOptions);
```

#### Text Splitting

If you need to split long text into multiple chunks before calling the llm, few text splitters are also exported in `text-spitter.ts`. Try to default to `RecursiveTextSplitter` unless if there is a specific reason to use the other text splitters, as it is the most widely used text splitter.
