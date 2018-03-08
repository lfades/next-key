import { CookieSerializeOptions, parse, serialize } from 'cookie';
import http from 'http';
import { AuthServer, StringAnyMap } from 'next-key-server';
import { MISSING_RT_MESSAGE, RT_COOKIE } from './internals';
import { BadRequest, Request, RequestLike, run } from './utils';
/**
 * Authentication for an HTTP server
 */
export default class MicroAuth<
  CookieOptions = CookieSerializeOptions
> extends AuthServer<CookieOptions> {
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
  public async refreshAccessToken(req: RequestLike, res: http.ServerResponse) {
    const refreshToken = this.getRefreshToken(req.headers);
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
  public async logout(req: RequestLike, res: http.ServerResponse) {
    const refreshToken = this.getRefreshToken(req.headers);
    if (!refreshToken) return { done: false };

    await this.removeRefreshRoken(refreshToken);
    this.setRefreshToken(res, '');

    return { done: true };
  }
  /**
   * Assigns to req.user the payload of an accessToken
   */
  public authorize = (fn: (req: Request, res: http.ServerResponse) => any) => (
    req: Request,
    res: http.ServerResponse
  ) => {
    req.user = this.getUser(req);
    fn(req, res);
  };
  /**
   * Returns the accessToken from headers
   */
  public getAccessToken({ authorization }: http.IncomingHttpHeaders) {
    const accessToken =
      authorization &&
      typeof authorization === 'string' &&
      authorization.split(' ')[1];

    return accessToken || null;
  }
  /**
   * Returns the refreshToken from cookies
   */
  public getRefreshToken(headers: http.IncomingHttpHeaders) {
    const cookieName = this.getCookieName();
    const { cookie } = headers;

    if (!cookie) return null;

    const cookies = parse(cookie as string);

    return cookies[cookieName] || null;
  }
  /**
   * Sets the refreshToken as a cookie
   * @param refreshToken sending an empty string will remove the cookie
   */
  public setRefreshToken(res: http.ServerResponse, refreshToken: string) {
    this.setCookie(res, this.serialize(refreshToken));
  }
  /**
   * Returns the user payload from the accessToken in a request
   */
  public getUser(req: RequestLike): StringAnyMap | null {
    const accessToken = this.getAccessToken(req.headers);
    return accessToken ? this.verify(accessToken) : null;
  }
  /**
   * Turns a refreshToken into a serialized cookie
   */
  public serialize(refreshToken: string) {
    const name = this.getCookieName();
    const cookieOptions = this.getCookieOptions(refreshToken);

    return serialize(name, refreshToken, cookieOptions);
  }
  /**
   * Returns the name of the cookie used for the refreshToken
   */
  public getCookieName() {
    if (!this.refreshToken) throw new Error(MISSING_RT_MESSAGE);
    return this.refreshToken.cookie || RT_COOKIE;
  }
  /**
   * Returns the cookie options that will be used to save the refreshToken
   * @param refreshToken sending an empty string will return a cookie with a
   * past out expire date
   */
  public getCookieOptions(refreshToken: string): CookieOptions {
    if (!this.refreshToken) throw new Error(MISSING_RT_MESSAGE);
    // I'm Using type any here to avoid the error: "Spread types may only be
    // created from object types." caused because CookieOptions can be anything
    // but I know it's something similar to CookieSerializeOptions
    const co = this.refreshToken.cookieOptions as any;
    const cookieOptions =
      co && typeof co === 'function' ? co(refreshToken || null) : { ...co };

    // Remove the cookie
    if (!refreshToken) {
      delete cookieOptions.maxAge;
      cookieOptions.expires = new Date(1);
    }

    return {
      httpOnly: true,
      path: '/',
      ...cookieOptions
    };
  }
  /**
   * Updates the header 'Set-Cookie'
   */
  public setCookie(res: http.ServerResponse, value: string) {
    const cookie = res.getHeader('Set-Cookie');
    let val: string | string[] = value;

    if (cookie && typeof cookie !== 'number') {
      val = Array.isArray(cookie) ? cookie.concat(value) : [cookie, value];
    }

    res.setHeader('Set-Cookie', val);
  }
}
