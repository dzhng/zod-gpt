# ✨ ZodGPT

[![test](https://github.com/dzhng/zod-gpt/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/dzhng/zod-gpt/actions/workflows/test.yml)

Get structured, fully typed, and validated JSON outputs from OpenAI and Anthropic models.

Under the hood, `zod-gpt` uses functions to coerce the model to always respond as function calls. Add self-reflection for reliability and zod for parsing & typing.

- [Introduction](#-introduction)
- [Usage](#-usage)
  - [Install](#install)
  - [Request](#request)
  - [Auto Healing](#-auto-healing)
  - [Text Slicing](#-text-slicing)
- [Debugging](#-debugging)
- [API Reference](#-api-reference)

## 👋 Introduction

ZodGPT is a library for

- Receiving structured outputs from models with complete type safety. All responses are fully validated & typed, works with [zod](https://github.com/colinhacks/zod) as a peer dep.
- Schema definition, serialization / parsing, and **automatically asking the model to correct outputs**.
- Handle rate limit and any other API errors as gracefully as possible (e.g. exponential backoff for rate-limit) via [llm-api](https://github.com/dzhng/llm-api).

With `zod-gpt`, you can simply query OpenAI's ChatGPT model like so:

```typescript
import { OpenAIChatApi } from 'llm-api';
import { completion } from 'zod-gpt';

const openai = new OpenAIChatApi({ apiKey: 'YOUR_OPENAI_KEY' });

const response = await completion(openai, 'Generate a startup idea', {
  schema: z.object({
    name: z.string().describe('The name of the startup'),
    description: z.string().describe('What does this startup do?'),
  }),
});

// data will be typed as { name: string; description: string }
console.log(response.data);
```

Anthropic is also supported via `llm-api`:

```typescript
import { AnthropicChatApi } from 'llm-api';
import { completion } from 'zod-gpt';

const client = new AnthropicChatApi({ apiKey: 'YOUR_ANTHROPIC_KEY' });
const response = await completion(client, ...);
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

To setup in your codebase, initialize a new instance with the model you want via the `llm-api` peer dep. Note that `zod-gpt` is designed to work with any models that implements the `CompletionApi` interface, so you can also import your own API wrapper.

```typescript
import { OpenAIChatApi } from 'llm-api';

const openai = new OpenAIChatApi(
  { apiKey: 'YOUR_OPENAI_KEY' },
  { model: 'gpt-4-0613' },
);
```

### Request

To send a standard completion request with a given model, simply call the `completion` method.

```typescript
const response = await completion(openai, 'hello');

// data will be typed as string
console.log(response.data);
```

To add schema parsing and typing, simply add a `schema` key in the options argument. **Make sure to add a description to each key via the `describe` method.** The descriptions will be fed into the model to ensure that it understand exactly what data is requested for each key. Try to error on the side of being over descriptive to ensure the model understands exactly.

```typescript
const response = await completion(
  openai,
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

By default, `zod-gpt` has logic to automatically detect and heal any schema errors via self-reflection (e.g. if the function api is not being used correctly, if the schema has parse errors.. etc). This means whenever these types of errors happen, `zod-gpt` will send a new message to re-ask the model to correct its own output, together with any error messages it gathered from parsing.

The logic is simple but incredabily powerful, and adds a layer of reliability to model outputs. I suggest leaving this flag set to true (its default setting), unless if token usage or response time becomes a real issue.

### 📃 Text Slicing

A common way to handle token limit issues is to split your content. `zod-gpt` provides an `autoSlice` option to automatically split your text when a token overflow error from `llm-api` is detected. It's smart enough to only split your text if it determines that it is above the token limit, and will try to preserve as much of the original text as possible.

```typescript
const openai = new OpenAIChatApi(
  { apiKey: 'YOUR_OPENAI_KEY' },
  // make sure `contextSize` is set to enable throwing TokenErrors
  { model: 'gpt-4-0613', contextSize: 8129 },
);

const response = await completion(
  openai,
  'hello world, testing overflow logic',
  { autoSlice: true },
);
```

## 🤓 Debugging

`zod-gpt` uses the `debug` module for logging & error messages. To run in debug mode, set the `DEBUG` env variable:

`DEBUG=zod-gpt:* yarn playground`

You can also specify different logging types via:

`DEBUG=zod-gpt:error yarn playground`
`DEBUG=zod-gpt:log yarn playground`

## ✅ API Reference

### LLM Provider Support

`zod-gpt` currently users the [llm-api](https://github.com/dzhng/llm-api) library to support multiple LLM providers. Check the `llm-api` documentation on how to configure model parameters.

#### Completion

To send a completion request to a model:

```typescript
const res: Response = await completion(model, prompt, options: RequestOptions);
```

**options**
You can override the default request options via this parameter. The `RequestOptions` object extends the request options defined in `llm-api`.

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

  // set message history, useful if you want to continue an existing conversation
  messageHistory?: ChatRequestMessage[];

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

Completion responses extends the model responses from `llm-api`, specifically adding a `data` field for the pased JSON that's automatically typed according to the input `zod` schema.

```typescript
interface Response<T extends z.ZodType> {
  // parsed and typecasted data from the model
  data: z.infer<T>;

  // raw response from the completion API
  content?: string;
  name?: string;
  arguments?: JsonValue;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### Misc

#### Text Splitting

If you need to split long text into multiple chunks before calling the llm, few text splitters are also exported in `text-spitter.ts`. Try to default to `RecursiveTextSplitter` unless if there is a specific reason to use the other text splitters, as it is the most widely used text splitter.
