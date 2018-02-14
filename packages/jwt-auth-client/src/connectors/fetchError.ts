/**
 * Custom error for when a fetch fails
 */
export default class FetchError extends Error {
  public response: Response;

  constructor(res: Response) {
    super(res.statusText);

    this.response = res;
  }
}
