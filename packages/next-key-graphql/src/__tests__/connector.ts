import { AuthConnector, GraphqlAuth, RequestLike } from '..';
import {
  ACCESS_TOKEN,
  AccessToken,
  RefreshToken,
  testRequest,
  user,
  userPayload,
  validScope
} from '../testUtils';

describe('Auth Connector', () => {
  const auth = new GraphqlAuth({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken()
  });
  const LoginRequired = new AuthConnector.errors.LoginRequired();
  const ScopeRequired = new AuthConnector.errors.ScopeRequired();
  const getConnector = (authorization?: string) => {
    const req = { headers: authorization ? { authorization } : {} };
    const connector = new AuthConnector({ auth, req });

    if (authorization) connector.verify();

    return connector;
  };

  it('Creates the connnector with all possible options', async () => {
    expect.assertions(1);

    await testRequest((req: RequestLike, res) => {
      req.user = userPayload;
      const errors = AuthConnector.errors;
      const connector = new AuthConnector({ auth, req, res, errors });

      expect(connector).toEqual({
        auth: expect.any(GraphqlAuth),
        req: expect.anything(),
        res: expect.anything(),
        errors: expect.anything(),
        user: userPayload
      });
    });
  });

  it('Creates the connector with the minimum options', () => {
    const connector = getConnector();

    expect(connector).toEqual({
      auth: expect.any(GraphqlAuth),
      req: expect.anything(),
      res: undefined,
      errors: expect.anything(),
      user: undefined
    });
  });

  describe('getPayload', () => {
    it('Returns undefined if no Authorization header is set', () => {
      const connector = getConnector();

      expect(connector.getPayload()).toBeUndefined();
    });

    it('Returns the payload', () => {
      const connector = getConnector('Bearer ' + ACCESS_TOKEN);

      expect(connector.getPayload()).toEqual(userPayload);
      expect(connector.user).toEqual(userPayload);
    });

    it('Caches the user', () => {
      const connector = getConnector();

      connector.user = userPayload;

      expect(connector.getPayload()).toEqual(userPayload);
    });
  });

  describe('hasScope', () => {
    it('Throws an error if accessToken.scope is undefined', () => {
      const connector = getConnector();
      const fn = connector.hasScope.bind(connector, validScope);

      connector.auth = new GraphqlAuth({
        accessToken: Object.assign(new AccessToken(), { scope: undefined })
      });

      expect(fn).toThrowError();
    });

    it('Returns false if user is undefined', () => {
      const connector = getConnector();

      expect(connector.hasScope(validScope)).toBe(false);
    });

    it('Returns false if the user does not have the requested scope', () => {
      const connector = getConnector('Bearer ' + ACCESS_TOKEN);

      expect(connector.hasScope('xxx')).toBe(false);
    });

    it('Returns true if the user has the requested scope', () => {
      const connector = getConnector('Bearer ' + ACCESS_TOKEN);

      expect(connector.hasScope(validScope)).toBe(true);
    });
  });

  describe('checkScope', () => {
    it('Throws an error if user is undefined', () => {
      const connector = getConnector();
      const fn = connector.checkScope.bind(connector, validScope);

      expect(fn).toThrowError(LoginRequired);
    });

    it('Throws an error if the user does not have the requested scope', () => {
      const connector = getConnector();
      const fn = connector.checkScope.bind(connector, 'xxx');

      connector.user = userPayload;

      expect(fn).toThrowError(ScopeRequired);
    });

    it('Returns undefined if the user has the requested scope', () => {
      const connector = getConnector();

      connector.user = userPayload;

      expect(connector.checkScope(validScope)).toBeUndefined();
    });
  });

  it('Updates the user', () => {
    const connector = getConnector();

    connector.user = userPayload;
    connector.scope = validScope;
    connector.updateUser({ name: 'Luis' });

    expect(connector.user).toEqual({ name: 'Luis' });
    expect(connector.scope).toBeUndefined();
  });

  describe('getUser', () => {
    it('Throws an error if user is undefined', () => {
      const connector = getConnector();

      expect(connector.getUser.bind(connector)).toThrowError(LoginRequired);
    });

    it('Returns the user', () => {
      const connector = getConnector('Bearer ' + ACCESS_TOKEN);

      expect(connector.getUser()).toEqual(userPayload);
    });
  });

  it('Returns the userId', () => {
    const connector = getConnector('Bearer ' + ACCESS_TOKEN);

    expect(connector.userId()).toBe(userPayload.id);
  });

  describe('logout', () => {
    it('Does nothing if res is undefined', async () => {
      const connector = getConnector();

      expect(await connector.logout()).toEqual({ done: false });
    });

    it('Logouts the user', async () => {
      expect.assertions(1);

      const refreshToken = await auth.createRefreshToken(user);
      const cookie = auth.serializeRefreshToken(refreshToken);

      await testRequest(async (req, res) => {
        const connector = new AuthConnector({ auth, req, res });

        expect(await connector.logout()).toEqual({ done: true });
      }).set('Cookie', cookie);
    });
  });

  describe('refreshAccessToken', () => {
    it('Does nothing if res is undefined', async () => {
      const connector = getConnector();

      expect(await connector.refreshAccessToken()).toBeUndefined();
    });

    it('Refreshes the accessToken', async () => {
      expect.assertions(1);

      const refreshToken = await auth.createRefreshToken(user);
      const cookie = auth.serializeRefreshToken(refreshToken);

      await testRequest(async (req, res) => {
        const connector = new AuthConnector({ auth, req, res });

        expect(await connector.refreshAccessToken()).toEqual({
          accessToken: expect.any(String)
        });
      }).set('Cookie', cookie);
    });
  });
});
