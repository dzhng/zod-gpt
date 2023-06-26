import { debug as mDebug } from 'debug';
import { omit } from 'lodash';
import { z } from 'zod';
import zodToJsonSchemaImpl from 'zod-to-json-schema';

const error = mDebug('zod-gpt:error');
const log = mDebug('zod-gpt:log');
// eslint-disable-next-line no-console
log.log = console.log.bind(console);

export const debug = {
  error,
  log,
  write: (t: string) =>
    process.env.DEBUG &&
    'zod-gpt:log'.match(process.env.DEBUG) &&
    process.stdout.write(t),
};

export function sleep(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function zodToJsonSchema(schema: z.ZodType): any {
  return omit(
    zodToJsonSchemaImpl(schema, { $refStrategy: 'none' }),
    '$ref',
    '$schema',
    'default',
    'definitions',
    'description',
    'markdownDescription',
  );
}

export type MaybePromise<T> = Promise<T> | T;
