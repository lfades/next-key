import { IncomingMessage, ServerResponse } from 'http';
import { send, sendError } from 'micro';
import { StringAnyMap } from 'next-key-server';

export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => any;

export interface Request extends IncomingMessage {
  user?: StringAnyMap | null;
}

export interface Result {
  accessToken?: string;
  done?: boolean;
  [key: string]: any;
}

export const INTERNAL_ERROR_STATUS = 500;
export const INTERNAL_ERROR_MESSAGE = 'Internal Server Error';
export const BAD_REQUEST_CODE = 400;
export const BAD_REQUEST_MESSAGE = 'Invalid Token';

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
  fn: (req: IncomingMessage, res: ServerResponse) => Promise<void | Result>
): RequestHandler => (req, res) => {
  fn(req, res)
    .then(result => {
      if (result) {
        send(res, 200, result);
        return;
      }

      const err = new AuthError({
        message: BAD_REQUEST_MESSAGE,
        status: BAD_REQUEST_CODE
      });

      res.statusCode = err.status;
      res.statusMessage = err.message;

      sendError(req, res, err);
    })
    .catch((err: AuthError) => {
      if (err.name !== 'AuthError') {
        err = new AuthError(err);
      }

      res.statusCode = err.status;
      res.statusMessage = err.message;

      sendError(req, res, err);
    });
};
