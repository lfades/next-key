import unfetch from 'isomorphic-unfetch';
import { FetchConnector, FetchError, NetworkError } from './utils';

// this is related to a bug
// https://stackoverflow.com/questions/44720448/fetch-typeerror-failed-to-execute-fetch-on-window-illegal-invocation
const fetch = unfetch;

export interface HttpConnectorOptions {
  createAccessTokenUrl: string;
  logoutUrl: string;
}

export default class HttpConnector implements FetchConnector {
  private createAccessTokenUrl: string;
  private logoutUrl: string;

  constructor(options: HttpConnectorOptions) {
    this.createAccessTokenUrl = options.createAccessTokenUrl;
    this.logoutUrl = options.logoutUrl;
  }

  public createAccessToken(
    fetchOptions: RequestInit
  ): Promise<{ accessToken: string }> {
    return this.fetch(this.createAccessTokenUrl, fetchOptions);
  }

  public logout(fetchOptions: RequestInit): Promise<{ done: boolean }> {
    return this.fetch(this.logoutUrl, fetchOptions);
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

    throw new NetworkError(res);
  }
}
