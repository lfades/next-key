import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  AuthPayload,
  AuthScope,
  AuthServer,
  IAccessToken,
  IRefreshToken
} from 'jwt-auth-server';
import request from 'supertest';
import AuthWithExpress from '../express';

describe('Auth with Express', () => {
  const ONE_MINUTE = 1000 * 60;
  const ONE_DAY = ONE_MINUTE * 60 * 24;
  const ONE_MONTH = ONE_DAY * 30;
  const ACCESS_TOKEN_COOKIE = 'abc';
  const ACCESS_TOKEN_SECRET = 'password';
  const REFRESH_TOKEN_COOKIE = 'aei';
  const COOKIE_PARSER_SECRET = 'secret';
  const refreshTokens = new Map();
  const invalidTokenMsg = 'Invalid token';

  class AccessToken implements IAccessToken {
    public cookie: string;

    constructor(public Auth: AuthServer) {
      this.cookie = ACCESS_TOKEN_COOKIE;
    }
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
        ? this.Auth.scope.create(['admin:read', 'admin:write'])
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
    public getExpDate() {
      return new Date(Date.now() + ONE_MINUTE * 20);
    }
  }

  class RefreshToken implements IRefreshToken {
    public cookie: string;

    constructor(public Auth: AuthServer) {
      this.cookie = REFRESH_TOKEN_COOKIE;
    }
    public async create({ id: userId }: { id: string }) {
      const id = Date.now().toString();

      refreshTokens.set(id, {
        userId,
        expireAt: this.getExpDate()
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
    public getExpDate() {
      return new Date(Date.now() + ONE_MONTH);
    }
  }

  const authServer = new AuthServer({
    AccessToken,
    RefreshToken,
    payload: new AuthPayload({
      uId: 'id',
      cId: 'companyId',
      scope: 'scope'
    }),
    scope: new AuthScope({
      admin: 'a'
    })
  });

  const authWithExpress = new AuthWithExpress(authServer);

  describe('Cookie options', () => {
    const withCookie = new AuthWithExpress(authServer, {
      cookie: {
        secure: true,
        signed: true
      }
    });
    const withCookieFn = new AuthWithExpress(authServer, {
      cookie(isAccessToken) {
        return isAccessToken
          ? { secure: true }
          : { secure: true, signed: true };
      }
    });

    it('Works without any options passed to the server', () => {
      expect(authWithExpress.getCookieOptions({})).toEqual({});

      expect(authWithExpress.getCookieOptions({ httpOnly: true })).toEqual({
        httpOnly: true
      });
    });

    it('Includes options passed to the server', () => {
      expect(withCookie.getCookieOptions({})).toEqual({
        secure: true,
        signed: true
      });
      expect(withCookie.getCookieOptions({ httpOnly: true })).toEqual({
        secure: true,
        signed: true,
        httpOnly: true
      });
      expect(withCookieFn.getCookieOptions({}, false)).toEqual({
        secure: true,
        signed: true
      });
      expect(withCookieFn.getCookieOptions({ httpOnly: true })).toEqual({
        secure: true,
        httpOnly: true
      });
    });

    it('Prioritizes options passed to the server', () => {
      expect(withCookie.getCookieOptions({ secure: false })).toEqual({
        secure: true,
        signed: true
      });
      expect(withCookieFn.getCookieOptions({ secure: false }, false)).toEqual({
        secure: true,
        signed: true
      });
    });
  });

  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxODE0MTIzNCwiZXhwIjoxNTE4MTQyNDM0fQ.3ZRmx08htMX5KLsv8VhBVD8vjxHzWOiDDli7JXFf83Q';

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

    authWithExpress.setTokens(res, data);

    res.json(data);
  });

  app.get('/cookies', (req, res) => {
    res.json({
      refreshToken: authServer.getRefreshToken(req),
      accessToken: authServer.getAccessToken(req)
    });
  });

  app.get('/logout', authWithExpress.logout);

  app.get('/new/access_token', authWithExpress.createAccessToken);

  app.get('/set/access_token', authWithExpress.setAccessToken);

  app.get('/authorize', authWithExpress.authorize, (req, res) => {
    res.json({ user: req.user });
  });

  let cookie: string;
  let login: request.Response;
  const agent = request.agent(app);
  // There is an issue with Jest that brokes setting multiple cookies
  // https://github.com/facebook/jest/issues/2549
  const get = (path: string, sendCookie?: boolean) =>
    agent.get(path).set('Cookie', sendCookie === false ? '' : cookie);

  beforeEach(async () => {
    login = await agent.get('/login');
    cookie = `${REFRESH_TOKEN_COOKIE}=${
      login.body.refreshToken
    };${ACCESS_TOKEN_COOKIE}=${login.body.accessToken}`;
  });

  it('Adds the accessToken and refreshToken as cookies', () => {
    expect(login.status).toBe(200);
    expect(login.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
    expect(login.body).toEqual({
      refreshToken: expect.any(String),
      accessToken: expect.any(String),
      payload: tokenPayload
    });
  });

  it('Gets the tokens from cookies', async () => {
    const response = await get('/cookies');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      refreshToken: login.body.refreshToken,
      accessToken: login.body.accessToken
    });
  });

  it('Logouts', async () => {
    const response = await get('/logout');

    expect(response.status).toBe(200);
    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
    expect(response.body).toEqual({
      refreshToken: login.body.refreshToken
    });

    const responseWithoutCookie = await get('/logout', false);

    expect(responseWithoutCookie.status).toBe(200);
    expect(responseWithoutCookie.body).toEqual({
      refreshToken: null
    });
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
      const response = await get('/new/access_token', false);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: invalidTokenMsg });
    });

    it('Returns an error with an invalid refreshToken', async () => {
      cookie = cookie.replace(login.body.refreshToken, 'xxx');

      const response = await get('/new/access_token', false);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: invalidTokenMsg });
    });
  });

  describe('Sets an existing accessToken to the cookies', () => {
    it('Returns the token when using a valid token', async () => {
      const response = await get(
        `/set/access_token/?at=${login.body.accessToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: login.body.accessToken
      });
    });

    it('Returns an error if no token is sended', async () => {
      const response = await get('/set/access_token');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: invalidTokenMsg });
    });

    it('Returns an error with an expired accessToken', async () => {
      const response = await get(`/set/access_token/?at=${expiredToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: invalidTokenMsg });
    });
  });

  describe('Authorizes a Request', () => {
    it('Sets req.user as the accessToken payload', async () => {
      const response = await get('/authorize/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: tokenPayload });
    });

    it('Sets req.user as null if no accessToken is available', async () => {
      const response = await get('/authorize/', false);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: null });
    });

    it('Sets req.user as null with an expired accessToken', async () => {
      cookie = cookie.replace(login.body.accessToken, expiredToken);

      const response = await get('/authorize/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: null });
    });
  });
});
