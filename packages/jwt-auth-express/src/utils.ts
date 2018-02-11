import { Request, Response } from 'express';

export type Req<I> = (req: Request, res: Response) => I;
export type Fn = Req<Promise<void | Result>>;

export interface Result {
  errorMessage?: string;
  errorCode?: number;
  [key: string]: any;
}

export const asyncMiddleware = (fn: Fn): Req<any> => (req, res) => {
  const error = (err: Result = {}) => {
    const { errorMessage = 'Invalid token', errorCode = 400 } = err;

    res.statusMessage = errorMessage;
    res.status(errorCode).json({ message: errorMessage });
  };

  fn(req, res)
    .then(result => {
      if (result === undefined || result.errorCode || result.errorMessage) {
        error(result || undefined);
      } else {
        res.json(result);
      }
    })
    .catch(error);
};
