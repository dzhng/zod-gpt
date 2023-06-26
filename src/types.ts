import EventEmitter from 'events';
import { ConfigurationParameters } from 'openai-edge';
import { z } from 'zod';

export type OpenAIConfigurationParameters = ConfigurationParameters & {
  azureEndpoint?: string;
  azureDeployment?: string;
};

export interface ModelConfig {
  model?: string;
  // set this to the total context size of the model, to enable automatic request chunking to avoid context overflows
  contextSize?: number;

  // max tokens to generate
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string | string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  logitBias?: Record<string, number>;
  user?: string;

  // NOTE: this flag currently does not work with OpenAI functions, do NOT use
  stream?: boolean;
}

export type ModelFunction = {
  name: string;
  description?: string;
  parameters?: {
    [key: string]: any;
  };
};

export type ModelRequestOptions = {
  systemMessage?: string | (() => string);
  functions?: ModelFunction[];

  // force the model to call the following function
  callFunction?: string;

  // the number of time to retry this request due to rate limit or recoverable API errors
  retries?: number;
  retryInterval?: number;
  timeout?: number;

  // the minimum amount of tokens to allocate for the response. if the request is predicted to not have enough tokens, it will automatically throw a 'TokenError' without sending the request
  minimumResponseTokens?: number;

  // pass in an event emitter to receive message stream events
  events?: EventEmitter;
};

// don't expost the functions array to the request layer
export type RequestOptions<T extends z.ZodType> = Omit<
  ModelRequestOptions,
  'functions' | 'callFunction'
> & {
  // set a zod schema to enable JSON output
  schema?: T;

  // set to enable automatically slicing the prompt on token overflow. prompt will be sliced starting from the last character
  // default: false
  autoSlice?: boolean;

  // attempt to auto heal the output via reflection
  // default: true
  autoHeal?: boolean;
};

export interface Response<T extends z.ZodType> {
  data: z.infer<T>;

  content?: string;
  name?: string;
  arguments?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // function to send another message in the same chat, this will automatically reuse all existing settings, and append a new message to the messages array
  respond: (prompt: string, opt: RequestOptions<T>) => Promise<Response<T>>;
}
