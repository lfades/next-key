import http from 'http';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'micro';
import request from 'supertest';
import MicroAuth, { AuthAccessToken, AuthRefreshToken, Scope } from '..';
import {
  AT_COOKIE,
  BAD_REQUEST_MESSAGE,
  BAD_REQUEST_STATUS,
  MISSING_RT_MESSAGE,
  RT_COOKIE
} from '../internals';
import { run } from '../utils';

interface User {
  id: string;
  companyId: string;
}

interface TokenPayload {
  uId: string;
  cId: string;
  scope: string;
}

describe('Auth with Micro', () => {
  const ACCESS_TOKEN_SECRET = 'password';
  const REFRESH_TOKEN_COOKIE = 'aei';
  const ACCESS_TOKEN_COOKIE = 'abc';
  const refreshTokens = new Map();
  const authScope = new Scope({
    admin: 'a'
  });

  class AccessToken implements AuthAccessToken {
    public cookie = ACCESS_TOKEN_COOKIE;
    public cookieOptions() {
      return {
        secure: false
      };
    }
    public getPayload({ id, companyId }: User) {
      return {
        uId: id,
        cId: companyId,
        scope: authScope.create(['admin:read', 'admin:write'])
      };
    }
    public create(payload: TokenPayload) {
      return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: '1m'
      });
    }
    public verify(accessToken: string) {
      const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256']
      }) as TokenPayload;

      return {
        id: payload.uId,
        companyId: payload.cId,
        scope: authScope.parse(payload.scope)
      };
    }
  }

  class RefreshToken implements AuthRefreshToken {
    public cookie = REFRESH_TOKEN_COOKIE;
    public cookieOptions() {
      return {
        secure: false
      };
    }
    public async create(payload: { id: string; companyId: string }) {
      const id = Math.random()
        .toString(36)
        .substr(2, 9);

      refreshTokens.set(id, payload);

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

  const authServer = new MicroAuth({
    refreshToken: new RefreshToken(),
    accessToken: new AccessToken()
  });

  const user = {
    id: 'user_123',
    companyId: 'company_123'
  };
  const userPayload = {
    id: user.id,
    companyId: user.companyId,
    scope: ['admin:read', 'admin:write']
  };

  let rtCookieStr: string;
  let atCookieStr: string;
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
      res.end();
    });
    return testSimpleRequest(cb);
  };

  const initData = async () => {
    data = await authServer.createTokens(user);
    rtCookieStr = authServer.serializeRefreshToken(data.refreshToken);
    atCookieStr = authServer.serializeAccessToken(data.accessToken);
  };

  beforeEach(initData);

  describe('Refresh accessToken', () => {
    let req: request.Test;
    beforeEach(async () => {
      req = testSimpleRequest(authServer.refreshAccessTokenHandler);
    });

    it('Returns an accessToken', async () => {
      const response = await req.set('Cookie', rtCookieStr);

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

  describe('Logout', () => {
    it('Removes the refreshToken', async () => {
      const req = testSimpleRequest(authServer.logoutHandler);
      const response = await req.set('Cookie', rtCookieStr);

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

  describe('Authorize a Request', () => {
    it('Sets req.user as the accessToken payload', async () => {
      expect.assertions(1);

      await testRequest(
        authServer.authorize(req => {
          expect(req.user).toEqual(userPayload);
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

  describe('Get refreshToken', () => {
    it('Returns null for an empty cookie', async () => {
      expect.assertions(2);

      const handler: RequestHandler = req => {
        expect(authServer.getRefreshToken(req.headers)).toBeNull();
      };

      await testRequest(handler);
      // For an invalid cookie it should also return null
      await testRequest(handler).set('Cookie', 'x=y;');
    });

    it('Returns the token', async () => {
      expect.assertions(1);

      await testRequest(req => {
        expect(authServer.getRefreshToken(req.headers)).toBe(data.refreshToken);
      }).set('Cookie', rtCookieStr);
    });
  });

  it('Gets the accessToken from headers', async () => {
    expect.assertions(1);

    await testRequest(req => {
      expect(authServer.getAccessToken(req.headers)).toEqual(data.accessToken);
    }).set('Authorization', 'Bearer ' + data.accessToken);
  });

  describe('setRefreshToken', () => {
    it('Sets the token as a cookie', async () => {
      const response = await testRequest((_req, res) => {
        authServer.setRefreshToken(res, data.refreshToken);
      });

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([rtCookieStr]);
    });

    it('Concats the cookie', async () => {
      expect.assertions(2);

      const handle = (asArray: boolean): RequestHandler => (_req, res) => {
        const cookie = 'x=y;';

        res.setHeader('Set-Cookie', asArray ? [cookie] : cookie);
        authServer.setRefreshToken(res, data.refreshToken);

        expect(res.getHeader('Set-Cookie')).toEqual([cookie, rtCookieStr]);
      };

      await testRequest(handle(true));
      await testRequest(handle(false));
    });
  });

  it('Sets the accessToken as a cookie', async () => {
    const response = await testRequest((_req, res) => {
      authServer.setAccessToken(res, data.accessToken);
    });

    expect(response.status).toBe(200);
    expect(response.get('Set-Cookie')).toEqual([atCookieStr]);
  });

  describe('getRefreshTokenName', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      const auth = new MicroAuth({ accessToken: new AccessToken() });

      expect(auth.getRefreshTokenName.bind(auth)).toThrowError(
        MISSING_RT_MESSAGE
      );
    });

    it('Can use a default value', () => {
      const auth = new MicroAuth({
        accessToken: new AccessToken(),
        refreshToken: Object.assign(new RefreshToken(), { cookie: undefined })
      });

      expect(auth.getRefreshTokenName()).toBe(RT_COOKIE);
    });

    it('Returns the cookie name', () => {
      expect(authServer.getRefreshTokenName()).toBe(REFRESH_TOKEN_COOKIE);
    });
  });

  describe('getAccessTokenName', () => {
    it('Can use a default value', () => {
      const auth = new MicroAuth({
        accessToken: Object.assign(new AccessToken(), { cookie: undefined })
      });

      expect(auth.getAccessTokenName()).toBe(AT_COOKIE);
    });

    it('Returns the cookie name', () => {
      expect(authServer.getAccessTokenName()).toBe(ACCESS_TOKEN_COOKIE);
    });
  });

  describe('getRefreshTokenOptions', () => {
    const options = { httpOnly: true, path: '/' };

    it('Throws an error if refreshToken is undefined', async () => {
      const auth = new MicroAuth({ accessToken: new AccessToken() });
      const fn = auth.getRefreshTokenOptions.bind(auth, data.refreshToken);

      expect(fn).toThrowError(MISSING_RT_MESSAGE);
    });

    it('Uses default options', () => {
      const auth = new MicroAuth({
        accessToken: new AccessToken(),
        refreshToken: Object.assign(new RefreshToken(), {
          cookieOptions: undefined
        })
      });

      expect(auth.getRefreshTokenOptions(data.refreshToken)).toEqual(options);
    });

    it('Returns an expired date when removing a cookie', () => {
      expect(authServer.getRefreshTokenOptions('')).toEqual({
        expires: new Date(1),
        secure: false,
        ...options
      });
    });

    it('Returns the cookie options', () => {
      expect(authServer.getRefreshTokenOptions(data.refreshToken)).toEqual({
        secure: false,
        ...options
      });
    });
  });

  describe('getAccessTokenOptions', () => {
    const options = { path: '/' };

    it('Uses default options', () => {
      const auth = new MicroAuth({
        accessToken: Object.assign(new AccessToken(), {
          cookieOptions: undefined
        })
      });

      expect(auth.getAccessTokenOptions(data.accessToken)).toEqual(options);
    });

    it('Returns an expired date when removing a cookie', () => {
      expect(authServer.getAccessTokenOptions('')).toEqual({
        expires: new Date(1),
        secure: false,
        ...options
      });
    });

    it('Returns the cookie options', () => {
      expect(authServer.getAccessTokenOptions(data.accessToken)).toEqual({
        secure: false,
        ...options
      });
    });
  });
});
