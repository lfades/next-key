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
  const MISSING_RT_MSG = 'options.refreshToken is required to use this method';
  const MISSING_AT_CREATE_MSG = 'accessToken.create should be a function';
  const MISSING_AT_VERIFY_MSG = 'accessToken.verify should be a function';

  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxODE0MTIzNCwiZXhwIjoxNTE4MTQyNDM0fQ.3ZRmx08htMX5KLsv8VhBVD8vjxHzWOiDDli7JXFf83Q';
  const refreshTokens = new Map();

  class AccessToken implements AuthAccessToken {
    public getPayload({
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
      return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256']
      }) as object;
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
  const authBasic = new AuthServer({ accessToken: new AccessToken() });

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
    expect(authBasic.scope).toBeInstanceOf(Scope);
    expect(authBasic.payload).toBeInstanceOf(Payload);
  });

  describe('Create accessToken', () => {
    it('Throws an error if accessToken.create is undefined', () => {
      const auth = new AuthServer({
        accessToken: Object.assign(new AccessToken(), { create: undefined })
      });
      expect(auth.createAccessToken.bind(auth, userPayload)).toThrowError(
        MISSING_AT_CREATE_MSG
      );
    });

    it('Uses data as payload if accessToken.getPayload is undefined', () => {
      const auth = new AuthServer({
        accessToken: Object.assign(new AccessToken(), { getPayload: undefined })
      });
      expect(auth.createAccessToken(userPayload)).toEqual({
        accessToken: expect.any(String),
        payload: userPayload
      });
    });

    it('Creates the token', () => {
      expect(authServer.createAccessToken(userPayload)).toEqual({
        accessToken: expect.any(String),
        payload: tokenPayload
      });
    });
  });

  describe('Create refreshToken', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);
      try {
        await authBasic.createRefreshToken(userPayload);
      } catch (e) {
        expect(e.message).toBe(MISSING_RT_MSG);
      }
    });

    it('Creates the token', async () => {
      expect(typeof await authServer.createRefreshToken(userPayload)).toBe(
        'string'
      );
    });
  });

  describe('Create both tokens', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);
      try {
        await authBasic.createTokens(userPayload);
      } catch (e) {
        expect(e.message).toBe(MISSING_RT_MSG);
      }
    });

    it('Creates the tokens', async () => {
      expect(await authServer.createTokens(userPayload)).toEqual({
        refreshToken: expect.any(String),
        accessToken: expect.any(String),
        payload: tokenPayload
      });
    });
  });

  describe('Verify accessToken', () => {
    it('Throws an error if accessToken.verify is undefined', () => {
      const auth = new AuthServer({
        accessToken: Object.assign(new AccessToken(), { verify: undefined })
      });
      expect(auth.verify.bind(auth, '')).toThrowError(MISSING_AT_VERIFY_MSG);
    });

    it('Returns null if expired or empty', () => {
      expect(authServer.verify('')).toBe(null);
      expect(authServer.verify(expiredToken)).toBe(null);
    });

    it('Returns the payload', () => {
      const { accessToken } = authServer.createAccessToken(userPayload);
      expect(authServer.verify(accessToken)).toEqual(tokenPayload);
    });
  });

  describe('Get the payload for an accessToken', () => {
    const reset = () => {
      // do nothing
    };

    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);
      try {
        await authBasic.getPayload('', reset);
      } catch (e) {
        expect(e.message).toBe(MISSING_RT_MSG);
      }
    });

    it('Returns the payload', async () => {
      const refreshToken = await authServer.createRefreshToken(userPayload);

      expect(await authServer.getPayload(refreshToken, reset)).toEqual({
        userId: userPayload.id,
        expireAt: refreshTokens.get(refreshToken).expireAt
      });
    });
  });

  describe('Remove refreshToken', () => {
    it('Throws an error if refreshToken is undefined', () => {
      expect(authBasic.removeRefreshRoken.bind(authBasic, '')).toThrowError(
        MISSING_RT_MSG
      );
    });

    it('Removes the token', async () => {
      const refreshToken = await authServer.createRefreshToken(userPayload);

      expect(authServer.removeRefreshRoken(refreshToken)).toBe(true);
      expect(authServer.removeRefreshRoken(refreshToken)).toBe(false);
      expect(authServer.removeRefreshRoken('')).toBe(false);
    });
  });
});
