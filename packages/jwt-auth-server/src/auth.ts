import { StringAnyMap } from './interfaces';
import AuthPayload from './payload';
import AuthScope from './scope';

interface AuthToken<I> {
  new (Auth: AuthServer): I;
}

export interface AccessTokenInterface {
  Auth: AuthServer;
  cookie: string;
  expireAfter: number;

  buildPayload(data: StringAnyMap): StringAnyMap;
  create(payload: StringAnyMap): string;
  verify(accessToken: string): StringAnyMap;
}

export interface RefreshTokenInterface {
  Auth: AuthServer;
  cookie: string;
  expireAfter: number;

  create(data: StringAnyMap): Promise<string>;
  createPayload(refreshToken: string): Promise<StringAnyMap>;
  remove(refreshToken: string): void;
}

export default class AuthServer {
  public secure: boolean;
  public at: AccessTokenInterface;
  public rt: RefreshTokenInterface;
  public accessTokenCookie: string;
  public refreshTokenCookie: string;
  public payload: AuthPayload;
  public scope: AuthScope;

  constructor({
    secure,
    AccessToken,
    RefreshToken,
    payload,
    scope
  }: {
    AccessToken: AuthToken<AccessTokenInterface>;
    RefreshToken: AuthToken<RefreshTokenInterface>;
    payload: AuthPayload;
    scope?: AuthScope;
    secure?: boolean;
  }) {
    this.at = new AccessToken(this);
    this.rt = new RefreshToken(this);
    this.accessTokenCookie = this.at.cookie;
    this.refreshTokenCookie = this.rt.cookie;

    this.payload = payload;
    this.scope = scope || new AuthScope();
    this.secure = secure || false;
  }
  /**
   * Returns the expiration date for a refreshToken
   */
  public refreshTokenExpiresAt() {
    return new Date(Date.now() + this.rt.expireAfter);
  }
  /**
   * Returns the expiration date for an accessToken
   */
  public accessTokenExpiresAt() {
    return new Date(Date.now() + this.at.expireAfter);
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
   * Removes an active refreshToken
   */
  public removeRefreshRoken(refreshToken: string) {
    if (refreshToken) {
      this.rt.remove(refreshToken);
    }
  }
  /**
   * Verifies an accessToken and returns its payload
   */
  public verify(accessToken: string) {
    return this.payload.parse(this.at.verify(accessToken));
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
  /**
   * Returns the payload of an accessToken
   */
  public getPayload(accessToken: string) {
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
  public createPayload(refreshToken: string) {
    return this.rt.createPayload(refreshToken);
  }
}
