import { CookieOptions, Request, RequestHandler, Response } from 'express';
import http from 'http';
import {
  AuthServer,
  BadRequest,
  MicroAuth,
  run,
  StringAnyMap
} from 'next-key-micro';

declare global {
  namespace Express {
    interface Request {
      user?: StringAnyMap | null;
    }
  }
}
/**
 * Authenticate requests with Express
 */
export default class ExpressAuth extends AuthServer<CookieOptions> {
  /**
   * The express implementation and next-key-micro are very similar, this allows
   * code reuse and also an easy implementation with next-key-graphql
   */
  public micro = new MicroAuth(this as any);
  /**
   * Http handler that creates an accessToken
   */
  public refreshAccessTokenHandler = run(this.refreshAccessToken.bind(this));
  /**
   * Http handler that logouts an user
   */
  public logoutHandler = run(this.logout.bind(this));
  /**
   * Creates an accessToken based in a refreshToken present in cookies
   */
  public async refreshAccessToken(req: Request, res: Response) {
    const refreshToken = this.getRefreshToken(req);
    if (!refreshToken) throw new BadRequest();

    const reset = () => this.setRefreshToken(res, refreshToken);
    const payload = await this.getPayload(refreshToken, reset);
    if (!payload) throw new BadRequest();

    const { accessToken } = this.createAccessToken(payload);
    return { accessToken };
  }
  /**
   * Logouts an user
   */
  public async logout(req: Request, res: Response) {
    const refreshToken = this.getRefreshToken(req);
    if (!refreshToken) return { done: false };

    await this.removeRefreshRoken(refreshToken);
    this.setRefreshToken(res, '');

    return { done: true };
  }
  /**
   * Assigns to req.user the payload of an accessToken
   */
  public authorize: RequestHandler = (req, _res, next) => {
    req.user = this.micro.getUser(req);
    next();
  };
  /**
   * Returns the refreshToken from cookies
   */
  public getRefreshToken(req: Request): string | null {
    const cookieName = this.micro.getRefreshTokenName();

    return (
      (req.signedCookies && req.signedCookies[cookieName]) ||
      (req.cookies && req.cookies[cookieName]) ||
      null
    );
  }
  /**
   * Returns the accessToken from headers
   */
  public getAccessToken(headers: http.IncomingHttpHeaders) {
    return this.micro.getAccessToken(headers);
  }
  /**
   * Sets the refreshToken as a cookie
   * @param refreshToken sending an empty string will remove the cookie
   */
  public setRefreshToken(res: Response, refreshToken: string) {
    const cookie = this.micro.getRefreshTokenName();
    const cookieOptions: CookieOptions = this.micro.getRefreshTokenOptions(
      refreshToken
    );

    // Having signed as true will cause Express to not send an empty cookie
    if (!refreshToken) cookieOptions.signed = false;

    res.cookie(cookie, refreshToken, cookieOptions);
  }
  /**
   * Sets the accessToken as a cookie
   * @param accessToken sending an empty string will remove the cookie
   */
  public setAccessToken(res: Response, accessToken: string) {
    const cookie = this.micro.getAccessTokenName();
    const cookieOptions: CookieOptions = this.micro.getAccessTokenOptions(
      accessToken
    );

    if (!accessToken) cookieOptions.signed = false;

    res.cookie(cookie, accessToken, cookieOptions);
  }
}
