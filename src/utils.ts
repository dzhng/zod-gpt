import { debug as mDebug } from 'debug';
import jsonic from 'jsonic';
import { jsonrepair } from 'jsonrepair';
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

const extractJSONObjectResponse = (res: string): string | undefined =>
  res.match(/\{(.|\n)*\}/g)?.[0];

const extractJSONArrayResponse = (res: string): string | undefined =>
  res.match(/\[(.|\n)*\]/g)?.[0];

export function parseUnsafeJson(json: string): any {
  try {
    const potientialArray = extractJSONArrayResponse(json);
    const potientialObject = extractJSONObjectResponse(json);
    // extract the larger text between potiential array and potiential object, we want the parent json object
    const extracted =
      (potientialArray?.length ?? 0) > (potientialObject?.length ?? 0)
        ? potientialArray
        : potientialObject;
    if (extracted) {
      return jsonic(jsonrepair(extracted));
    } else {
      return undefined;
    }
  } catch (e) {
    debug.error('⚠️ error parsing unsafe json: ', json, e);
    return undefined;
  }
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
