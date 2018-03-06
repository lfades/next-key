import { CookieSerializeOptions, parse, serialize } from 'cookie';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { AuthServer, StringAnyMap } from 'next-key-server';
import { MISSING_RT_MESSAGE, RT_COOKIE } from './internals';
import { Request, RequestLike, run } from './utils';
/**
 * Authentication for an HTTP server
 */
export default class MicroAuth extends AuthServer<CookieSerializeOptions> {
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
  public async refreshAccessToken(req: RequestLike, res: ServerResponse) {
    const refreshToken = this.getRefreshToken(req.headers);
    if (!refreshToken) return;

    const reset = () => this.setRefreshToken(res, refreshToken);
    const payload = await this.getPayload(refreshToken, reset);
    if (!payload) return;

    const { accessToken } = this.createAccessToken(payload);
    return { accessToken };
  }
  /**
   * Logouts an user
   */
  public async logout(req: RequestLike, res: ServerResponse) {
    const refreshToken = this.getRefreshToken(req.headers);
    if (!refreshToken) return { done: false };

    await this.removeRefreshRoken(refreshToken);
    this.setRefreshToken(res, '');

    return { done: true };
  }
  /**
   * Assigns to req.user the payload of an accessToken
   */
  public authorize = (fn: (req: Request, res: ServerResponse) => any) => (
    req: Request,
    res: ServerResponse
  ) => {
    req.user = this.getUser(req);
    fn(req, res);
  };
  /**
   * Returns the user payload from the accessToken in a request
   */
  public getUser(req: IncomingMessage): StringAnyMap | null {
    const accessToken = this.getAccessToken(req.headers);
    return accessToken ? this.verify(accessToken) : null;
  }
  /**
   * Returns the accessToken from headers
   */
  public getAccessToken({ authorization }: IncomingHttpHeaders) {
    const accessToken =
      authorization &&
      typeof authorization === 'string' &&
      authorization.split(' ')[1];

    return accessToken || null;
  }
  /**
   * Returns the refreshToken from cookies
   */
  public getRefreshToken(headers: IncomingHttpHeaders) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MESSAGE);

    const { cookie } = headers;
    if (!cookie) return null;

    const cookieName = this.refreshToken.cookie || RT_COOKIE;
    const cookies = parse(cookie as string);

    return cookies[cookieName] || null;
  }
  /**
   * Sets the refreshToken as a cookie
   * @param refreshToken sending an empty string will remove the cookie
   */
  public setRefreshToken(res: ServerResponse, refreshToken: string) {
    this.setCookie(res, this.serialize(refreshToken));
  }
  /**
   * Turns a refreshToken into a serialized cookie
   * @param refreshToken sending an empty string will return a cookie with a
   * past out expire date
   */
  public serialize(refreshToken: string) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MESSAGE);

    const { cookie = RT_COOKIE, cookieOptions: co } = this.refreshToken;
    const cookieOptions =
      co && typeof co === 'function' ? co(refreshToken || null) : { ...co };

    // Remove the cookie
    if (!refreshToken) {
      delete cookieOptions.maxAge;
      cookieOptions.expires = new Date(1);
    }

    return serialize(cookie, refreshToken, {
      httpOnly: true,
      path: '/',
      ...cookieOptions
    });
  }
  /**
   * Updates the header 'Set-Cookie'
   */
  protected setCookie(res: ServerResponse, value: string) {
    const cookie = res.getHeader('Set-Cookie');
    let val: string | string[] = value;

    if (cookie && typeof cookie !== 'number') {
      val = Array.isArray(cookie) ? cookie.concat(value) : [cookie, value];
    }

    res.setHeader('Set-Cookie', val);
  }
}
