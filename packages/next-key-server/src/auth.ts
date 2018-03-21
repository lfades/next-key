import {
  AuthAccessToken,
  AuthRefreshToken,
  AuthServerOptions,
  StringAnyMap
} from './interfaces';
import {
  MISSING_AT_CREATE_MSG,
  MISSING_AT_VERIFY_MSG,
  MISSING_RT_MSG
} from './internals';

export default class AuthServer<CookieOptions = StringAnyMap> {
  public accessToken: AuthAccessToken<CookieOptions>;
  public refreshToken?: AuthRefreshToken<CookieOptions>;

  constructor({ accessToken, refreshToken }: AuthServerOptions<CookieOptions>) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
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
      accessToken: this.accessToken.create(payload),
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

    try {
      return this.accessToken.verify(accessToken);
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
