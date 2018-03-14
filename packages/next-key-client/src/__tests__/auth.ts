import { AuthClient } from '..';
import { ACCESS_TOKEN, basicAuth, decode, fetchConnector } from '../testUtils';

describe('Creates the auth client', () => {
  it('Can use the minimum options', () => {
    expect(basicAuth).toEqual({
      cookie: 'a_t',
      cookieOptions: undefined,
      decode,
      fetch: undefined,
      getTokens: expect.any(Function),
      refreshTokenCookie: undefined
    });
  });

  it('Can use all configs', () => {
    const getTokens = () => {
      // Do nothing
    };
    const client = new AuthClient({
      cookie: 'custom_at',
      cookieOptions: { secure: false },
      decode,
      fetchConnector,
      refreshTokenCookie: 'custom_rt',
      getTokens
    });

    expect(client).toEqual({
      cookie: 'custom_at',
      cookieOptions: { secure: false },
      decode,
      fetch: fetchConnector,
      refreshTokenCookie: 'custom_rt',
      getTokens: expect.any(Function)
    });
  });

  it('Can use a function in cookie options', () => {
    expect.assertions(2);

    const client = new AuthClient({
      decode,
      cookieOptions(accessToken?: string) {
        expect(accessToken).toBe(ACCESS_TOKEN);
        return { secure: false };
      }
    });

    expect(typeof client.cookieOptions).toBe('function');
    // this will call cookieOptions
    client.setAccessToken(ACCESS_TOKEN);
  });
});
