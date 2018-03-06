import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { send, sendError } from 'micro';
import { StringAnyMap } from 'next-key-server';
import {
  BAD_REQUEST_MESSAGE,
  BAD_REQUEST_STATUS,
  INTERNAL_ERROR_MESSAGE,
  INTERNAL_ERROR_STATUS,
  Result
} from './internals';

export type AsyncRequestHandler<T> = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<T>;

export interface Request extends IncomingMessage {
  user?: StringAnyMap | null;
}
/**
 * This request has only the required fields to do authentication
 */
export interface RequestLike {
  headers: IncomingHttpHeaders;
  user?: StringAnyMap | null;
}

export class AuthError extends Error {
  public status: number;

  constructor(data?: string | { message?: string; status?: number }) {
    if (!data) data = {};
    if (typeof data === 'string') data = { message: data };

    super(data.message || INTERNAL_ERROR_MESSAGE);

    this.name = 'AuthError';
    this.status = data.status || INTERNAL_ERROR_STATUS;
  }
}

export const run = (
  fn: AsyncRequestHandler<void | Result>
): AsyncRequestHandler<void> => async (req, res) => {
  try {
    const result = await fn(req, res);

    if (result) {
      send(res, 200, result);
      return;
    }

    throw new AuthError({
      message: BAD_REQUEST_MESSAGE,
      status: BAD_REQUEST_STATUS
    });
  } catch (err) {
    if (err.name !== 'AuthError') {
      sendError(req, res, err);
      throw err;
    }
    // sendError is already setting res.statusCode
    res.statusMessage = err.message;
    sendError(req, res, err);
  }
};
