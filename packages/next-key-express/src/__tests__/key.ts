import express, { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ExpressAuthKey } from '..';

describe('Express Auth Key', () => {
  const ACCESS_TOKEN_SECRET = 'password';
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxOTA2MjY4MH0.FPnQLylqy7hfTLULsNDLNhaswFD3HI7zxRt6G-u3h9s';
  const get = (...args: RequestHandler[]) => {
    const app = express();
    app.get('/', ...args);
    return request(app).get('/');
  };
  const authKey = new ExpressAuthKey({
    verify(accessToken: string) {
      return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
        algorithms: ['HS256']
      }) as object;
    }
  });

  it('Gets the accessToken from headers', async () => {
    expect.assertions(2);

    await get((req, res) => {
      expect(authKey.getToken(req)).toBe(null);
      res.end();
    });

    await get((req, res) => {
      expect(authKey.getToken(req)).toBe(token);
      res.end();
    }).set('Authorization', 'Bearer ' + token);
  });

  it('Authorizes a request', async () => {
    expect.assertions(2);

    await get(authKey.authorize, (req, res) => {
      expect(req.user).toBe(null);
      res.end();
    });

    await get(authKey.authorize, (req, res) => {
      expect(req.user).toEqual({
        id: 'user_123',
        companyId: 'company_123',
        scope: 'a:r:w'
      });
      res.end();
    }).set('Authorization', 'Bearer ' + token);
  });
});
