import Payload, { isEmpty } from '../payload';

describe('Auth Payload', () => {
  const payload = new Payload({
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

  it('Has a proper check for empty values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty({})).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty(' ')).toBe(true);

    expect(isEmpty('something')).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
    expect(isEmpty([0])).toBe(false);
    expect(isEmpty({ '0': 0 })).toBe(false);
  });

  it('Creates a payload', () => {
    expect(payload.create({})).toEqual({});
    expect(payload.create({ ...randomKeys, ...user })).toEqual(reverseUser);
  });

  it('Parses a payload', () => {
    expect(payload.parse({})).toEqual({});
    expect(payload.parse({ ...randomKeys, ...reverseUser })).toEqual(user);
  });

  it('Always returns the same object with empty call to constructor', () => {
    const empty = new Payload();

    expect(empty.create(user)).toEqual(user);
    expect(empty.parse(reverseUser)).toEqual(reverseUser);
  });
});
