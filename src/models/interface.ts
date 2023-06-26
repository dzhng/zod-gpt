import { ChatRequestOptions, ChatResponse, ModelConfig } from '../types';

export interface Model {
  modelConfig: ModelConfig;

  request<T = any>(
    message: string,
    opt?: ChatRequestOptions,
  ): Promise<ChatResponse<T>>;

  getTokensFromMessages(messages: string[]): number;
}
