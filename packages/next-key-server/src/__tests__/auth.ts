import jwt from 'jsonwebtoken';
import {
  AuthAccessToken,
  AuthRefreshToken,
  AuthServer,
  Payload,
  Scope
} from '../';

describe('Auth Server', () => {
  const ONE_MINUTE = 1000 * 60;
  const ONE_DAY = ONE_MINUTE * 60 * 24;
  const ONE_MONTH = ONE_DAY * 30;
  const ACCESS_TOKEN_SECRET = 'password';
  const refreshTokens = new Map();

  class AccessToken implements AuthAccessToken {
    public buildPayload({
      id,
      companyId,
      admin
    }: {
      id: string;
      companyId: string;
      admin: boolean;
    }) {
      const scope = admin
        ? authScope.create(['admin:read', 'admin:write'])
        : '';
      return { id, companyId, scope };
    }
    public create(payload: { uId: string; cId: string; scope: string }) {
      return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: '20m'
      });
    }
    public verify(accessToken: string) {
      const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256'],
        clockTolerance: 80 // seconds to tolerate
      });

      // This should never happen cause our payload is a valid JSON
      if (typeof payload === 'string') return {};

      return payload;
    }
  }

  class RefreshToken implements AuthRefreshToken {
    public async getPayload(refreshToken: string, reset: () => any) {
      reset();
      return refreshTokens.get(refreshToken);
    }
    public async create({ id: userId }: { id: string }) {
      const id = Date.now().toString();

      refreshTokens.set(id, {
        userId,
        expireAt: new Date(Date.now() + ONE_MONTH)
      });

      return id;
    }
    public remove(refreshToken: string) {
      return refreshTokens.delete(refreshToken);
    }
  }

  const authPayload = new Payload({
    uId: 'id',
    cId: 'companyId',
    scope: 'scope'
  });

  const authScope = new Scope({
    admin: 'a'
  });

  const authServer = new AuthServer({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken(),
    payload: authPayload,
    scope: authScope
  });

  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxODE0MTIzNCwiZXhwIjoxNTE4MTQyNDM0fQ.3ZRmx08htMX5KLsv8VhBVD8vjxHzWOiDDli7JXFf83Q';

  // Payload to create a token
  const userPayload = {
    id: 'user_123',
    companyId: 'company_123',
    admin: true
  };

  // Payload got from a token
  const tokenPayload = {
    id: userPayload.id,
    companyId: userPayload.companyId,
    scope: 'a:r:w'
  };

  it('should set a default scope and payload', () => {
    const auth = new AuthServer({
      accessToken: new AccessToken(),
      refreshToken: new RefreshToken()
    });

    expect(auth.scope).toBeInstanceOf(Scope);
    expect(auth.payload).toBeInstanceOf(Payload);
  });

  it('creates an accessToken', () => {
    expect(authServer.createAccessToken(userPayload)).toEqual({
      accessToken: expect.any(String),
      payload: tokenPayload
    });
  });

  it('creates a refreshToken', async () => {
    expect(typeof await authServer.createRefreshToken(userPayload)).toBe(
      'string'
    );
  });

  it('creates both tokens', async () => {
    expect(await authServer.createTokens(userPayload)).toEqual({
      refreshToken: expect.any(String),
      accessToken: expect.any(String),
      payload: tokenPayload
    });
  });

  it('gets the payload for an accessToken', async () => {
    const refreshToken = await authServer.createRefreshToken(userPayload);
    const reset = () => {
      // do nothing
    };

    expect(await authServer.getPayload(refreshToken, reset)).toEqual({
      userId: userPayload.id,
      expireAt: refreshTokens.get(refreshToken).expireAt
    });
  });

  it('Removes a refreshToken', async () => {
    const refreshToken = await authServer.createRefreshToken(userPayload);

    expect(authServer.removeRefreshRoken(refreshToken)).toBe(true);
    expect(authServer.removeRefreshRoken(refreshToken)).toBe(false);
    expect(authServer.removeRefreshRoken('')).toBe(false);
  });

  describe('Verifies an accessToken', () => {
    it('Throws an error if accessToken.verify is undefined', () => {
      const at = new AccessToken();

      Object.assign(at, { verify: undefined });

      const auth = new AuthServer({
        accessToken: at,
        refreshToken: new RefreshToken()
      });

      expect(auth.verify.bind(auth, expiredToken)).toThrow();
    });

    it('Returns null with an empty accessToken', () => {
      expect(authServer.verify('')).toBe(null);
    });

    it('Returns null if expired', () => {
      expect(authServer.verify(expiredToken)).toBe(null);
    });

    it('Returns the payload', () => {
      const at = authServer.createAccessToken(userPayload);
      const decodedPayload = authServer.verify(at.accessToken);

      expect(decodedPayload).toEqual(at.payload);
      expect(decodedPayload).toEqual(tokenPayload);
    });
  });
});
