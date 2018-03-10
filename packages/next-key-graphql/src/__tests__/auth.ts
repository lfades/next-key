import { GraphQLSchema } from 'graphql';
import { AuthConnector, GraphqlAuth } from '..';
import { AccessToken, RefreshToken } from '../testUtils';

describe('Auth with Graphql', () => {
  const auth = new GraphqlAuth({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken()
  });

  it('Can create a connector', () => {
    const req = { headers: {} };
    expect(auth.connector({ req })).toBeInstanceOf(AuthConnector);
  });

  it('Can create a schema', () => {
    expect(auth.getSchema()).toBeInstanceOf(GraphQLSchema);
  });
});
