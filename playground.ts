import { z } from 'zod';

import { OpenAIChatApi, completion } from './src';

(async function go() {
  const openai = new OpenAIChatApi(
    {
      apiKey: process.env.OPENAI_KEY ?? 'YOUR_OPENAI_KEY',
    },
    { contextSize: 4096, model: 'gpt-3.5-turbo-0613' },
  );

  const resStartup = await completion(openai, 'Generate a startup idea', {
    schema: z.object({
      name: z.string().describe('The name of the startup'),
      description: z.string().describe('What does this startup do?'),
    }),
  });
  console.info('Response: ', resStartup.data);

  const resHello = await completion(openai, 'Hello');
  console.info('Response:', resHello.data);

  const resComplexSchema = await completion(
    openai,
    'Generate a step by step plan to run a hachathon',
    {
      schema: z.object({
        plan: z.array(
          z.object({
            reason: z.string().describe('Name the reasoning for this step'),
            name: z.string().describe('Step name'),
            task: z
              .string()
              .describe('What is the task to be done for this step?'),
          }),
        ),
      }),
    },
  );
  console.info('Response:', resComplexSchema.data);
})();
