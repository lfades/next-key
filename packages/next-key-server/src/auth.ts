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
