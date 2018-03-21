import cookieParser from 'cookie-parser';
import express, { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import ExpressAuth, { AuthAccessToken, AuthRefreshToken, run, Scope } from '..';
import {
  AT_COOKIE,
  BAD_REQUEST_MESSAGE,
  BAD_REQUEST_STATUS,
  RT_COOKIE
} from '../internals';

interface User {
  id: string;
  companyId: string;
}

interface TokenPayload {
  uId: string;
  cId: string;
  scope: string;
}

describe('Auth with Express', () => {
  const ACCESS_TOKEN_SECRET = 'password';
  const COOKIE_PARSER_SECRET = 'secret';
  const refreshTokens = new Map();
  const authScope = new Scope({
    admin: 'a'
  });

  class AccessToken implements AuthAccessToken {
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
    public cookie: string = RT_COOKIE;
    public cookieOptions() {
      return {
        signed: true
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

  const authServer = new ExpressAuth({
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

  let cookieStr: string;
  let data: {
    accessToken: string;
    refreshToken: string;
    payload: object;
  };

  const testSimpleRequest = (...handlers: RequestHandler[]) => {
    const app = express();

    app.use(cookieParser(COOKIE_PARSER_SECRET));
    app.get('/', ...handlers);

    return request(app).get('/');
  };
  const testRequest = (...handlers: RequestHandler[]) => {
    const asyncHandlers = handlers.map(
      (fn): RequestHandler => async (req, res, next) => {
        await run(async () => {
          await fn(req, res, next);
        })(req, res);

        res.end();
      }
    );
    return testSimpleRequest(...asyncHandlers);
  };
  const initCookieStr = () => {
    return testRequest((_req, res) => {
      authServer.setRefreshToken(res, data.refreshToken);
      cookieStr = res.get('Set-Cookie');
    });
  };
  const initData = async () => {
    data = await authServer.createTokens(user);
    await initCookieStr();
  };

  beforeEach(initData);

  it('Gets the refreshToken from cookies', async () => {
    expect.assertions(2);

    await testRequest(req => {
      expect(req.signedCookies).toEqual({
        [RT_COOKIE]: data.refreshToken
      });
      expect(authServer.getRefreshToken(req)).toBe(data.refreshToken);
    }).set('Cookie', cookieStr);
  });

  it('Gets the accessToken from headers', async () => {
    expect.assertions(1);

    await testRequest(req => {
      expect(authServer.getAccessToken(req.headers)).toEqual(data.accessToken);
    }).set('Authorization', 'Bearer ' + data.accessToken);
  });

  describe('setRefreshToken', () => {
    it('Sets the refreshToken as a cookie', async () => {
      const response = await initCookieStr();

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([cookieStr]);
    });

    it('Removes the refreshToken when using an empty string', async () => {
      cookieStr = `${RT_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`;

      const response = await testRequest((_req, res) => {
        authServer.setRefreshToken(res, '');
      });

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([cookieStr]);
    });
  });

  describe('setAccessToken', () => {
    it('Sets the accessToken as a cookie', async () => {
      let atCookieStr: string = '';

      const response = await testRequest((_req, res) => {
        authServer.setAccessToken(res, data.accessToken);
        atCookieStr = res.get('Set-Cookie');
      });

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([atCookieStr]);
    });

    it('Removes the accessToken when using an empty string', async () => {
      const atCookieStr = `${AT_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

      const response = await testRequest((_req, res) => {
        authServer.setAccessToken(res, '');
      });

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([atCookieStr]);
    });
  });

  describe('Refresh accessToken', () => {
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
      const response = await req.set('Cookie', `${RT_COOKIE}=xxx;`);

      expect(response.status).toBe(BAD_REQUEST_STATUS);
      expect(response.text).toBe(BAD_REQUEST_MESSAGE);
    });
  });

  describe('Logout', () => {
    it('Removes the refreshToken', async () => {
      const req = testSimpleRequest(authServer.logoutHandler);
      const response = await req.set('Cookie', cookieStr);

      expect(response.status).toBe(200);
      expect(response.get('Set-Cookie')).toEqual([
        `${RT_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
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

      await testRequest(authServer.authorize, req => {
        expect(req.user).toEqual(userPayload);
      }).set('Authorization', 'Bearer ' + data.accessToken);
    });

    it('Sets req.user as null if no accessToken is available', async () => {
      expect.assertions(1);

      await testRequest(authServer.authorize, req => {
        expect(req.user).toEqual(null);
      });
    });
  });
});
