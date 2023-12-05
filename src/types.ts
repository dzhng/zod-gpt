import { ModelRequestOptions, ChatResponse, ChatRequestMessage } from 'llm-api';
import { z } from 'zod';

// don't expost the functions array to the request layer
export type RequestOptions<T extends z.ZodType> = Omit<
  ModelRequestOptions,
  'functions' | 'callFunction'
> & {
  // set a zod schema to enable JSON output
  schema?: T;

  // override default function name and description used to print outputs
  functionName?: string;
  functionDescription?: string;

  // set to enable automatically slicing the prompt on token overflow. prompt will be sliced starting from the last character
  // default: false
  autoSlice?: boolean;

  // attempt to auto heal the output via reflection
  // default: true
  autoHeal?: boolean;

  // set message history, useful if you want to continue an existing conversation
  messageHistory?: ChatRequestMessage[];
};

export type Response<T extends z.ZodType> = {
  // override previous respond method to include schema types
  respond: (
    message: string | ChatRequestMessage,
    opt?: ModelRequestOptions,
  ) => Promise<Response<T>>;

  // parsed and typecasted data from the model
  data: z.infer<T>;
} & ChatResponse;
