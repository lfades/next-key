import {
  AuthAccessToken,
  AuthPayload,
  AuthRefreshToken,
  AuthScope,
  AuthServerOptions,
  StringAnyMap
} from './interfaces';
import {
  MISSING_AT_CREATE_MSG,
  MISSING_AT_VERIFY_MSG,
  MISSING_RT_MSG
} from './internals';
import Payload from './payload';
import Scope from './scope';

export default class AuthServer<CookieOptions = StringAnyMap> {
  public accessToken: AuthAccessToken<CookieOptions>;
  public refreshToken?: AuthRefreshToken<CookieOptions>;
  public payload: AuthPayload;
  public scope: AuthScope;

  constructor({
    accessToken,
    refreshToken,
    payload,
    scope
  }: AuthServerOptions<CookieOptions>) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    this.payload = payload || new Payload();
    this.scope = scope || new Scope();
  }
  /**
   * Creates a new accessToken
   */
  public createAccessToken(data: StringAnyMap) {
    if (typeof this.accessToken.create !== 'function') {
      throw new Error(MISSING_AT_CREATE_MSG);
    }

    const payload = this.accessToken.getPayload
      ? this.accessToken.getPayload(data)
      : data;

    return {
      accessToken: this.accessToken.create(this.payload.create(payload)),
      payload
    };
  }
  /**
   * Creates a new refreshToken
   */
  public createRefreshToken(data: StringAnyMap) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);
    return this.refreshToken.create(data);
  }
  /**
   * Creates both accessToken and refreshToken
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
   * Decodes and returns the payload of an accessToken
   */
  public verify(accessToken: string) {
    if (typeof this.accessToken.verify !== 'function') {
      throw new Error(MISSING_AT_VERIFY_MSG);
    }
    if (!accessToken) return null;

    let tokenPayload: StringAnyMap;

    try {
      tokenPayload = this.accessToken.verify(accessToken);
    } catch (error) {
      return null;
    }

    return this.payload.parse(tokenPayload);
  }
  /**
   * Returns the payload in a refreshToken that can be used to create an
   * accessToken
   * @param reset Refresh the cookie of the refreshToken
   */
  public getPayload(refreshToken: string, reset: () => void) {
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);
    return this.refreshToken.getPayload(refreshToken, reset);
  }
  /**
   * Removes an active refreshToken
   */
  public removeRefreshRoken(refreshToken: string): Promise<boolean> | boolean {
    if (!this.refreshToken) throw new Error(MISSING_RT_MSG);
    if (!refreshToken) return false;
    return this.refreshToken.remove(refreshToken);
  }
}
