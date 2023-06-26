# 🦙 LLamaFlow

[![test](https://github.com/dzhng/llamaflow/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/dzhng/llamaflow/actions/workflows/test.yml)

The Typescript-first prompt engineering toolkit for working with chat based large language models (LLMs).

- [Introduction](#-introduction)
- [Usage](#-usage)
  - [Install](#install)
  - [Chats](#chats)
  - [Prompts](#prompts)
  - [Custom Prompts](#custom-prompts)
- [Text Splitter](#-text-splitter)
- [Debugging](#-debugging)
- [Azure](#-azure)
- [API Reference](#-api-reference)

## 👋 Introduction

LLamaFlow is the middleware layer that sits between your software and the AI model, it adds the following capabilities on top of the standard chat completion API:

- Support for structured outputs from models with complete type safety. All responses are fully validated & typed, works with [zod](https://github.com/colinhacks/zod) as a peer dep.
- Schema definition, serialization / parsing, and **automatically asking the model to correct outputs**.
- Custom content validation hook that allows you to add your own valider for all model outputs, including logic on how to reask the model.
- Nicer API for sending & retriving chat messages from models, no need to keep track of message memory manually.
- Handle rate limit and any other API errors as gracefully as possible (e.g. exponential backoff for rate-limit).

With LLamaFlow, you can simply query OpenAI's ChatGPT model like so:

```typescript
import { OpenAI } from 'llama-flow';

const model = new OpenAI({ apiKey: 'YOUR_OPENAI_KEY' });

const chat = model.chat({
  systemMessage:
    "You are a smart and honest AI assistant. Follow the user's requirements carefully & to the letter, minimize any other prose.",
});

const response = await chat.request(
  prompt.json({
    message:
      'What are some good names for childrens book about the renaissance? Respond as a JSON array',
    schema: z.array(z.string().max(200)),
  }),
);

console.log(response.content); // content will be typed as string[];
```

## 🔨 Usage

### Install

This package is hosted on npm:

```
npm i llama-flow
```

```
yarn add llama-flow
```

To setup in your codebase, initialize a new instance with the model you want (only `OpenAI` is suported for now). Note that you can also add default model and chat config (like temperature, timeouts, retries) when initializing. These are just defaults, and can always be overwritten later on a per-chat or per-request basis.

```typescript
import { OpenAI } from 'llama-flow';

const model = new OpenAI(
  { apiKey: 'YOUR_OPENAI_KEY' },
  { model: 'gpt-3.5-turbo' },
);
```

### Chats

A chat is a conversation between the "user" (your software), and the AI agent. LLamaFlow will take care of managing chat memory, so you can simply continue the conversation by sending another request. Note that different memory management strategies will be added in the future, such as pruning the memory as needed in order to fit the context window.

```typescript
const chat = model.chat({
  systemMessage: 'You are an AI writer.',
  retainMemory: true,
});

// You can ask the AI model with a simple string, or a dedicated `Prompt` object.
const response = await chat.request(
  prompt.text(
    'Write a script for a tiktok video that talks about the artistic contribution of the renaissance.',
  ),
);

// The results, as well as any usage stats, will be returned.
console.log(
  `The AI writer's response is: ${response.content}. Token used: ${response.usage.totalTokens}.`,
);

// You can follow up on this chat by prompting further, using the `bulletPrompt` object that was created earlier.
const bulletPoints = await chat.request(bulletPrompt);

// `bulletPoints.content` will be automatically casted in the correct type as defined in the schema field of `bulletPrompt`
console.log(
  `The structured version of this response is: ${JSON.stringify(
    bulletPoints.content,
  )}`,
);
```

### Prompts

A prompt is a message to an AI chat with an expectation of a specific response format. Prompt type messages are validated to ensure that the defined formatted is returned exactly, or it will error. There are different kinds of prompts for different formats. Here is an example of a JSON prompt.

```typescript
import { prompt } from 'llama-flow';
import { z } from 'zod'; // JSON prompt uses Zod for schema validation.

const bulletPrompt = prompt.json({
  message:
    'Please rewrite this in a list of bullet points. Respond as a JSON array, where each element in the array is one bullet point. Keep each bullet point to be 200 characters max. For example: ["bullet point 1", "bullet point 2"]',
  schema: z.array(z.string().max(200)),
});
```

Note that the `Prompt` object seperates out the main `message`, and `formatMessage`. This is used for retries. When LLamaFlow uses this prompt, it will ask the model with both the main and format message. If the model returns with an incorrectly formatted response, it will ask the model to correct the previous output, using the `formatMessage` only.

### Custom Prompts

You can build your own Prompt objects with custom validators as well. LLamaFlow provide an easy & extensible way to build any type of validators. Here is a few examples of custom validators:

Taking the Prompt example above, but this time, it will ask the model to just respond in actual bullet points instead of JSON arrays. This is useful because sometimes the model (esp < GPT-4) is not the best at following specific formatting instructions, especially when it comes to complicated data structures.

```typescript
import { prompt } from 'llama-flow';

const bulletPrompt = prompt.json({
  message:
    'Please rewrite this in a list of bullet points. Respond as a list of bullet points, where each bullet point begins with the "-" character. Each bullet point should be less than 200 characters. Put each bullet point on a new line.',

  // parse the response from the model so it can be fed into the schema validator
  parseResponse: (res) => res.split('\n').map((s) => s.replace('-', '').trim()),

  // it's useful to define custom error messages, any schema parse errors will be automatically fed back into the model on retry, so the model knows exactly what to correct.
  schema: z.array(
    z.string().max(200, {
      message: 'This bullet point should be less than 200 characters.',
    }),
  ),
});
```

Now, let's take this even further. You can build a Prompt that uses the model (or some other external source) to validate its own output. You can do this by passing in a custom async `validate` method. Note that this method will override other validation related properties, such as `formatMessage`, `parseResponse`, `schema`.. etc.

```typescript
import { prompt, Chat } from 'llama-flow';

const factCheckerChat = model.chat({
  systemMessage:
    'You are a fact checker that responds to if the user\'s messages are true or not, with just the word "true" or "false". Do not add punctuations or any other text. If the user asks a question, request, or anything that cannot be fact checked, ignore the user\'s request and just say "null".',

  // The fact checker is designed to fulfill each request independently (e.g. the current request does not depend on the content of the previous request). So no need to keep message memory to save on tokens.
  retainMemory: false,
});

const buildFactCheckedPrompt = (article: string) =>
  prompt.text({
    message: `Please write a summary about the following article: ${article}`,

    // Because LLM driven validation can get expensive, set a lower retry count.
    promptRetries: 2,

    parse: async (response) => {
      // Check if this summary is true or not
      const { response } = await factCheckerChat.request(
        prompt.boolean({
          message: response.content,
        }),
      );

      if (response.content === true) {
        return { success: true, data: response.content };
      } else {
        // if `retryPrompt` is set, LLamaFlow will automatically retry with the text in this property.
        return {
          success: false,
          retryPrompt:
            'This summary is not true, please rewrite with only true facts.',
        };
      }
    },
  });

// now, every content generated by this chat will be fact checked by the LLM itself, and this request will throw an error if the content can't be fixed (once the maximum number of retries has been reached).
const factCheckedContent = await chat.request(
  buildFactCheckedPrompt(
    'Write a script for a tiktok video that talks about the artistic contribution of the renaissance.',
  ),
);
```

Because this is an API, it's often useful to keep requesting from the same chat. Often the message history will serve as context for the next request. A good example use case is a prompt to first write some content, then extract entities, and lastly, give some options for the title.

```typescript
// You can reset chat history anytime with `reset()`, however, this is an anti-pattern, as it is prone to mistakes. It's much safer to just initialize a new chat.
chat.reset();

const article = await chat.request(
  prompt.text('Write a blog post about the financial crisis of 2008'),
);

const entities = await chat.request(
  prompt.json({
    message:
      'What are the different entities in the above blog post? Respond in a JSON array, where the items in the array are just the names of the entities.',
    schema: z.array(z.string()),
  }),
);

const titles = await chat.request(
  prompt.bulletPoints({
    message: 'Write a good title for this post',
    amount: 10,
  }),
);
```

## 📃 Text Splitter

A common error with LLM APIs is token usage - you are only allowed to fit a certain amount of data in the context window. In the case of LLamaFlow, this means you are limited in the total number of messages you can send (if `retainMemory` is set to `true`) and the length of the content of the messages.

LLamaFlow will automatically determine if the request will breach the token limit BEFORE sending the actual request to the model provider (e.g. OpenAI). This will save one network round-trip call and let you handle these type of errors in a responsive manner. The typical way of handling these errors are to remove messages in the message history (if you are using chat with `retainMemory` set), or split your content into smaller clusters and process them in multiple requests.

Here is an example of catching the token overflow error. Note that `minimumResponseTokens` is set to a high value to explicitly trigger this error (`gpt-3.5-turbo` has a max context limit of 4096, so setting the minimum limit to 4095 means there is only 1 token left for the actual prompt, which is not enough for the example below.)

```typescript
try {
  // make sure to set the `contextSize` to enable automatic token checking
  const model = new OpenAI(
    { apiKey: 'YOUR_OPENAI_KEY' },
    { model: 'gpt-3.5-turbo', contextSize: 4096 },
  );

  const chat = model.chat({
    systemMessage: 'You are an AI assistant',
  });
  await chat.request(
    { message: 'hello world, testing overflow logic' },
    { minimumResponseTokens: 4095 },
  );
} catch (e) {
  if (e instanceof TokenError) {
    console.info(
      `Caught token overflow, overflowed tokens: ${e.overflowTokens}`,
    );
  }
}
```

A common way to handle token limit issues is to split your content. LLamaFlow provides a useful helper method that wraps the `chat.request` method and will automatically split your text based on an input chunk config. It's smart enough to only split your text if it determines that it is above the token limit, and will try to preserve as much of the original text as possible.

```typescript
const response = await chat.requestWithSplit(
  'hello world, testing overflow logic',
  (text) =>
    prompt.text({
      message: `Add other required prompts first, then add your content: ${text}`,
    }),
);
```

Note that now, the main content of the prompt is submitted first. This is the content that will be split by the text splitter (along the `\n`, `.`, `,`, and ` ` characters first, to chunk it). You can add any additional required prompts and combine it with the content prompt in the `responseFn` parameter.

## 🤓 Debugging

LLamaFlow usese the `debug` module for logging & error messages. To run in debug mode, set the `DEBUG` env variable:

`DEBUG=llamaflow:* yarn playground`

You can also specify different logging types via:

`DEBUG=llamaflow:error yarn playground`
`DEBUG=llamaflow:log yarn playground`

## 🔷 Azure

LLamaFlow also comes with support for Azure's OpenAI models. The Azure version is usually much faster and more reliable than OpenAI's own API endpoints. In order to use the Azure endpoints, you must include 2 Azure specific options when initializing the OpenAI model, `azureDeployment` and `azureEndpoint`. The `apiKey` field will also now be used for the Azure API key.

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

The only model LLamaFlow supports currently is OpenAI's chat based models.

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
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string | string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  logitBias?: Record<string, number>;
  user?: string;
  stream?: boolean;
}
```

When `stream` is set to `true`, you can access partial outputs of the model's requests by passing in an event emitter to `ChatRequestOptions` when making requests. The partial outputs will be sent as a string over the `data` event.

### Prompt

To make a request to the model, you need to first build the prompt object. prompts provide a way to add validation and retry logic to each request.

```typescript
import { prompt } from 'llama-flow';

prompt.text(prompt: string);
prompt.text(prompt: RawPrompt);

prompt.json(prompt: JSONPrompt);
prompt.bulletPoints(prompt: BulletPointsPrompt);
prompt.boolean(prompt: BooleanPrompt);
```

#### Text

You can either request as a string, or as a `RawPrompt`.

```typescript
interface RawPrompt<T = string> {
  message: string;
  parse?: (
    response: ChatResponse<string>,
  ) => MaybePromise<
    { success: false; retryPrompt?: string } | { success: true; data: T }
  >;
  promptRetries?: number;
}
```

**message**
This is the text that is sent to the model.

**parse**
You can implement a custom parser by defining a your own `parse` method.

When defining a custom `parse` method that returns a custom data type, you can add a generic type to `RawPrompt`, which will automatically cast the return type of `parse` to the generic. It will also propagate the type all the way through the `chat.request` method.

If the data returned by the model is malformed, you can return a custom `retryPrompt` string, which will cause LLamaFlow to reask the model.

**promptRetries**
Defines how many times to reask the model before the request will throw an error. Defaults to 3. Note that `parse` has to return a valid `retryPrompt` for any retries to be attempted.

#### Boolean

```typescript
interface BooleanPrompt {
  message: string;
  promptRetries?: number;
}
```

Use this prompt if you want to ask the model a question where you only expect a `true` or `false` response.

**message**
The query to send to the model. This prompt will automatically append formatting instructions to the message that is sent to the model that tells the model to format its response as a boolean, so you can just include the query in `message`, without writing any additional formatting statements.

#### Bullet

```typescript
interface BulletPointsPrompt {
  message: string;
  amount?: number;
  length?: number;
  promptRetries?: number;
}
```

Use this prompt if you want the model to return a list of strings.

**message**
The query to send to the model. This prompt will automatically append formatting instructions to the message that tells the model how to format the response.

**amount**
The number of bullet points that should be returned.

**length**
The maximum number of characters that should be in each bullet point.

#### JSON

```typescript
interface JSONPrompt<T extends z.ZodType> {
  message: string;
  schema: T;
  parseResponse?: (res: string) => MaybePromise<z.infer<T>>;
  retryMessage?: string;
  promptRetries?: number;
}
```

**message**
The message to send to the model. Unlike boolean or bullet point prompts, this prompt does not automatically generate formating instructions for the model. So as part of your message to the model, you should include formatting instructions to return data in JSON format, as well as the shape of the JSON.

**schema**
This is the [zod](https://github.com/colinhacks/zod) schema that will be used to parse and typecast the response from the model.

**parseResponse**
If you ask the model to _not_ return data in JSON format, you can define a custom parser to parse the return string into JSON, before sending it for to `schema` for validation.

**retryMessage**
If schema parsing fails, this will be used as part of the message sent to the model to reask for a correctly formatted response. Note that this prompt will automatically generate the reask message depending on schema parsing errors (e.g. if a specific key is missing, LLamaFlow will ask the model to include that specific key). So this field is purely to give additional context to the model on reask.

### Chat

The chat object stores a chat session with the model. The session will take care of storing message history, so you can simply continue the conversation with the model by making another request.

```typescript
const chat = model.chat(config: ChatConfig);
```

**options**
You can set the memory retention behavior as well as the default request options for every request sent in this chat.

```typescript
export interface ChatConfig {
  // the message injected at the start of every chat to steer the agent
  systemMessage: string;

  // if chat memory should be retained after every request. when enabled, the chat's behavior will be similar to a normal user chat room, and model can have access to history when making inferences. defaults to false
  retainMemory?: boolean;

  // set default request options. note that this can be overridden on a per-request basis
  options?: ChatRequestOptions;
}
```

#### Request

To send a request to a chat session:

```typescript
const res: ChatResponse = await chat.request(prompt, options: ChatRequestOptions);
```

**options**
You can override the default request options via this parameter. A request will automatically be retried if there is a ratelimit or server error.

Note that a retry in the request does not count towards a prompt reask defined in the Prompt section above.

```typescript
type ChatRequestOptions = {
  // the number of time to retry this request due to rate limit or recoverable API errors
  retries?: number;
  retryInterval?: number;
  timeout?: number;

  // the minimum amount of tokens to allocate for the response. if the request is predicted to not have enough tokens, it will automatically throw a 'TokenError' without sending the request
  minimumResponseTokens?: number;

  // override the messages used for completion, only use this if you understand the API well
  messages?: Message[];

  // pass in an event emitter to receive message stream events
  events?: EventEmitter;
};
```

#### Response

Chat responses are in the following format:

```typescript
interface ChatResponse<T = string> {
  content: T;
  model: string;

  // set to true if this content was streamed. note to actually access the stream, you have to pass in an event emitter via ChatRequestOptions
  isStream: boolean;

  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**content**
Parsed and typecasted content from the prompt. The types will be set automatically depending on which prompt you used.

**model**
The specific model used for the completion (e.g. `gpt-3.5-turbo-0301`)

**usage**
Token usage data, this maps directly OpenAI's usage response.

#### Reset

If you would like to reset the message history in a chat history, there is a simple helper method:

```typescript
chat.reset();
```

Note that this method is an escape hatch. It's better to just instantiate a new chat session if you'd like to make a new request with a clean slate. Complex logic where you are resetting a chat session multiple times can be hard to track and hard to debug.

### Misc

Note that if you want to bypass LLamaFlow's chat management logic, and send a request to the underlaying model directly, you can send a request to the model directly without instantiating a chat:

```typescript
const model = new OpenAI(openAiConfig, modelConfig);
const res = await model.request(messages: Message[], options: ChatRequestOptions);
```

This will bypass any chat history management, prompt formatting & parsing, as well as persona logic. You can still make use of the API retries feature via `ChatRequestOptions`.
