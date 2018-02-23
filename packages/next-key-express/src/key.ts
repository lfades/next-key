import { Request, RequestHandler } from 'express';
import { AuthKey } from 'next-key-server';

export default class ExpressAuthKey extends AuthKey {
  /**
   * Assigns to req.user the payload of an accessToken or null
   */
  public authorize: RequestHandler = (req: Request, _res, next) => {
    const accessToken = this.getToken(req);

    req.user = accessToken ? this.verify(accessToken) : null;

    next();
  };
  /**
   * Returns the accessToken from headers
   */
  public getToken(req: Request) {
    const { authorization } = req.headers;
    const accessToken =
      authorization &&
      typeof authorization === 'string' &&
      authorization.split(' ')[1];

    return accessToken || null;
  }
}
