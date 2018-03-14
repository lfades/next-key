import { AuthClient, HttpConnector } from '..';
import {
  ACCESS_TOKEN,
  basicAuth,
  createServer,
  decode,
  RT_COOKIE
} from '../testUtils';

describe('Auth Client', () => {
  const { server, authClient, url } = createServer();

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    authClient.removeAccessToken();
  });

  it('Returns the accessToken from cookies', () => {
    expect(authClient.getAccessToken()).toBeUndefined();

    authClient.setAccessToken(ACCESS_TOKEN);

    expect(authClient.getAccessToken()).toBe(ACCESS_TOKEN);
  });

  it('Decodes an accessToken', () => {
    expect(authClient.decodeAccessToken('')).toBeNull();
    expect(authClient.decodeAccessToken('invalid')).toBeNull();
    expect(authClient.decodeAccessToken(ACCESS_TOKEN)).toEqual({
      uId: 'user_123',
      cId: 'company_123',
      scope: 'a:r:w',
      iat: 1519062680
    });
  });

  it('Adds an accessToken to cookies', () => {
    expect(authClient.setAccessToken('')).toBeUndefined();
    expect(authClient.setAccessToken(ACCESS_TOKEN)).toBe(ACCESS_TOKEN);
  });

  it('Removes the accessToken', () => {
    authClient.setAccessToken(ACCESS_TOKEN);

    expect(authClient.getAccessToken()).toBe(ACCESS_TOKEN);
    expect(authClient.removeAccessToken()).toBeUndefined();
    expect(authClient.getAccessToken()).toBeUndefined();
  });

  describe('Logout', () => {
    it('Returns undefined if this.fetch is undefined', async () => {
      authClient.setAccessToken(ACCESS_TOKEN);

      expect(await basicAuth.logout()).toBeUndefined();
      expect(authClient.getAccessToken()).toBeUndefined();
    });

    it('logouts the user', async () => {
      authClient.setAccessToken(ACCESS_TOKEN);

      expect(await authClient.logout()).toEqual({ done: true });
      expect(authClient.getAccessToken()).toBeUndefined();
    });
  });

  describe('fetch a new accessToken', () => {
    it('Returns undefined if this.fetch is undefined', async () => {
      expect(await basicAuth.fetchAccessToken()).toBeUndefined();
    });

    it('Returns undefined if refreshTokenCookie is undefined', async () => {
      const client = new AuthClient({
        decode,
        fetchConnector: authClient.fetch
      });

      expect(await client.fetchAccessToken()).toBeUndefined();
    });

    it('Returns undefined if no accessToken is present', async () => {
      expect(await authClient.fetchAccessToken()).toBeUndefined();
    });

    it('Should use the current accessToken if its still valid', async () => {
      authClient.setAccessToken(ACCESS_TOKEN);
      expect(await authClient.fetchAccessToken()).toBe(ACCESS_TOKEN);
    });

    it('Returns a new token', async () => {
      authClient.setAccessToken('xxx');
      expect(await authClient.fetchAccessToken()).toBe('newToken');
    });

    it('Removes the accessToken and not throws a fetchError', async () => {
      const client = new AuthClient({
        decode() {
          // this will make decode fail
        },
        refreshTokenCookie: RT_COOKIE,
        fetchConnector: new HttpConnector({
          createAccessTokenUrl: url + '/error',
          logoutUrl: ''
        })
      });

      client.setAccessToken(ACCESS_TOKEN);

      expect(await client.fetchAccessToken()).toBeUndefined();
      expect(client.getAccessToken()).toBeUndefined();
    });

    it('Should use the same fetch when called multiple times', async () => {
      const client = new AuthClient({
        decode,
        refreshTokenCookie: RT_COOKIE,
        fetchConnector: new HttpConnector({
          createAccessTokenUrl: url + '/accessToken/late',
          logoutUrl: ''
        })
      });

      client.setAccessToken('invalid');

      const tokens = await Promise.all([
        client.fetchAccessToken(),
        client.fetchAccessToken(),
        client.fetchAccessToken()
      ]);
      const firstToken = tokens[0];

      expect(firstToken).toBeTruthy();
      expect(tokens).toEqual([firstToken, firstToken, firstToken]);
    });
  });

  describe('Throws an error', () => {
    const client = new AuthClient({
      decode() {
        // this will make decode fail
      },
      refreshTokenCookie: RT_COOKIE,
      fetchConnector: new HttpConnector({
        createAccessTokenUrl: '', // NetworkError
        logoutUrl: url + '/error'
      })
    });

    it('When the logout fails', async () => {
      client.setAccessToken(ACCESS_TOKEN);

      expect.assertions(3);

      try {
        await client.logout();
      } catch (e) {
        expect(client.getAccessToken()).toBe(ACCESS_TOKEN);
        expect(e.name).toBe('FetchError');
        expect(e.res).toBeDefined();
      }
    });

    it('When a fetch for a new accessToken throws a NetworkError', async () => {
      client.setAccessToken(ACCESS_TOKEN);

      expect.assertions(2);

      try {
        await client.fetchAccessToken();
      } catch (e) {
        expect(client.getAccessToken()).toBe(ACCESS_TOKEN);
        expect(e.name).toBe('NetworkError');
      }
    });
  });
});
