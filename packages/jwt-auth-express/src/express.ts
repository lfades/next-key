import { Request, RequestHandler, Response } from 'express';
import { AuthServer } from 'jwt-auth-server';
import { asyncMiddleware } from './utils';

// Default cookie name for a refreshToken
const RT_COOKIE = 'r_t';
/**
 * Authenticate requests with Express
 */
export default class AuthWithExpress {
  constructor(public Auth: AuthServer) {}
  /**
   * Returns the accessToken from the headers
   */
  public getAccessToken(req: Request) {
    const { authorization = '' } = req.headers || {};
    const accessToken =
      authorization &&
      typeof authorization === 'string' &&
      authorization.split(' ')[1];

    return accessToken || null;
  }
  /**
   * Returns the refreshToken from the cookies
   */
  public getRefreshToken(req: Request) {
    const cookie = this.Auth.refreshToken.cookie || RT_COOKIE;

    return (
      (req.signedCookies && req.signedCookies[cookie]) ||
      (req.cookies && req.cookies[cookie]) ||
      null
    );
  }
  /**
   * Creates an accessToken based in a refreshToken present in cookies
   */
  public createAccessToken = asyncMiddleware(async (req, res) => {
    const refreshToken = this.getRefreshToken(req);
    const reset = () => this.setRefreshToken(res, refreshToken);
    const payload =
      refreshToken && (await this.Auth.getPayload(refreshToken, reset));

    if (!payload) return;

    const { accessToken } = this.Auth.createAccessToken(payload);
    return { accessToken };
  });
  /**
   * Logouts an user
   */
  public logout = asyncMiddleware(async (req: Request, res: Response) => {
    const refreshToken = this.getRefreshToken(req);

    if (!refreshToken) return { done: false };

    if (refreshToken) {
      await this.Auth.removeRefreshRoken(refreshToken);
    }
    this.setRefreshToken(res, null);

    return { done: true };
  });
  /**
   * Assigns to req.user the payload of an accessToken or null
   */
  public authorize: RequestHandler = (req: Request, _res, next) => {
    const accessToken = this.getAccessToken(req);

    req.user = accessToken ? this.Auth.decode(accessToken) : null;

    next();
  };
  /**
   * Sets the refreshToken as a cookie
   * @param refreshToken sending null will remove the cookie
   */
  public setRefreshToken(res: Response, refreshToken: string | null) {
    const { cookie = RT_COOKIE, cookieOptions: co } = this.Auth.refreshToken;

    if (refreshToken === null) {
      res.clearCookie(cookie);
    } else if (refreshToken) {
      const cookieOptions =
        co && typeof co === 'function' ? co(refreshToken) : co;

      res.cookie(cookie, refreshToken, {
        httpOnly: true,
        signed: true,
        ...cookieOptions
      });
    }
  }
}
