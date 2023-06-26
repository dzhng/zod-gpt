import { defaults, get, omit } from 'lodash';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

import { TokenError } from './models/errors';
import { Model } from './models/interface';
import type { RequestOptions, Response } from './types';
import { debug } from './utils';

const FunctionName = 'print';
const FunctionDescription =
  'ALWAYS respond by calling this function with the given parameters';

const Defaults = {
  autoHeal: true,
  autoSlice: false,
};

export async function request<T extends z.ZodType = z.ZodString>(
  model: Model,
  prompt: string | (() => string),
  _opt?: Partial<RequestOptions>,
): Promise<Response<z.infer<T>>> {
  const message = typeof prompt === 'string' ? prompt : prompt();
  const opt = defaults(
    {
      // build function to call if schema is defined
      callFunction: _opt?.schema ? FunctionName : undefined,
      functions: _opt?.schema
        ? [
            {
              name: FunctionName,
              description: FunctionDescription,
              parameters: omit(
                zodToJsonSchema(_opt?.schema),
                '$schema',
                '$ref',
              ),
            },
          ]
        : undefined,
    },
    _opt,
    Defaults,
  );

  debug.log('⬆️ sending request:', message);

  try {
    let response = await model.request(message, opt);
    if (!response) {
      throw new Error('Chat request failed');
    }

    // only send this debug msg when stream is not enabled, or there'll be duplicate log msgs since stream also streams in the logs
    !model.modelConfig.stream && debug.log('⬇️ received response:', response);

    // validate res content, and recursively loop if invalid
    if (opt?.schema) {
      if (!response.arguments) {
        if (opt.autoHeal) {
          debug.log('⚠️ function not called, autohealing...');
          response = await response.respond(
            `Please respond with a call to the ${FunctionName} function`,
            opt,
          );

          if (!response.arguments) {
            throw new Error('Response function autoheal failed');
          }
        } else {
          throw new Error('Response function not called');
        }
      }

      const res = opt.schema.safeParse(response.arguments);
      if (res.success) {
        return {
          ...response,
          data: res.data,
        };
      } else {
        if (opt.autoHeal) {
          debug.log('⚠️ response parsing failed, autohealing...', res.error);
          const issuesMessage = res.error.issues.reduce(
            (prev, issue) =>
              issue.path && issue.path.length > 0
                ? `${prev}\nThere is an issue with the the value "${JSON.stringify(
                    get(response.arguments, issue.path),
                  )}", at path ${issue.path.join('.')}. The issue is: ${
                    issue.message
                  }`
                : `\nThe issue is: ${issue.message}`,
            `There is an issue with that response, please rewrite by calling the ${FunctionName} function with the correct parameters.`,
          );
          response.respond(issuesMessage, opt);
        } else {
          throw new Error('Response parsing failed');
        }
      }
    }

    // if no schema is defined, default to string
    return {
      ...response,
      data: String(response.content),
    };
  } catch (e) {
    if (e instanceof TokenError && opt.autoSlice) {
      const chunkSize = message.length - e.overflowTokens * 4;
      if (chunkSize < 0) {
        throw e;
      }

      debug.log(
        `⚠️ Request prompt too long, splitting text with chunk size of ${chunkSize}`,
      );
      return request(model, message.slice(0, chunkSize), opt);
    } else {
      throw e;
    }
  }
}
