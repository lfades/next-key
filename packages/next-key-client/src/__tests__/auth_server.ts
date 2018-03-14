/**
 * @jest-environment node
 */
import { AuthClient, HttpConnector } from '..';
import {
  ACCESS_TOKEN,
  AT_COOKIE,
  basicAuth,
  createServer,
  decode,
  RT_COOKIE
} from '../testUtils';

describe('Auth Server', () => {
  const { server, authClient, url } = createServer();

  afterAll(() => {
    server.close();
  });

  const accessTokenCookie = `${AT_COOKIE}=${ACCESS_TOKEN}`;
  const refreshTokenCookie = `${RT_COOKIE}=xxx`;
  const request: any = {
    headers: {
      cookie: `${accessTokenCookie};${refreshTokenCookie}`
    }
  };

  it('Returns undefined when trying to logout', async () => {
    expect(await authClient.logout()).toBeUndefined();
  });

  describe('fetch a new accessToken', () => {
    it('Returns undefined if this.fetch is undefined', async () => {
      expect(await basicAuth.fetchAccessToken(request)).toBeUndefined();
    });

    it('Returns undefined if refreshTokenCookie is undefined', async () => {
      const client = new AuthClient({
        decode,
        fetchConnector: authClient.fetch
      });

      expect(await client.fetchAccessToken(request)).toBeUndefined();
    });

    it('Returns undefined if no refreshToken is present', async () => {
      const req: any = { headers: {} };

      expect(await authClient.fetchAccessToken(req)).toBeUndefined();
    });

    it('Should use the current accessToken if its still valid', async () => {
      expect(await authClient.fetchAccessToken(request)).toBe(ACCESS_TOKEN);
    });

    it('Returns a new token', async () => {
      const req: any = { headers: { cookie: refreshTokenCookie } };

      expect(await authClient.fetchAccessToken(req)).toBe('newToken');
    });

    it('Ignores any known error during SSR', async () => {
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

      expect(await client.fetchAccessToken(request)).toBeUndefined();
    });

    it('Throws unexpected errors', async () => {
      // this request doesn't have headers, it will cause an error
      const req: any = {};

      expect.assertions(1);

      try {
        await authClient.fetchAccessToken(req);
      } catch (e) {
        // Cannot read property 'cookie' of undefined
        expect(e.name).toBe('TypeError');
      }
    });
  });
});
