import jwt from 'jsonwebtoken';
import {
  AuthAccessToken,
  AuthRefreshToken,
  AuthServer,
  Payload,
  Scope
} from '../';
import {
  MISSING_AT_CREATE_MSG,
  MISSING_AT_VERIFY_MSG,
  MISSING_RT_MSG
} from '../internals';

describe('Auth Server', () => {
  const ONE_MINUTE = 1000 * 60;
  const ONE_DAY = ONE_MINUTE * 60 * 24;
  const ONE_MONTH = ONE_DAY * 30;
  const ACCESS_TOKEN_SECRET = 'password';

  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxODE0MTIzNCwiZXhwIjoxNTE4MTQyNDM0fQ.3ZRmx08htMX5KLsv8VhBVD8vjxHzWOiDDli7JXFf83Q';
  const refreshTokens = new Map();
  const authScope = new Scope({
    admin: 'a'
  });
  const authPayload = new Payload({
    uId: 'id',
    cId: 'companyId',
    scope: 'scope'
  });

  class AccessToken implements AuthAccessToken {
    public scope = authScope;
    public getPayload({ id, companyId }: { id: string; companyId: string }) {
      const scope = authScope.create(['admin:read', 'admin:write']);

      return authPayload.create({ id, companyId, scope });
    }
    public create(payload: { uId: string; cId: string; scope: string }) {
      return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: '20m'
      });
    }
    public verify(accessToken: string) {
      const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256']
      }) as object;
      const parsedPayload = authPayload.parse(payload);

      parsedPayload.scope = authScope.parse(parsedPayload.scope);

      return parsedPayload;
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

  const authServer = new AuthServer({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken()
  });
  const authBasic = new AuthServer({
    accessToken: Object.assign(new AccessToken(), {
      scope: undefined
    })
  });

  // Payload to create a token
  const user = {
    id: 'user_123',
    companyId: 'company_123'
  };

  const userPayload = {
    id: user.id,
    companyId: user.companyId,
    scope: ['admin:read', 'admin:write']
  };

  // Payload got from a token
  const tokenPayload = {
    uId: userPayload.id,
    cId: userPayload.companyId,
    scope: 'a:r:w'
  };

  describe('Create accessToken', () => {
    it('Throws an error if accessToken.create is undefined', () => {
      const auth = new AuthServer({
        accessToken: Object.assign(new AccessToken(), { create: undefined })
      });
      expect(auth.createAccessToken.bind(auth, user)).toThrowError(
        MISSING_AT_CREATE_MSG
      );
    });

    it('Uses data as payload if accessToken.getPayload is undefined', () => {
      const auth = new AuthServer({
        accessToken: Object.assign(new AccessToken(), { getPayload: undefined })
      });
      expect(auth.createAccessToken(user)).toEqual({
        accessToken: expect.any(String),
        payload: user
      });
    });

    it('Creates the token', () => {
      expect(authServer.createAccessToken(user)).toEqual({
        accessToken: expect.any(String),
        payload: tokenPayload
      });
    });
  });

  describe('Create refreshToken', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);
      try {
        await authBasic.createRefreshToken(user);
      } catch (e) {
        expect(e.message).toBe(MISSING_RT_MSG);
      }
    });

    it('Creates the token', async () => {
      expect(typeof await authServer.createRefreshToken(user)).toBe('string');
    });
  });

  describe('Create both tokens', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);
      try {
        await authBasic.createTokens(user);
      } catch (e) {
        expect(e.message).toBe(MISSING_RT_MSG);
      }
    });

    it('Creates the tokens', async () => {
      expect(await authServer.createTokens(user)).toEqual({
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
      const { accessToken } = authServer.createAccessToken(user);
      expect(authServer.verify(accessToken)).toEqual(userPayload);
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
      const refreshToken = await authServer.createRefreshToken(user);

      expect(await authServer.getPayload(refreshToken, reset)).toEqual({
        userId: user.id,
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
      const refreshToken = await authServer.createRefreshToken(user);

      expect(authServer.removeRefreshRoken(refreshToken)).toBe(true);
      expect(authServer.removeRefreshRoken(refreshToken)).toBe(false);
      expect(authServer.removeRefreshRoken('')).toBe(false);
    });
  });
});
