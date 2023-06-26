import { z } from 'zod';

import { RequestOptions, Response, ModelConfig } from '../types';

export interface Model {
  modelConfig: ModelConfig;

  chatCompletion<T extends z.ZodType>(
    messages: any[],
    opt?: RequestOptions<T>,
  ): Promise<Response<T>>;

  textCompletion<T extends z.ZodType>(
    prompt: string,
    opt?: RequestOptions<T>,
  ): Promise<Response<T>>;

  getTokensFromPrompt(promptOrMessages: string[]): number;
}
