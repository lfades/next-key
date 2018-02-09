import { AuthPayload } from '../';

describe('Auth Payload', () => {
  const payload = new AuthPayload({
    uId: 'id',
    cId: 'companyId',
    scope: 'scope'
  });

  const user = {
    id: 'user_123',
    companyId: 'company_123',
    scope: 'a:r:w'
  };
  const reverseUser = {
    uId: 'user_123',
    cId: 'company_123',
    scope: 'a:r:w'
  };
  const randomKeys = {
    name: 'Luis',
    lastName: 'Alvarez'
  };

  it('Creates a payload', () => {
    expect(payload.create({})).toEqual({});
    expect(payload.create({ ...randomKeys, ...user })).toEqual(reverseUser);
  });

  it('Parses a payload', () => {
    expect(payload.parse({})).toEqual({});
    expect(payload.parse({ ...randomKeys, ...reverseUser })).toEqual(user);
  });

  it('Always returns the same object with empty call to constructor', () => {
    const empty = new AuthPayload();

    expect(empty.create(user)).toEqual(user);
    expect(empty.parse(reverseUser)).toEqual(reverseUser);
  });
});
