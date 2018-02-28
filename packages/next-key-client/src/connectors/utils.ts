const NETWORK_ERROR_CODE = 'network_error';
const NETWORK_ERROR_MESSAGE = 'A network error has occurred. Please retry';
/**
 * Connector used by the authentication client to connect to a server
 */
export interface FetchConnector {
  /**
   * Creates an accessToken
   */
  createAccessToken(
    fetchOptions: RequestInit
  ): Promise<{ accessToken: string }>;
  /**
   * Logouts the user by removing the refreshToken
   */
  logout(fetchOptions: RequestInit): Promise<{ done: boolean }>;
}
/**
 * A fetch returns an error
 */
export class FetchError extends Error {
  public res: Response;
  public status: number;
  public code: string | number;

  constructor(
    res: Response,
    data?: { message?: string; code?: string | number }
  ) {
    super((data && data.message) || res.statusText);

    this.name = 'FetchError';
    this.status = res.status;
    this.code = (data && data.code) || res.status;
    this.res = res;
  }
}
/**
 * A fetch fails
 */
export class NetworkError extends Error {
  public code: string;

  constructor() {
    super(NETWORK_ERROR_MESSAGE);

    this.name = 'NetworkError';
    this.code = NETWORK_ERROR_CODE;
  }
}
