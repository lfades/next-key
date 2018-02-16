import fetch from 'isomorphic-unfetch';
import { FetchConnector, FetchError } from './utils';

export interface HttpConnectorOptions {
  createAccessTokenUrl: string;
  setAccessTokenUrl: string;
  logoutUrl: string;
}

export default class HttpConnector implements FetchConnector {
  public createAccessTokenUrl: string;
  public setAccessTokenUrl: string;
  public logoutUrl: string;

  constructor(options: HttpConnectorOptions) {
    this.createAccessTokenUrl = options.createAccessTokenUrl;
    this.setAccessTokenUrl = options.setAccessTokenUrl;
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

  private fetch(url: string, fetchOptions: RequestInit) {
    return fetch(url, fetchOptions).then(res => {
      if (res.status === 200) {
        return res.json();
      }
      throw new FetchError(res);
    });
  }
}
