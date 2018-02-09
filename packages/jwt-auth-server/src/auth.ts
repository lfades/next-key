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
   * Creates the payload for an accessToken
   */
  createPayload(refreshToken: string): Promise<StringAnyMap>;
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
  public at: IAccessToken;
  public rt: IRefreshToken;
  public accessTokenCookie: string;
  public refreshTokenCookie: string;
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
    this.at = new AccessToken(this);
    this.rt = new RefreshToken(this);
    this.accessTokenCookie = this.at.cookie;
    this.refreshTokenCookie = this.rt.cookie;

    this.payload = payload;
    this.scope = scope || new AuthScope();
  }
  /**
   * Creates a new accessToken
   */
  public createAccessToken(data: StringAnyMap) {
    const payload = this.payload.create(this.at.buildPayload(data));
    return this.at.create(payload);
  }
  /**
   * Creates a new refreshToken
   */
  public createRefreshToken(data: StringAnyMap) {
    return this.rt.create(data);
  }
  /**
   * Creates both an accessToken and refreshToken
   */
  public async createTokens(
    data: StringAnyMap
  ): Promise<{ refreshToken: string; accessToken: string }> {
    return {
      refreshToken: await this.createRefreshToken(data),
      accessToken: this.createAccessToken(data)
    };
  }
  /**
   * Verifies an accessToken and returns its payload
   */
  public verify(accessToken: string) {
    return this.payload.parse(this.at.verify(accessToken));
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
   * Returns the payload for an accessToken from a refreshToken
   */
  public getPayload(refreshToken: string) {
    return this.rt.createPayload(refreshToken);
  }
  /**
   * Removes an active refreshToken
   */
  public removeRefreshRoken(refreshToken: string): Promise<boolean> | boolean {
    if (refreshToken) {
      return this.rt.remove(refreshToken);
    }
    return false;
  }
  /**
   * Returns the accessToken from a JWT Token using the headers or cookies of a
   * request
   * @param req It may be an http request or just an object with headers and/or
   * cookies
   * @param req.headers Headers with an authorization token
   * @param req.cookies They will be used only if there isn't a token in the
   * headers
   */
  public getAccessToken(req: {
    headers?: { authorization: string };
    cookies?: StringAnyMap;
  }): string | null {
    const { headers, cookies } = req;
    const { authorization = null } = headers || {};
    const accessToken = authorization
      ? authorization.split(' ')[1]
      : cookies && cookies[this.accessTokenCookie];

    return accessToken || null;
  }
}
