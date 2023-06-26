import { ModelRequestOptions } from 'llm-api';
import { z } from 'zod';

export type ModelResponse = {
  // raw response from the completion API
  content?: string;
  name?: string;
  arguments?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // function to send another message in the same chat, this will automatically reuse all existing settings, and append a new message to the messages array
  respond: (prompt: string, opt: ModelRequestOptions) => Promise<ModelResponse>;
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

export type Response<T extends z.ZodType> = ModelResponse & {
  // parsed and typecasted data from the model
  data: z.infer<T>;
};
