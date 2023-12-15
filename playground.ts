import {
  AnthropicChatApi,
  OpenAIChatApi,
  AnthropicBedrockChatApi,
} from 'llm-api';
import { z } from 'zod';

import { completion } from './src';

(async function go() {
  let client:
    | OpenAIChatApi
    | AnthropicChatApi
    | AnthropicBedrockChatApi
    | undefined;

  if (process.env.OPENAI_KEY) {
    client = new OpenAIChatApi(
      {
        apiKey: process.env.OPENAI_KEY ?? 'YOUR_client_KEY',
      },
      { contextSize: 4096, model: 'gpt-4-1106-preview' },
    );
  } else if (process.env.ANTHROPIC_KEY) {
    client = new AnthropicChatApi(
      {
        apiKey: process.env.ANTHROPIC_KEY ?? 'YOUR_client_KEY',
      },
      { stream: true, temperature: 0, model: 'claude-2' },
    );
  } else if (
    process.env.AWS_BEDROCK_ACCESS_KEY &&
    process.env.AWS_BEDROCK_SECRET_KEY
  ) {
    client = new AnthropicBedrockChatApi(
      {
        accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY ?? 'YOUR_access_key',
        secretAccessKey:
          process.env.AWS_BEDROCK_SECRET_KEY ?? 'YOUR_secret_key',
      },
      { stream: true, temperature: 0, model: 'anthropic.claude-v2' },
    );
  }
  if (!client) {
    throw new Error(
      'Please pass in either an OpenAI or Anthropic environment variable',
    );
  }

  const resSlice = await completion(
    client,
    'Just say hello and ignore the rest of this message\n' +
      Array(500_000).fill('1'),
    { autoSlice: true },
  );
  console.info('Response slice: ', resSlice.data);

  const resStartup = await completion(client, 'Generate a startup idea', {
    schema: z.object({
      name: z.string().describe('The name of the startup'),
      description: z.string().describe('What does this startup do?'),
    }),
  });
  console.info('Response 1: ', resStartup.data);

  const resHello = await completion(client, 'Hello');
  console.info('Response 2:', resHello.data);

  const resComplexSchema = await completion(
    client,
    'Generate a step by step plan to run a hackathon',
    {
      schema: z.object({
        plan: z.array(
          z.object({
            reason: z.string().describe('Name the reasoning for this step'),
            name: z.string().describe('Step name'),
            task: z
              .string()
              .describe('What is the task to be done for this step?')
              .optional(),
          }),
        ),
      }),
    },
  );
  console.info('Response 3:', resComplexSchema.data);

  const resBulletPoints = await completion(
    client,
    'Generate a list of interesting areas of exploration about the renaissance',
    {
      schema: z.object({
        topics: z
          .array(
            z.object({
              title: z.string().describe('Title of the idea'),
              reason: z.string().describe('Why you choose this idea'),
              peopleInvolved: z
                .string()
                .describe(
                  "If there any known figures that's related to this idea",
                )
                .optional(),
            }),
          )
          .min(10)
          .max(20),
      }),
    },
  );
  console.info('Response 4:', resBulletPoints.data);

  const resBuletPoints2 = await resBulletPoints.respond('Generate 10 more');
  console.info('Response 4R:', resBuletPoints2.data);

  const resMessageHistory = await completion(
    client,
    'What did I mention in my first message to you?',
    {
      messageHistory: [
        { role: 'user', content: 'Tell me about large langauge models' },
        { role: 'assistant', content: 'ok' },
      ],
    },
  );
  console.info('Response 5:', resMessageHistory.data);

  const meaning = await completion(client, 'What is the meaning of life?')
    .then((res) => res.respond('why'))
    .then((res) => res.respond('why'))
    .then((res) => res.respond('why'))
    .then((res) => res.respond('why'))
    .then((res) => res.respond('why'));

  console.info('The meaning of life after 5 whys is: ', meaning.content);
})();
