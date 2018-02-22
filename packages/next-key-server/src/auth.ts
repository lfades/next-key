import {
  AuthAccessToken,
  AuthPayload,
  AuthRefreshToken,
  AuthScope,
  AuthServerOptions,
  StringAnyMap
} from './interfaces';
import Payload from './payload';
import Scope from './scope';

export default class AuthServer {
  public accessToken: AuthAccessToken;
  public refreshToken: AuthRefreshToken;
  public payload: AuthPayload;
  public scope: AuthScope;

  constructor({
    accessToken,
    refreshToken,
    payload,
    scope
  }: AuthServerOptions) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    this.payload = payload || new Payload();
    this.scope = scope || new Scope();
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
   * Decodes and returns the payload of an accessToken
   */
  public verify(accessToken: string) {
    if (typeof this.accessToken.verify !== 'function') {
      throw new Error(
        'A verify function should be implemented to verify a token'
      );
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
}
