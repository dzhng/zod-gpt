import { AnthropicChatApi, OpenAIChatApi } from 'llm-api';
import { z } from 'zod';

import { completion } from './src';

(async function go() {
  const client = process.env.OPENAI_KEY
    ? new OpenAIChatApi(
        { apiKey: process.env.OPENAI_KEY },
        { contextSize: 4096, model: 'gpt-3.5-turbo-0613' },
      )
    : process.env.ANTHROPIC_KEY
    ? new AnthropicChatApi(
        { apiKey: process.env.ANTHROPIC_KEY },
        { contextSize: 100_000, model: 'claude-2' },
      )
    : undefined;
  if (!client) {
    throw new Error(
      'Please pass in either an OpenAI or Anthropic environment variable',
    );
  }

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
