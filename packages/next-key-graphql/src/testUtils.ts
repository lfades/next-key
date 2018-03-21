/**
 * This file has some utils that are only imported when testing, useful to
 * avoid repeating the same code every time
 */
import http from 'http';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'micro';
import { AuthAccessToken, AuthRefreshToken, run, Scope } from 'next-key-micro';
import request from 'supertest';

export interface User {
  id: string;
  companyId: string;
}

export interface TokenPayload {
  uId: string;
  cId: string;
  scope: string;
}

export const REFRESH_TOKEN_COOKIE = 'abc';

export const ACCESS_TOKEN_SECRET = 'secret';

// This is a valid accessToken with no expiration date
export const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxOTA2MjY4MH0.NxqOENt99ysnbVBaSNX-XjMXqpWSNlvLHqDJZXFXQXg';

export const refreshTokens = new Map();

export const authScope = new Scope({
  admin: 'a'
});

export const user = {
  id: 'user_123',
  companyId: 'company_123'
};

export const userPayload = {
  id: user.id,
  companyId: user.companyId,
  scope: ['admin:read', 'admin:write']
};
// this is the scope created by authScope after parsing 'a:r:w'
export const validScope = ['admin:read', 'admin:write'];

export const createId = () =>
  Math.random()
    .toString(36)
    .substr(2, 9);

export const testRequest = (fn: RequestHandler) => {
  const handler = run(async (req, res) => {
    await fn(req, res);
    res.end();
  });
  return request(http.createServer(handler)).get('/');
};

export class RefreshToken implements AuthRefreshToken {
  public cookie = REFRESH_TOKEN_COOKIE;
  public cookieOptions() {
    return {
      path: '/'
    };
  }
  public async create(data: { id: string; companyId: string }) {
    const id = createId();

    refreshTokens.set(id, data);

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

export class AccessToken implements AuthAccessToken {
  public scope = authScope;
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
