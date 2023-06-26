import { ModelRequestOptions, ModelResponse, ModelConfig } from '../types';

export interface CompletionApi {
  modelConfig: ModelConfig;

  chatCompletion(
    messages: any[],
    opt?: ModelRequestOptions,
  ): Promise<ModelResponse>;

  textCompletion(
    prompt: string,
    opt?: ModelRequestOptions,
  ): Promise<ModelResponse>;

  getTokensFromPrompt(promptOrMessages: string[]): number;
}
