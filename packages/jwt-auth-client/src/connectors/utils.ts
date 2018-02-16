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
 * Custom error for when a fetch fails
 */
export class FetchError extends Error {
  public response: Response;

  constructor(res: Response) {
    super(res.statusText);

    this.response = res;
  }
}
