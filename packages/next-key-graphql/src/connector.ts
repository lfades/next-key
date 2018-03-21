import { ServerResponse } from 'http';
import { MicroAuth, RequestLike, StringAnyMap } from 'next-key-micro';

export interface ConnectorOptions {
  req: RequestLike;
  res?: ServerResponse;
  errors?: AuthConnectorErrors;
}

export interface AuthConnectorErrors {
  LoginRequired: any;
  ScopeRequired: any;
}

export interface AuthConnectorContext {
  AuthToken: AuthConnector;
}

export interface AuthConnectorOptions extends ConnectorOptions {
  auth: MicroAuth;
}
/**
 * Connector to handle authentication inside resolvers for a graphql request
 */
export class AuthConnector {
  public static errors = {
    LoginRequired: Error.bind(null, 'You need to login first'),
    ScopeRequired: Error.bind(null, 'You are not allowed to be here')
  };

  public auth: MicroAuth;
  public req: RequestLike;
  public res?: ServerResponse;
  public errors: AuthConnectorErrors;
  public user?: StringAnyMap;
  public scope?: string[];

  constructor({ auth, req, res, errors }: AuthConnectorOptions) {
    this.auth = auth;
    this.req = req;
    this.res = res;
    this.errors = errors || AuthConnector.errors;

    if (req.user) this.user = req.user;
  }
  /**
   * Verifies an accessToken in headers and returns his payload. The payload
   * will be cached for later usage.
   */
  public verify() {
    const accessToken = this.auth.getAccessToken(this.req.headers);
    const payload = accessToken && this.auth.verify(accessToken);

    if (!payload) return;

    this.user = payload;

    return payload;
  }
  /**
   * Returns the payload of an accessToken
   */
  public getPayload() {
    if (this.user) return this.user;
    return this.verify();
  }
  /**
   * Checks if the user has a certain scope
   */
  public hasScope(scope: string | string[]) {
    if (!this.auth.accessToken.scope) {
      throw new Error(
        'To check for the scope accessToken.scope needs to be defined'
      );
    }
    if (!this.user) return false;

    return this.auth.accessToken.scope.has(this.user.scope, scope);
  }
  /**
   * Checks if the user has a certain scope and throws an error if he doesn't
   */
  public checkScope(scope: string | string[]) {
    if (!this.user) throw new this.errors.LoginRequired();
    if (!this.hasScope(scope)) throw new this.errors.ScopeRequired();
  }
  /**
   * Updates the current cached payload of the user
   */
  public updateUser(user: StringAnyMap) {
    this.scope = undefined;
    this.user = user;
  }
  /**
   * Returns the user, it will throw an error if no user is found
   */
  public getUser() {
    if (!this.user) throw new this.errors.LoginRequired();
    return this.user;
  }
  /**
   * Returns the userId, it will throw an error if no user is found
   */
  public userId() {
    return this.getUser().id;
  }
  /**
   * Logouts an user
   */
  public async logout() {
    if (!this.res) return { done: false };
    return this.auth.logout(this.req, this.res);
  }
  /**
   * Creates an accessToken based in a refreshToken present in cookies
   */
  public async refreshAccessToken() {
    if (!this.res) return;
    return this.auth.refreshAccessToken(this.req, this.res);
  }
}
