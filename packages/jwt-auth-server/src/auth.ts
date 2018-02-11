import { IncomingHttpHeaders } from 'http';
import { StringAnyMap } from './interfaces';
import AuthPayload from './payload';
import AuthScope from './scope';

export interface AuthToken<I> {
  new (Auth: AuthServer): I;
}

export interface IAccessToken {
  Auth: AuthServer;
  cookie: string;
  /**
   * Creates a payload based in some data
   */
  buildPayload(data: StringAnyMap): StringAnyMap;
  /**
   * Creates the accessToken
   */
  create(payload: StringAnyMap): string;
  /**
   * Verifies an accessToken and returns its payload
   */
  verify(accessToken: string): StringAnyMap;
  /**
   * Returns the expiration date of an accessToken
   */
  getExpDate(): Date;
}

export interface IRefreshToken {
  Auth: AuthServer;
  cookie: string;
  /**
   * Creates the refreshToken
   */
  create(data: StringAnyMap): Promise<string>;
  /**
   * Returns the payload in a refreshToken that can be used to create an
   * accessToken
   * @param reset Refresh the cookie of the refreshToken
   */
  getPayload(refreshToken: string, reset: () => void): Promise<StringAnyMap>;
  /**
   * Removes the refreshToken
   */
  remove(refreshToken: string): Promise<boolean> | boolean;
  /**
   * Returns the expiration date of a refreshToken
   */
  getExpDate(): Date;
}

export default class AuthServer {
  public accessToken: IAccessToken;
  public refreshToken: IRefreshToken;
  public payload: AuthPayload;
  public scope: AuthScope;

  constructor({
    AccessToken,
    RefreshToken,
    payload,
    scope
  }: {
    AccessToken: AuthToken<IAccessToken>;
    RefreshToken: AuthToken<IRefreshToken>;
    payload: AuthPayload;
    scope?: AuthScope;
  }) {
    this.accessToken = new AccessToken(this);
    this.refreshToken = new RefreshToken(this);

    this.payload = payload;
    this.scope = scope || new AuthScope();
  }
  /**
   * Creates a new accessToken
   */
  public createAccessToken(data: StringAnyMap) {
    const payload = this.accessToken.buildPayload(data);
    return {
      accessToken: this.accessToken.create(this.payload.create(payload)),
      payload
    };
  }
  /**
   * Creates a new refreshToken
   */
  public createRefreshToken(data: StringAnyMap) {
    return this.refreshToken.create(data);
  }
  /**
   * Creates both an accessToken and refreshToken
   */
  public async createTokens(
    data: StringAnyMap
  ): Promise<{
    refreshToken: string;
    accessToken: string;
    payload: StringAnyMap;
  }> {
    return {
      refreshToken: await this.createRefreshToken(data),
      ...this.createAccessToken(data)
    };
  }
  /**
   * Verifies an accessToken and returns its payload
   */
  public verify(accessToken: string) {
    return this.payload.parse(this.accessToken.verify(accessToken));
  }
  /**
   * Decodes and returns the payload of an accessToken
   */
  public decode(accessToken: string) {
    if (!accessToken) return null;

    try {
      return this.verify(accessToken);
    } catch (error) {
      return null;
    }
  }
  /**
   * Returns the payload in a refreshToken that can be used to create an
   * accessToken
   * @param reset Refresh the cookie of the refreshToken
   */
  public getPayload(refreshToken: string, reset: () => void) {
    return this.refreshToken.getPayload(refreshToken, reset);
  }
  /**
   * Removes an active refreshToken
   */
  public removeRefreshRoken(refreshToken: string): Promise<boolean> | boolean {
    if (refreshToken) {
      return this.refreshToken.remove(refreshToken);
    }
    return false;
  }
  /**
   * Returns a cookie, it searchs in this order:
   * signedCookies -> cookies -> null
   */
  public getCookie(
    {
      cookies,
      signedCookies
    }: {
      cookies?: StringAnyMap;
      signedCookies?: StringAnyMap;
    },
    cookie: string
  ): string | null {
    return (
      (signedCookies && signedCookies[cookie]) ||
      (cookies && cookies[cookie]) ||
      null
    );
  }
  /**
   * Returns the accessToken from a JWT Token using the headers or cookies of a
   * request, it will always look inside headers first
   */
  public getAccessToken(req: {
    headers?: IncomingHttpHeaders;
    cookies?: StringAnyMap;
    signedCookies?: StringAnyMap;
  }): string | null {
    const { authorization = '' } = req.headers || {};
    const accessToken =
      (authorization &&
        typeof authorization === 'string' &&
        authorization.split(' ')[1]) ||
      this.getCookie(req, this.accessToken.cookie);

    return accessToken;
  }
  /**
   * Returns the refreshToken from the cookies
   */
  public getRefreshToken(req: {
    cookies?: StringAnyMap;
    signedCookies?: StringAnyMap;
  }) {
    return this.getCookie(req, this.refreshToken.cookie);
  }
}
