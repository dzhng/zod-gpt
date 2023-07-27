import { ModelRequestOptions, ChatResponse, ChatRequestMessage } from 'llm-api';
import { z } from 'zod';

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

  // set message history, useful if you want to continue an existing conversation
  messageHistory?: ChatRequestMessage[];
};

export type Response<T extends z.ZodType> = ChatResponse & {
  // parsed and typecasted data from the model
  data: z.infer<T>;
};
