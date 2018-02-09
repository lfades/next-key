import jwt from 'jsonwebtoken';
import {
  AuthPayload,
  AuthScope,
  AuthServer,
  IAccessToken,
  IRefreshToken
} from '../';

describe('Auth Server', () => {
  const ONE_MINUTE = 1000 * 60;
  const ONE_DAY = ONE_MINUTE * 60 * 24;
  const ONE_MONTH = ONE_DAY * 30;
  const ACCESS_TOKEN_COOKIE = 'abc';
  const ACCESS_TOKEN_SECRET = 'password';
  const REFRESH_TOKEN_COOKIE = 'aei';
  const refreshTokens = new Map();

  class AccessToken implements IAccessToken {
    public cookie: string;
    public expireAfter: number;

    constructor(public Auth: AuthServer) {
      this.cookie = ACCESS_TOKEN_COOKIE;
      this.expireAfter = ONE_MINUTE * 20;
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
  }

  class RefreshToken implements IRefreshToken {
    public cookie: string;
    public expireAfter: number;

    constructor(public Auth: AuthServer) {
      this.cookie = REFRESH_TOKEN_COOKIE;
      this.expireAfter = ONE_MONTH;
    }
    public async create({ id: userId }: { id: string }) {
      const id = Date.now().toString();

      refreshTokens.set(id, {
        userId,
        expireAt: this.Auth.refreshTokenExpiresAt()
      });

      return id;
    }
    public remove(refreshToken: string) {
      return refreshTokens.delete(refreshToken);
    }
    public async createPayload(refreshToken: string) {
      return refreshTokens.get(refreshToken);
    }
  }

  const authPayload = new AuthPayload({
    uId: 'id',
    cId: 'companyId',
    scope: 'scope'
  });

  const authScope = new AuthScope({
    admin: 'a'
  });

  const authServer = new AuthServer({
    AccessToken,
    RefreshToken,
    payload: authPayload,
    scope: authScope
  });

  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxODE0MTIzNCwiZXhwIjoxNTE4MTQyNDM0fQ.3ZRmx08htMX5KLsv8VhBVD8vjxHzWOiDDli7JXFf83Q';

  // Payload to create a token
  const payload = {
    id: 'user_123',
    companyId: 'company_123',
    admin: true
  };

  // Payload got from a token
  const tokenPayload = {
    id: 'user_123',
    companyId: 'company_123',
    scope: 'a:r:w'
  };

  it('has a valid expiration date for the refreshToken', () => {
    expect(authServer.refreshTokenExpiresAt()).toBeInstanceOf(Date);
  });

  it('has a valid expiration date for the accessToken', () => {
    expect(authServer.accessTokenExpiresAt()).toBeInstanceOf(Date);
  });

  it('creates an accessToken', () => {
    expect(typeof authServer.createAccessToken(payload)).toBe('string');
  });

  it('creates a refreshToken', async () => {
    expect(typeof await authServer.createRefreshToken(payload)).toBe('string');
  });

  // it creates both tokens

  it('decodes an accessToken', () => {
    expect(
      authServer.getPayload(authServer.createAccessToken(payload))
    ).toEqual(tokenPayload);
  });
});
