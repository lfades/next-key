export interface AuthServerOptions {
  accessToken: AuthAccessToken;
  refreshToken?: AuthRefreshToken;
  payload?: AuthPayload;
  scope?: AuthScope;
}

export interface AuthAccessToken {
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

export interface AuthRefreshToken {
  cookie?: string;
  cookieOptions?: CookieOptions | ((refreshToken: string) => CookieOptions);
  /**
   * Returns the payload in a refreshToken that can be used to create an
   * accessToken
   * @param reset Refresh the cookie of a refreshToken
   */
  getPayload(refreshToken: string, reset: () => void): Promise<StringAnyMap>;
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

export interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date | boolean;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean | 'auto';
  encode?: (val: string) => void;
  sameSite?: boolean | string;
}
