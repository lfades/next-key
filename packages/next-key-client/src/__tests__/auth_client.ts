import express from 'express';
import { Server } from 'http';
import jwtDecode from 'jwt-decode';
import { AuthClient, HttpConnector } from '..';

describe('Auth Client', () => {
  const PORT = 5002;
  const URL = 'http://localhost:' + PORT;

  let server: Server;

  const accessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxOTA2MjY4MH0.FPnQLylqy7hfTLULsNDLNhaswFD3HI7zxRt6G-u3h9s';
  const app = express();
  const authClient = new AuthClient({
    decode(at) {
      try {
        return jwtDecode(at);
      } catch {
        return;
      }
    },
    refreshTokenCookie: 'r_t',
    fetchConnector: new HttpConnector({
      createAccessTokenUrl: URL + '/accessToken',
      logoutUrl: URL + '/logout'
    })
  });

  app.get('/accessToken', (_req, res) => {
    res.json({ accessToken: 'newToken' });
  });

  app.get('/accessToken/late', (_req, res) => {
    setTimeout(() => {
      res.json({ accessToken: Math.random().toString(36) });
    }, 500);
  });

  app.get('/logout', (_req, res) => {
    res.json({ done: true });
  });

  app.get('/error', (_req, res) => {
    res.status(400).json({ message: 'failed' });
  });

  beforeAll(() => {
    server = app.listen(PORT);
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    authClient.removeAccessToken();
  });

  describe('Can use custom options', () => {
    it('Can use custom cookies and cookie options', () => {
      const client = new AuthClient({
        decode: authClient.decode,
        fetchConnector: authClient.fetch,
        cookie: 'custom',
        refreshTokenCookie: 'custom', // this one is private
        cookieOptions: { secure: false }
      });

      expect(client.cookie).toBe('custom');
      expect(client.cookieOptions).toEqual({ secure: false });
    });

    it('Can use a function in cookieOptions', () => {
      expect.assertions(2);

      const client = new AuthClient({
        decode: authClient.decode,
        fetchConnector: authClient.fetch,
        cookieOptions(at?: string) {
          expect(at).toBe(accessToken);
          return { secure: false };
        }
      });

      expect(typeof client.cookieOptions).toBe('function');
      client.setAccessToken(accessToken);
    });
  });

  it('Adds an accessToken to cookies', () => {
    expect(authClient.setAccessToken('')).toBeUndefined();
    expect(authClient.setAccessToken(accessToken)).toBe(accessToken);
  });

  it('Returns the accessToken from cookies', () => {
    expect(authClient.getAccessToken()).toBeUndefined();

    authClient.setAccessToken(accessToken);

    expect(authClient.getAccessToken()).toBe(accessToken);
  });

  it('Removes the accessToken', () => {
    authClient.setAccessToken(accessToken);

    expect(authClient.getAccessToken()).toBe(accessToken);
    expect(authClient.removeAccessToken()).toBeUndefined();
    expect(authClient.getAccessToken()).toBeUndefined();
  });

  it('Decodes an accessToken', () => {
    expect(authClient.decodeAccessToken('')).toBeNull();
    expect(authClient.decodeAccessToken('invalid')).toBeNull();
    expect(authClient.decodeAccessToken(accessToken)).toEqual({
      uId: 'user_123',
      cId: 'company_123',
      scope: 'a:r:w',
      iat: 1519062680
    });
  });

  it('Logouts', async () => {
    authClient.setAccessToken(accessToken);

    expect(authClient.getAccessToken()).toBe(accessToken);
    expect(await authClient.logout()).toEqual({ done: true });
    expect(authClient.getAccessToken()).toBeUndefined();
  });

  describe('fetch a new accessToken', () => {
    it('Returns undefined if refreshTokenCookie is undefined', async () => {
      const client = new AuthClient({
        decode: authClient.decode,
        fetchConnector: authClient.fetch
      });

      client.setAccessToken('invalid');
      expect(await client.fetchAccessToken()).toBeUndefined();
    });

    it('Returns undefined if no current token is present', async () => {
      expect(await authClient.fetchAccessToken()).toBeUndefined();
    });

    it('Should use the current token if its still valid', async () => {
      authClient.setAccessToken(accessToken);
      expect(await authClient.fetchAccessToken()).toBe(accessToken);
    });

    it('Returns a new token', async () => {
      authClient.setAccessToken('invalid');
      expect(await authClient.fetchAccessToken()).toBe('newToken');
    });

    it('Should use the same fetch when called multiple times', async () => {
      const client = new AuthClient({
        decode: authClient.decode,
        refreshTokenCookie: 'r_t',
        fetchConnector: new HttpConnector({
          createAccessTokenUrl: URL + '/accessToken/late',
          logoutUrl: 'x'
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
        // this will make decode fails
      },
      refreshTokenCookie: 'r_t',
      fetchConnector: new HttpConnector({
        createAccessTokenUrl: URL + '/error',
        logoutUrl: URL + '/error'
      })
    });

    it('When the logout fails', async () => {
      client.setAccessToken(accessToken);

      expect.assertions(3);

      try {
        await client.logout();
      } catch (e) {
        expect(client.getAccessToken()).toBe(accessToken);
        expect(e.name).toBe('FetchError');
        expect(e.res).toBeDefined();
      }
    });

    it('When a fetch for a new accessToken fails', async () => {
      client.setAccessToken(accessToken);

      expect.assertions(3);

      try {
        await client.fetchAccessToken();
      } catch (e) {
        expect(client.getAccessToken()).toBe(accessToken);
        expect(e.name).toBe('FetchError');
        expect(e.res).toBeDefined();
      }
    });
  });
});
