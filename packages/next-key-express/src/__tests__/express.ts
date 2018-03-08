import cookieParser from 'cookie-parser';
import express, { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import ExpressAuth, {
  AuthAccessToken,
  AuthRefreshToken,
  Payload,
  run,
  Scope
} from '..';
import { BAD_REQUEST_MESSAGE, BAD_REQUEST_STATUS } from '../internals';

describe('Auth with Express', () => {
  const ACCESS_TOKEN_SECRET = 'password';
  const REFRESH_TOKEN_COOKIE = 'aei';
  const COOKIE_PARSER_SECRET = 'secret';
  const refreshTokens = new Map();

  class AccessToken implements AuthAccessToken {
    public getPayload({ id, companyId }: { id: string; companyId: string }) {
      const scope = authScope.create(['admin:read', 'admin:write']);
      return { id, companyId, scope };
    }
    public create(payload: { uId: string; cId: string; scope: string }) {
      return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: '1m'
      });
    }
    public verify(accessToken: string) {
      return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256']
      }) as object;
    }
  }

  class RefreshToken implements AuthRefreshToken {
    public cookie: string = REFRESH_TOKEN_COOKIE;
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

  const authScope = new Scope({
    admin: 'a'
  });

  const authServer = new ExpressAuth({
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
    companyId: 'company_123'
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
    data = await authServer.createTokens(userPayload);
    await initCookieStr();
  };

  beforeEach(initData);

  it('Sets the refreshToken as a cookie', async () => {
    const response = await initCookieStr();

    expect(response.status).toBe(200);
    expect(response.get('Set-Cookie')).toEqual([cookieStr]);
  });

  it('Gets the refreshToken from cookies', async () => {
    expect.assertions(2);

    await testRequest(req => {
      expect(req.signedCookies).toEqual({
        [REFRESH_TOKEN_COOKIE]: data.refreshToken
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
      const response = await req.set('Cookie', `${REFRESH_TOKEN_COOKIE}=xxx;`);

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

      await testRequest(authServer.authorize, req => {
        expect(req.user).toEqual(data.payload);
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
