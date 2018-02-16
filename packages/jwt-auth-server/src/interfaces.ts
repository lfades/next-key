export interface AuthServerOptions {
  accessToken: IAccessToken;
  refreshToken: IRefreshToken;
  payload?: IAuthPayload;
  scope?: IAuthScope;
}

export interface IAccessToken {
  /**
   * Creates a payload based in some data
   */
  buildPayload(data: StringAnyMap): StringAnyMap;
  /**
   * Creates the accessToken
   */
  create(payload: StringAnyMap): string;
  /**
   * Verifies an accessToken and returns its payload
   */
  verify(accessToken: string): StringAnyMap;
}

export interface IRefreshToken {
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

export interface IAuthScope {
  create(scope: string[]): string;
  parse(scope: string): string[];
}

export interface IAuthPayload {
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
