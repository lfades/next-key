import { CookieSerializeOptions, parse, serialize } from 'cookie';
import { IncomingMessage, ServerResponse } from 'http';
import { AuthServer, StringAnyMap } from 'next-key-server';
import { Request, run } from './utils';

// Default cookie name for a refreshToken
const RT_COOKIE = 'r_t';
const MISSING_RT_MSG = 'refreshToken is required to use this method';
/**
 * Authenticate requests with Express
 */
export default class MicroAuth extends AuthServer<CookieSerializeOptions> {
  /**
   * Creates an accessToken based in a refreshToken present in cookies
   */
  public refreshAccessToken = run(async (req, res) => {
    const refreshToken = this.getRefreshToken(req);
    if (!refreshToken) return;

    const reset = () => this.setRefreshToken(res, refreshToken);
    const payload = await this.getPayload(refreshToken, reset);
    if (!payload) return;

    const { accessToken } = this.createAccessToken(payload);
    return { accessToken };
  });
  /**
   * Logouts an user
   */
  public logout = run(async (req, res) => {
    const refreshToken = this.getRefreshToken(req);
    if (!refreshToken) return { done: false };

    await this.removeRefreshRoken(refreshToken);
    this.setRefreshToken(res, '');

    return { done: true };
  });
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
    const accessToken = this.getAccessToken(req);
    return accessToken ? this.verify(accessToken) : null;
  }
  /**
   * Returns the accessToken from headers
   */
  public getAccessToken(req: IncomingMessage) {
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
  public getRefreshToken(req: IncomingMessage) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);

    const { cookie } = req.headers;
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
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);

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
