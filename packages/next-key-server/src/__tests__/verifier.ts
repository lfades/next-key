import jwt from 'jsonwebtoken';
import { Payload, Verifier } from '..';

describe('Verifier', () => {
  const ACCESS_TOKEN_SECRET = 'password';

  const payload = new Payload({
    uId: 'id',
    cId: 'companyId',
    scope: 'scope'
  });
  const verify = (accessToken: string) => {
    return jwt.verify(accessToken, ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 80 // seconds to tolerate
    }) as object;
  };
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxOTA2MjY4MH0.FPnQLylqy7hfTLULsNDLNhaswFD3HI7zxRt6G-u3h9s';
  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxODE0MTIzNCwiZXhwIjoxNTE4MTQyNDM0fQ.3ZRmx08htMX5KLsv8VhBVD8vjxHzWOiDDli7JXFf83Q';

  it('Creates a verify function', () => {
    expect(typeof Verifier({ verify })).toBe('function');
  });

  it('Can receive a custom payload', () => {
    expect(typeof Verifier({ payload, verify })).toBe('function');
  });

  describe('Verifies an accessToken', () => {
    const verifyFn = Verifier({ verify });

    it('Returns null with an empty accessToken', () => {
      expect(verifyFn('')).toBe(null);
    });

    it('Returns null if expired', () => {
      expect(verifyFn(expiredToken)).toBe(null);
    });

    it('Returns the payload', () => {
      expect(verifyFn(token)).toEqual({
        uId: 'user_123',
        cId: 'company_123',
        scope: 'a:r:w',
        iat: 1519062680
      });
    });

    it('Returns a custom payload', () => {
      expect(Verifier({ payload, verify })(token)).toEqual({
        id: 'user_123',
        companyId: 'company_123',
        scope: 'a:r:w'
      });
    });
  });
});
