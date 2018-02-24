import cookieParser from 'cookie-parser';
import express, { RequestHandler } from 'express';
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
        algorithms: ['HS256'],
        clockTolerance: 80 // seconds to tolerate
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

  const tokenPayload = {
    id: userPayload.id,
    companyId: userPayload.companyId,
    scope: 'a:r:w'
  };

  let agent: request.SuperTest<request.Test>;
  let login: request.Response;

  const init = async (...args: RequestHandler[]) => {
    const app = express();

    app.use(cookieParser(COOKIE_PARSER_SECRET));

    app.get('/login', async (_req, res) => {
      const data = await authServer.createTokens(userPayload);

      authServer.setRefreshToken(res, data.refreshToken);

      res.json(data);
    });

    if (args.length) app.get('/', ...args);

    agent = request.agent(app);
    login = await agent.get('/login');
  };
  const get = () =>
    agent.get('/').set('Authorization', 'Bearer ' + login.body.accessToken);

  describe('Set refreshToken', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);

      await init((_req, res) => {
        const auth = new ExpressAuth({ accessToken: new AccessToken() });
        expect(auth.setRefreshToken.bind(auth, res, '')).toThrowError(
          MISSING_RT_MSG
        );
        res.send();
      });
      await get();
    });

    it('Sets the token as a cookie', async () => {
      await init();

      expect(login.status).toBe(200);
      expect(login.get('Set-Cookie')).toEqual([
        expect.stringContaining(REFRESH_TOKEN_COOKIE + '=')
      ]);
    });
  });

  describe('Get refreshToken', () => {
    it('Throws an error if refreshToken is undefined', async () => {
      expect.assertions(1);

      await init((req, res) => {
        const auth = new ExpressAuth({ accessToken: new AccessToken() });
        expect(auth.getRefreshToken.bind(auth, req)).toThrowError(
          MISSING_RT_MSG
        );
        res.end();
      });
      await get();
    });

    it('Uses cookie defaults', async () => {
      expect.assertions(3);
      if (!authServer.refreshToken) return;

      const { cookie, cookieOptions } = authServer.refreshToken;

      Object.assign(authServer.refreshToken, {
        cookie: undefined,
        cookieOptions: undefined
      });

      await init((req, res) => {
        expect(authServer.getRefreshToken(req)).toBe(login.body.refreshToken);
        res.end();
      });

      expect(login.status).toBe(200);
      expect(login.get('Set-Cookie')).toEqual([
        expect.stringContaining('r_t=')
      ]);

      await get();

      Object.assign(authServer.refreshToken, { cookie, cookieOptions });
    });

    it('Returns the token', async () => {
      await init((req, res) => {
        expect(authServer.getRefreshToken(req)).toBe(login.body.refreshToken);
        res.end();
      });
      await get();
    });
  });

  it('Gets the accessToken from headers', async () => {
    expect.assertions(1);

    await init((req, res) => {
      expect(authServer.getAccessToken(req)).toEqual({
        accessToken: login.body.accessToken
      });
      res.end();
    });
    await get();
  });

  it('Logouts', async () => {
    await init(authServer.logout);

    const response = await get();

    expect(response.status).toBe(200);
    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
    expect(response.body).toEqual({ done: true });

    const responseNoCookie = await get().set('Cookie', '');

    expect(responseNoCookie.status).toBe(200);
    expect(responseNoCookie.body).toEqual({ done: false });
  });

  describe('Create accessToken', () => {
    beforeEach(async () => {
      await init(authServer.refreshAccessToken);
    });

    it('Returns an accessToken', async () => {
      const response = await get();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: expect.any(String)
      });
    });

    it('Returns an error if no refreshToken is present', async () => {
      const response = await get().set('Cookie', '');

      expect(response.status).toBe(BAD_REQUEST_CODE);
      expect(response.body).toEqual({ message: BAD_REQUEST_MESSAGE });
    });

    it('Returns an error with an invalid refreshToken', async () => {
      const response = await get().set(
        'Cookie',
        `${REFRESH_TOKEN_COOKIE}=xxx;`
      );

      expect(response.status).toBe(BAD_REQUEST_CODE);
      expect(response.body).toEqual({ message: BAD_REQUEST_MESSAGE });
    });
  });

  describe('Authorize a Request', () => {
    it('Sets req.user as the accessToken payload', async () => {
      expect.assertions(1);

      await init(authServer.authorize, (req, res) => {
        expect(req.user).toEqual(tokenPayload);
        res.end();
      });
      await get();
    });

    it('Sets req.user as null if no accessToken is available', async () => {
      expect.assertions(1);

      await init(authServer.authorize, (req, res) => {
        expect(req.user).toEqual(null);
        res.end();
      });
      await get().set('Authorization', '');
    });
  });
});
