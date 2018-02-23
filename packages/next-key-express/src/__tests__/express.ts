import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import ExpressAuth, {
  AuthAccessToken,
  AuthRefreshToken,
  Payload,
  Scope
} from '..';
import { BAD_REQUEST_CODE, BAD_REQUEST_MESSAGE } from '../utils';

describe('Auth with Express', () => {
  const ONE_MINUTE = 1000 * 60;
  const ONE_DAY = ONE_MINUTE * 60 * 24;
  const ONE_MONTH = ONE_DAY * 30;
  const ACCESS_TOKEN_SECRET = 'password';
  const REFRESH_TOKEN_COOKIE = 'aei';
  const COOKIE_PARSER_SECRET = 'secret';
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
    public cookie: string = REFRESH_TOKEN_COOKIE;
    public cookieOptions() {
      return {
        signed: true
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

  const authServer = new ExpressAuth({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken(),
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

  const tokenPayload = {
    id: userPayload.id,
    companyId: userPayload.companyId,
    scope: 'a:r:w'
  };

  const app = express();

  app.use(cookieParser(COOKIE_PARSER_SECRET));

  app.get('/login', async (_req, res) => {
    const data = await authServer.createTokens(userPayload);

    authServer.setRefreshToken(res, data.refreshToken);

    res.json(data);
  });

  app.get('/refreshToken', (req, res) => {
    res.json({ refreshToken: authServer.getRefreshToken(req) });
  });

  app.get('/logout', authServer.logout);

  app.get('/new/access_token', authServer.refreshAccessToken);

  let login: request.Response;

  const agent = request.agent(app);

  const get = (path: string) =>
    agent.get(path).set('Authorization', 'Bearer ' + login.body.accessToken);

  beforeEach(async () => {
    login = await agent.get('/login');
  });

  it('Uses cookie defaults for the refreshToken', async () => {
    const { cookie, cookieOptions } = authServer.refreshToken;

    authServer.refreshToken.cookie = undefined;
    authServer.refreshToken.cookieOptions = undefined;

    const newLogin = await get('/login');

    expect(newLogin.status).toBe(200);
    expect(newLogin.get('Set-Cookie')).toEqual([
      expect.stringContaining('r_t=')
    ]);
    expect(newLogin.body).toEqual({
      refreshToken: expect.any(String),
      accessToken: expect.any(String),
      payload: tokenPayload
    });

    const response = await get('/refreshToken');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ refreshToken: newLogin.body.refreshToken });

    authServer.refreshToken.cookie = cookie;
    authServer.refreshToken.cookieOptions = cookieOptions;
  });

  it('Adds the refreshToken as cookie', () => {
    expect(login.status).toBe(200);
    expect(login.get('Set-Cookie')).toEqual([
      expect.stringContaining(REFRESH_TOKEN_COOKIE + '=')
    ]);
    expect(login.body).toEqual({
      refreshToken: expect.any(String),
      accessToken: expect.any(String),
      payload: tokenPayload
    });
  });

  it('Gets the refreshToken from cookies', async () => {
    const response = await get('/refreshToken');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ refreshToken: login.body.refreshToken });
  });

  it('Logouts', async () => {
    const response = await get('/logout');

    expect(response.status).toBe(200);
    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
    expect(response.body).toEqual({ done: true });

    const responseWithoutCookie = await get('/logout').set('Cookie', '');

    expect(responseWithoutCookie.status).toBe(200);
    expect(responseWithoutCookie.body).toEqual({ done: false });
  });

  describe('Creates a new accessToken', () => {
    it('Returns an accessToken', async () => {
      const response = await get('/new/access_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: expect.any(String)
      });
    });

    it('Returns an error if no refreshToken is present', async () => {
      const response = await get('/new/access_token').set('Cookie', '');

      expect(response.status).toBe(BAD_REQUEST_CODE);
      expect(response.body).toEqual({ message: BAD_REQUEST_MESSAGE });
    });

    it('Returns an error with an invalid refreshToken', async () => {
      const response = await get('/new/access_token').set(
        'Cookie',
        `${REFRESH_TOKEN_COOKIE}=xxx;`
      );

      expect(response.status).toBe(BAD_REQUEST_CODE);
      expect(response.body).toEqual({ message: BAD_REQUEST_MESSAGE });
    });
  });
});
