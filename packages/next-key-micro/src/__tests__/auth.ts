import http from 'http';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'micro';
import request from 'supertest';
import MicroAuth, {
  AuthAccessToken,
  AuthRefreshToken,
  Payload,
  Scope
} from '..';
import { BAD_REQUEST_MESSAGE, BAD_REQUEST_STATUS } from '../internals';
import { run } from '../utils';

describe('Auth with Express', () => {
  const ONE_MINUTE = 1000 * 60;
  const ONE_DAY = ONE_MINUTE * 60 * 24;
  const ONE_MONTH = ONE_DAY * 30;
  const ACCESS_TOKEN_SECRET = 'password';
  const REFRESH_TOKEN_COOKIE = 'aei';
  const MISSING_RT_MSG = 'refreshToken is required to use this method';

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
    public cookie = REFRESH_TOKEN_COOKIE;
    public cookieOptions() {
      return {
        path: '/'
      };
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
    public async getPayload(refreshToken: string, reset: () => any) {
      reset();
      return refreshTokens.get(refreshToken);
    }
  }

  const authScope = new Scope({
    admin: 'a'
  });

  const authServer = new MicroAuth({
    refreshToken: new RefreshToken(),
    accessToken: new AccessToken(),
    payload: new Payload({
      uId: 'id',
      cId: 'companyId',
      scope: 'scope'
    }),
    scope: authScope
  });

  const userPayload = {
    id: 'user_123',
    companyId: 'company_123',
    admin: true
  };

  let cookieStr: string;
  let data: {
    accessToken: string;
    refreshToken: string;
    payload: object;
  };

  const testSimpleRequest = (fn: RequestHandler) => {
    return request(http.createServer(fn)).get('/');
  };
  const testRequest = (fn: RequestHandler) => {
    const cb = run(async (req, res) => {
      await fn(req, res);
      return { done: true }; // return an object to avoid an AuthError
    });
    return testSimpleRequest(cb);
  };

  const initData = async () => {
    data = await authServer.createTokens(userPayload);
    cookieStr = authServer.serialize(data.refreshToken);
  };

  beforeEach(initData);

  describe('Set refreshToken', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);

      await testRequest((_req, res) => {
        const auth = new MicroAuth({ accessToken: new AccessToken() });
        expect(auth.setRefreshToken.bind(auth, res, '')).toThrowError(
          MISSING_RT_MSG
        );
      });
    });

    it('Sets the token as a cookie', async () => {
      const response = await testRequest((_req, res) => {
        authServer.setRefreshToken(res, data.refreshToken);
      });

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([cookieStr]);
    });

    it('Concats the cookie', async () => {
      expect.assertions(2);

      const handle = (asArray: boolean): RequestHandler => (_req, res) => {
        const cookie = 'x=y;';

        res.setHeader('Set-Cookie', asArray ? [cookie] : cookie);
        authServer.setRefreshToken(res, data.refreshToken);

        expect(res.getHeader('Set-Cookie')).toEqual([cookie, cookieStr]);
      };

      await testRequest(handle(true));
      await testRequest(handle(false));
    });
  });

  describe('Get refreshToken', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);

      await testRequest(req => {
        const auth = new MicroAuth({ accessToken: new AccessToken() });
        expect(auth.getRefreshToken.bind(auth, req)).toThrowError(
          MISSING_RT_MSG
        );
      });
    });

    it('Returns null for an empty cookie', async () => {
      expect.assertions(2);

      const handler: RequestHandler = req => {
        expect(authServer.getRefreshToken(req.headers)).toBeNull();
      };

      await testRequest(handler);
      await testRequest(handler).set('Cookie', 'x=y;');
    });

    it('Uses cookie defaults', async () => {
      expect.assertions(2);

      if (!authServer.refreshToken) return;

      const { cookie, cookieOptions } = authServer.refreshToken;

      Object.assign(authServer.refreshToken, {
        cookie: undefined,
        cookieOptions: undefined
      });

      await initData();

      const expectedCookie = `r_t=${data.refreshToken}; Path=/; HttpOnly`;

      expect(cookieStr).toBe(expectedCookie);

      await testRequest(req => {
        expect(authServer.getRefreshToken(req.headers)).toBe(data.refreshToken);
      }).set('Cookie', expectedCookie);

      // Returns authServer to its previous state
      Object.assign(authServer.refreshToken, { cookie, cookieOptions });
    });

    it('Returns the token', async () => {
      expect.assertions(1);

      await testRequest(req => {
        expect(authServer.getRefreshToken(req.headers)).toBe(data.refreshToken);
      }).set('Cookie', cookieStr);
    });
  });

  it('Gets the accessToken from headers', async () => {
    expect.assertions(1);

    await testRequest(req => {
      expect(authServer.getAccessToken(req.headers)).toEqual(data.accessToken);
    }).set('Authorization', 'Bearer ' + data.accessToken);
  });

  describe('Logout', () => {
    it('Removes the refreshToken', async () => {
      const req = testSimpleRequest(authServer.logoutHandler);
      const response = await req.set('Cookie', cookieStr);

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([
        `${REFRESH_TOKEN_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
      ]);
      expect(response.body).toEqual({ done: true });
    });

    it('Does nothing if a refreskToken does not exists', async () => {
      const response = await testSimpleRequest(authServer.logoutHandler);

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toBeUndefined();
      expect(response.body).toEqual({ done: false });
    });
  });

  describe('Create accessToken', () => {
    let req: request.Test;
    beforeEach(async () => {
      req = testSimpleRequest(authServer.refreshAccessTokenHandler);
    });

    it('Returns an accessToken', async () => {
      const response = await req.set('Cookie', cookieStr);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: expect.any(String)
      });
    });

    it('Returns an error if no refreshToken is present', async () => {
      const response = await req;

      expect(response.status).toBe(BAD_REQUEST_STATUS);
      expect(response.text).toBe(BAD_REQUEST_MESSAGE);
    });

    it('Returns an error on an invalid refreshToken', async () => {
      const response = await req.set('Cookie', `${REFRESH_TOKEN_COOKIE}=xxx;`);

      expect(response.status).toBe(BAD_REQUEST_STATUS);
      expect(response.text).toBe(BAD_REQUEST_MESSAGE);
    });
  });

  describe('Authorize a Request', () => {
    it('Sets req.user as the accessToken payload', async () => {
      expect.assertions(1);

      await testRequest(
        authServer.authorize(req => {
          expect(req.user).toEqual(data.payload);
        })
      ).set('Authorization', 'Bearer ' + data.accessToken);
    });

    it('Sets req.user as null if no accessToken is available', async () => {
      expect.assertions(1);

      await testRequest(
        authServer.authorize(req => {
          expect(req.user).toEqual(null);
        })
      );
    });
  });
});
