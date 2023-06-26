import { OpenAIChatApi } from 'llm-api';
import { z } from 'zod';

import { completion } from './src';

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
  console.info('Response 1: ', resStartup.data);

  const resHello = await completion(openai, 'Hello');
  console.info('Response 2:', resHello.data);

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
  console.info('Response 3:', resComplexSchema.data);

  const resBulletPoints = await completion(
    openai,
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
})();
