import { AuthPayload, AuthTokenOptions, StringAnyMap } from './interfaces';
import Payload from './payload';

export default class AuthKey {
  public payload: AuthPayload;
  public verifyFn: (accessToken: string) => StringAnyMap;

  constructor({ payload, verify }: AuthTokenOptions) {
    this.payload = payload || new Payload();
    this.verifyFn = verify;
  }
  /**
   * Decodes and returns the payload of an accessToken
   */
  public verify(accessToken: string) {
    if (!accessToken) return null;

    let tokenPayload: StringAnyMap;

    try {
      tokenPayload = this.verifyFn(accessToken);
    } catch (error) {
      return null;
    }

    return this.payload.parse(tokenPayload);
  }
}
