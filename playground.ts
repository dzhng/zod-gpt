import { z } from 'zod';

import { OpenAI, request } from './src';

(async function go() {
  const model = new OpenAI(
    {
      apiKey: process.env.OPENAI_KEY ?? 'YOUR_OPENAI_KEY',
    },
    { contextSize: 4096, model: 'gpt-3.5-turbo-0613' },
  );
  console.info('Model created', model);

  const res = await request(model, 'Generate a startup idea', {
    schema: z.object({
      name: z.string().describe('The name of the startup'),
      description: z.string().describe('What does this startup do?'),
    }),
  });

  console.info('Response: ', res.data);
})();
