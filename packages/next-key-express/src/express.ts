import { Request, RequestHandler, Response } from 'express';
import { AuthServer, StringAnyMap } from 'next-key-server';
import { asyncMiddleware } from './utils';

declare global {
  namespace Express {
    interface Request {
      user?: StringAnyMap | null;
    }
  }
}
// Default cookie name for a refreshToken
const RT_COOKIE = 'r_t';
const MISSING_RT_MSG = 'refreshToken is required to use this method';
/**
 * Authenticate requests with Express
 */
export default class ExpressAuth extends AuthServer {
  /**
   * Creates an accessToken based in a refreshToken present in cookies
   */
  public refreshAccessToken = asyncMiddleware(async (req, res) => {
    const refreshToken = this.getRefreshToken(req);
    const reset = () => this.setRefreshToken(res, refreshToken);
    const payload =
      refreshToken && (await this.getPayload(refreshToken, reset));

    if (!payload) return;

    const { accessToken } = this.createAccessToken(payload);
    return { accessToken };
  });
  /**
   * Logouts an user
   */
  public logout = asyncMiddleware(async (req: Request, res: Response) => {
    const refreshToken = this.getRefreshToken(req);

    if (!refreshToken) return { done: false };

    await this.removeRefreshRoken(refreshToken);
    this.setRefreshToken(res, null);

    return { done: true };
  });
  /**
   * Assigns to req.user the payload of an accessToken or null
   */
  public authorize: RequestHandler = (req, _res, next) => {
    const accessToken = this.getAccessToken(req);

    req.user = accessToken ? this.verify(accessToken) : null;

    next();
  };
  /**
   * Returns the accessToken from headers
   */
  public getAccessToken(req: Request) {
    const { authorization } = req.headers;
    const accessToken =
      authorization &&
      typeof authorization === 'string' &&
      authorization.split(' ')[1];

    return accessToken || null;
  }
  /**
   * Returns the refreshToken from cookies
   */
  public getRefreshToken(req: Request) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);

    const cookie = this.refreshToken.cookie || RT_COOKIE;

    return (
      (req.signedCookies && req.signedCookies[cookie]) ||
      (req.cookies && req.cookies[cookie]) ||
      null
    );
  }
  /**
   * Sets the refreshToken as a cookie
   * @param refreshToken sending null will remove the cookie
   */
  public setRefreshToken(res: Response, refreshToken: string | null) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);

    const { cookie = RT_COOKIE, cookieOptions: co } = this.refreshToken;

    if (refreshToken === null) res.clearCookie(cookie);
    if (!refreshToken) return;

    const cookieOptions =
      co && typeof co === 'function' ? co(refreshToken) : co;

    res.cookie(cookie, refreshToken, {
      httpOnly: true,
      ...cookieOptions
    });
  }
}
