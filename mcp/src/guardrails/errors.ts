/**
 * A refusal the server explains to Claude: a stable `code` plus a plain-language message.
 * Tools turn it into an `isError` result; anything else is an internal error and is logged.
 */
export class ToolError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
