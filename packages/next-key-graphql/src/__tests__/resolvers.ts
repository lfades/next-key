import { AuthConnector, AuthResolver, authResolvers, GraphqlAuth } from '..';
import pkg from '../../package.json';
import { AccessToken, RefreshToken } from '../testUtils';

describe('Schema resolvers', () => {
  const { Mutation, Query } = authResolvers;
  const auth = new GraphqlAuth({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken()
  });
  const req = { headers: {} };
  const context = { AuthToken: new AuthConnector({ auth, req }) };
  const testResolver = (resolver: AuthResolver) => {
    return resolver(null, {}, context, {} as any);
  };

  it('Logouts', async () => {
    expect(await testResolver(Mutation.logout)).toEqual({ done: false });
  });

  it('refreshes an accessToken', async () => {
    expect(await testResolver(Mutation.refreshAccessToken)).toBeUndefined();
  });

  it('Queries for package version', async () => {
    expect(await testResolver(Query.nextKeyVersion)).toBe(pkg.version);
  });
});
