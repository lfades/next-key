import { IncomingMessage } from 'http';
import Cookies, { CookieAttributes } from 'js-cookie';
import { FetchConnector } from './connectors/utils';

const AT_COOKIE = 'a_t';

export type CookieOptions =
  | CookieAttributes
  | ((accessToken?: string) => CookieAttributes);

export type GetTokens = (
  req: IncomingMessage
) => { refreshToken?: string; accessToken?: string } | void;

export type Decode = (accessToken: string) => object | null | void;

export interface AuthClientOptions {
  cookie?: string;
  cookieOptions?: CookieOptions;
  decode: Decode;
  fetchConnector?: FetchConnector;
  refreshTokenCookie?: string;
  getTokens?: GetTokens;
}

export class AuthClient {
  public cookie: string;
  public cookieOptions?: CookieOptions;
  public decode: Decode;
  public fetch?: FetchConnector;

  private refreshTokenCookie?: string;
  private getTokens: GetTokens;
  private clientATFetch?: Promise<string>;

  constructor(options: AuthClientOptions) {
    // Public
    this.cookie = options.cookie || AT_COOKIE;
    this.cookieOptions = options.cookieOptions;
    this.decode = options.decode;
    this.fetch = options.fetchConnector;
    // Private
    this.refreshTokenCookie = options.refreshTokenCookie;
    this.getTokens = options.getTokens || this._getTokens;
  }
  /**
   * Returns the accessToken from cookies
   */
  public getAccessToken() {
    return Cookies.get(this.cookie);
  }
  /**
   * Decodes an accessToken and returns his payload or null
   */
  public decodeAccessToken(accessToken: string) {
    return (accessToken && this.decode(accessToken)) || null;
  }
  /**
   * Sets an accessToken as a cookie and returns the accessToken
   */
  public setAccessToken(accessToken: string) {
    if (!accessToken) return;

    Cookies.set(this.cookie, accessToken, {
      expires: 365,
      secure: location.protocol === 'https:',
      ...this.getCookieOptions(accessToken)
    });

    return accessToken;
  }
  /**
   * Removes the accessToken from cookies
   */
  public removeAccessToken() {
    Cookies.remove(this.cookie, this.getCookieOptions());
  }
  /**
   * Logouts the user, this means remove both accessToken and refreshToken from
   * cookies
   */
  public async logout() {
    if (typeof window === 'undefined') return;
    if (!this.fetch) {
      this.removeAccessToken();
      return { done: true };
    }

    return this.fetch.logout({ credentials: 'same-origin' }).then(json => {
      this.removeAccessToken();
      return json;
    });
  }
  /**
   * Returns a new accessToken
   * @param req Sending a Request means the token will be created during SSR
   */
  public async fetchAccessToken(req?: IncomingMessage) {
    try {
      return await (req ? this.fetchServerToken(req) : this.fetchClientToken());
    } catch (err) {
      const isFetchError = err.name === 'FetchError';
      const isNetworkError = err.name === 'NetworkError';

      // Don't ignore unknown errors
      if (!isFetchError && !isNetworkError) throw err;
      // Ignore errors in the server
      if (req) return;
      if (!isFetchError) throw err;
      // Remove the accessToken that caused a FetchError
      this.removeAccessToken();
    }
  }
  /**
   * Returns true if a refreshToken cookie is defined
   */
  public withRefreshToken() {
    return !!this.refreshTokenCookie;
  }
  /**
   * Returns the accessToken on SSR from cookies, if no token exists or its
   * invalid then it will fetch a new accessToken
   */
  private async fetchServerToken(req: IncomingMessage) {
    if (!this.fetch) return;
    if (!this.withRefreshToken()) return;

    const tokens = this.getTokens(req);
    if (!tokens || !tokens.refreshToken) return;

    const accessToken = this.verifyAccessToken(tokens.accessToken || '');
    if (accessToken) return accessToken;

    const data = await this.fetch.createAccessToken({
      // This may have side effects
      headers: req.headers as { [key: string]: string }
    });

    return data.accessToken;
  }
  /**
   * Returns the accessToken from cookies, if no token exists or its
   * invalid then it will fetch a new accessToken
   */
  private async fetchClientToken() {
    if (!this.fetch) return;
    if (!this.withRefreshToken()) return;

    const _accessToken = this.getAccessToken();
    // If the browser doesn't have an accessToken in cookies then don't try to
    // create a new one
    if (!_accessToken) return;

    const accessToken = this.verifyAccessToken(_accessToken);
    if (accessToken) return accessToken;
    // In this case the accessToken in cookies is invalid and we should create
    // a new one, the promise is reused for the case of when the method is
    // called multiple times
    if (this.clientATFetch) return this.clientATFetch;

    this.clientATFetch = this.fetch
      .createAccessToken({
        credentials: 'same-origin'
      })
      .then(data => {
        this.clientATFetch = undefined;
        this.setAccessToken(data.accessToken);

        return data.accessToken;
      });

    return this.clientATFetch;
  }
  /**
   * Verifies and returns an accessToken if it's still valid
   */
  private verifyAccessToken(accessToken: string) {
    if (accessToken && this.decodeAccessToken(accessToken)) {
      return accessToken;
    }
  }
  /**
   * Returns the cookie options that will be used to set an accessToken,
   * accessToken will be undefined when removing a cookie
   */
  private getCookieOptions(accessToken?: string) {
    const { cookieOptions } = this;

    return cookieOptions && typeof cookieOptions === 'function'
      ? cookieOptions(accessToken)
      : cookieOptions;
  }
  /**
   * Gets the tokens from a Request
   */
  private _getTokens(req: IncomingMessage) {
    const parseCookie = require('cookie').parse;
    const { cookie } = req.headers;
    const cookies = cookie && parseCookie(cookie);

    if (!cookies) return;

    return {
      refreshToken: this.refreshTokenCookie && cookies[this.refreshTokenCookie],
      accessToken: cookies[this.cookie]
    };
  }
}
