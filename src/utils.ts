import { debug as mDebug } from 'debug';

const error = mDebug('llamaflow:error');
const log = mDebug('llamaflow:log');
// eslint-disable-next-line no-console
log.log = console.log.bind(console);

export const debug = {
  error,
  log,
  write: (t: string) =>
    process.env.DEBUG &&
    'llamaflow:log'.match(process.env.DEBUG) &&
    process.stdout.write(t),
};

export function sleep(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export type MaybePromise<T> = Promise<T> | T;
