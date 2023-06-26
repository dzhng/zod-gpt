import { debug as mDebug } from 'debug';
import jsonic from 'jsonic';
import { jsonrepair } from 'jsonrepair';

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

export function parseUnsafeJson(json: string): any {
  return jsonic(jsonrepair(json));
}

export type MaybePromise<T> = Promise<T> | T;
