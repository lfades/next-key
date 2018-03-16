export interface AuthServerOptions<CookieOptions = StringAnyMap> {
  accessToken: AuthAccessToken<CookieOptions>;
  refreshToken?: AuthRefreshToken<CookieOptions>;
  payload?: AuthPayload;
  scope?: AuthScope;
}

export interface AuthAccessToken<CookieOptions = StringAnyMap> {
  /**
   * Name of the cookie for the accessToken
   */
  cookie?: string;
  /**
   * Returns the cookie options that will be used before creating or removing an
   * accessToken as a cookie
   * @param accessToken will be an empty string when removing the cookie
   */
  cookieOptions?: CookieOptions | ((accessToken: string) => CookieOptions);
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
}

export interface AuthRefreshToken<CookieOptions = StringAnyMap> {
  /**
   * Name of the cookie for the refreshToken
   */
  cookie?: string;
  /**
   * Returns the cookie options that will be used before creating or removing an
   * refreshToken as a cookie
   * @param refreshToken will be an empty string when removing the cookie
   */
  cookieOptions?: CookieOptions | ((refreshToken: string) => CookieOptions);
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
}

export interface AuthScope {
  create(scope: string[]): string;
  parse(scope: string): string[];
  has(scope: string[], perm: string | string[]): boolean;
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
