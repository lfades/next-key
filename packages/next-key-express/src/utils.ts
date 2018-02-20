import { Request, Response } from 'express';

export type Req<I> = (req: Request, res: Response) => I;
export type Fn = Req<Promise<void | Result>>;

export interface Result {
  error?: {
    message?: string;
    status?: number;
    code?: string | number;
  };
  [key: string]: any;
}

export const INTERNAL_ERROR_CODE = 500;
export const INTERNAL_ERROR_MESSAGE = 'Internal server error';
export const BAD_REQUEST_CODE = 400;
export const BAD_REQUEST_MESSAGE = 'Invalid token';

export const asyncMiddleware = (fn: Fn): Req<void> => (req, res) => {
  const error = (err: Result['error'] = {}) => {
    const {
      message = BAD_REQUEST_MESSAGE,
      status = BAD_REQUEST_CODE,
      code
    } = err;
    const errorData: { message: string; code?: string | number } = { message };

    if (code) errorData.code = code;

    res.statusMessage = message;
    res.status(status).json(errorData);
  };

  fn(req, res)
    .then(result => {
      if (result === undefined || result.error) {
        error(result ? result.error : undefined);
      } else {
        res.json(result);
      }
    })
    .catch(() => {
      error({ message: INTERNAL_ERROR_MESSAGE, status: INTERNAL_ERROR_CODE });
    });
};
