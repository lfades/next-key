export interface AuthServerOptions<CookieOptions = StringAnyMap> {
  accessToken: AuthAccessToken<CookieOptions>;
  refreshToken?: AuthRefreshToken<CookieOptions>;
  payload?: AuthPayload;
  scope?: AuthScope;
}

export interface AuthAccessToken<CookieOptions = StringAnyMap> {
  /**
   * Creates a payload based in some data
   */
  getPayload?(data: StringAnyMap): StringAnyMap;
  /**
   * Creates the accessToken
   */
  create?(payload: StringAnyMap): string;
  /**
   * Verifies an accessToken and returns its payload
   */
  verify?(accessToken: string): StringAnyMap;
  /**
   * Returns the cookie options that will be used before creating or removing an
   * accessToken as a cookie
   * @param accessToken will be an empty string when removing the cookie
   */
  setCookie?(
    accesssToken: string,
    options: CookieOptions
  ):
    | {
        cookieName?: string;
        cookieOptions?: CookieOptions;
      }
    | undefined;
}

export interface AuthRefreshToken<CookieOptions = StringAnyMap> {
  cookieOptions?:
    | CookieOptions
    | ((refreshToken: string | null) => CookieOptions);
  /**
   * Returns the payload in a refreshToken that can be used to create an
   * accessToken
   * @param reset Refresh the cookie of a refreshToken
   */
  getPayload(
    refreshToken: string,
    reset: () => void
  ): Promise<StringAnyMap | void>;
  /**
   * Creates the refreshToken
   */
  create(data: StringAnyMap): Promise<string>;
  /**
   * Removes the refreshToken
   */
  remove(refreshToken: string): Promise<boolean> | boolean;
  /**
   * Returns the cookie options that will be used before creating or removing a
   * refreshToken as a cookie
   * @param refreshToken will be an empty string when removing the cookie
   */
  setCookie?(
    refreshToken: string,
    options: CookieOptions
  ):
    | {
        cookieName?: string;
        cookieOptions?: CookieOptions;
      }
    | undefined;
}

export interface AuthScope {
  create(scope: string[]): string;
  parse(scope: string): string[];
}

export interface AuthPayload {
  create(payload: StringAnyMap): StringAnyMap;
  parse(reversePayload: StringAnyMap): StringAnyMap;
}

export interface StringStringMap {
  [key: string]: string;
}

export interface StringAnyMap {
  [key: string]: any;
}
