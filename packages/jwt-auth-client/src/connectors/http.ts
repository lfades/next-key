import fetch from 'isomorphic-unfetch';
import FetchError from './fetchError';

export interface HttpConnectorOptions {
  createAccessTokenUrl: string;
  setAccessTokenUrl: string;
  logoutUrl: string;
}

export default class HttpConnector {
  public createAccessTokenUrl: string;
  public setAccessTokenUrl: string;
  public logoutUrl: string;

  constructor(options: HttpConnectorOptions) {
    this.createAccessTokenUrl = options.createAccessTokenUrl;
    this.setAccessTokenUrl = options.setAccessTokenUrl;
    this.logoutUrl = options.logoutUrl;
  }

  public fetchUrl(url: string, fetchOptions: RequestInit) {
    return fetch(url, fetchOptions).then(res => {
      if (res.status === 200) {
        return res.json();
      }
      throw new FetchError(res);
    });
  }

  public createAccessToken(fetchOptions: RequestInit) {
    return this.fetchUrl(this.createAccessTokenUrl, fetchOptions);
  }

  public setAccessToken(accessToken: string, fetchOptions: RequestInit) {
    return this.fetchUrl(
      this.setAccessTokenUrl + '?at=' + accessToken,
      fetchOptions
    );
  }

  public logout(fetchOptions: RequestInit) {
    return this.fetchUrl(this.logoutUrl, fetchOptions);
  }
}
