export class TokenError extends Error {
  overflowTokens: number;

  constructor(message: string, overflowTokens: number) {
    super(message);
    this.name = 'TokenError';
    this.overflowTokens = overflowTokens;
  }
}
