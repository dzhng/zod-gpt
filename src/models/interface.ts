import { z } from 'zod';

import { RequestOptions, Response, ModelConfig } from '../types';

export interface Model {
  modelConfig: ModelConfig;

  request<T extends z.ZodType>(
    message: string,
    opt?: RequestOptions<T>,
  ): Promise<Response<T>>;

  getTokensFromMessages(messages: string[]): number;
}
