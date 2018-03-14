import unfetch from 'isomorphic-unfetch';
import { FetchConnector, FetchError, NetworkError } from './utils';

// this is related to a bug
// https://stackoverflow.com/questions/44720448/fetch-typeerror-failed-to-execute-fetch-on-window-illegal-invocation
const fetch = unfetch;

export interface HttpConnectorOptions {
  refreshAccessTokenUri: string;
  logoutUri: string;
}

export default class HttpConnector implements FetchConnector {
  private refreshAccessTokenUri: string;
  private logoutUri: string;

  constructor(options: HttpConnectorOptions) {
    this.refreshAccessTokenUri = options.refreshAccessTokenUri;
    this.logoutUri = options.logoutUri;
  }

  public createAccessToken(
    fetchOptions: RequestInit
  ): Promise<{ accessToken: string }> {
    return this.fetch(this.refreshAccessTokenUri, fetchOptions);
  }

  public logout(fetchOptions: RequestInit): Promise<{ done: boolean }> {
    return this.fetch(this.logoutUri, fetchOptions);
  }

  private async fetch(url: string, fetchOptions: RequestInit) {
    let res: Response;

    try {
      res = await fetch(url, fetchOptions);
    } catch (err) {
      throw new NetworkError();
    }

    if (res.status >= 200 && res.status < 300) {
      return res.json();
    }

    const contentType = res.headers.get('Content-Type');

    if (contentType && contentType.includes('application/json')) {
      const errorData = await res.json();
      throw new FetchError(res, errorData);
    }

    throw new FetchError(res);
  }
}
