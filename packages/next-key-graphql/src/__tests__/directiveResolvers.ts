import {
  AuthConnector,
  AuthDirectiveArgs,
  authDirectiveResolvers,
  GraphqlAuth
} from '..';
import {
  ACCESS_TOKEN,
  AccessToken,
  authScope,
  RefreshToken,
  testRequest,
  validScope
} from '../testUtils';

describe('@auth directive', () => {
  const auth = new GraphqlAuth({
    accessToken: new AccessToken(),
    refreshToken: new RefreshToken(),
    scope: authScope
  });
  const LoginRequired = new AuthConnector.errors.LoginRequired();
  const ScopeRequired = new AuthConnector.errors.ScopeRequired();
  const testDirective = (
    fn: (resolve: (args?: AuthDirectiveArgs) => Promise<any>) => Promise<void>
  ) => {
    return testRequest(async (req, res) => {
      const context = { AuthToken: new AuthConnector({ auth, req, res }) };

      await fn(args => {
        return authDirectiveResolvers.auth(
          async () => {
            // Do nothing
          },
          null,
          args || {},
          context,
          {} as any
        );
      });
    });
  };

  it('Throws an error if the Authorization header is invalid', async () => {
    expect.assertions(1);

    await testDirective(async resolve => {
      try {
        await resolve();
      } catch (e) {
        expect(e.message).toBe(LoginRequired.message);
      }
    });
  });

  it('Continues if the Authorization header is not required', async () => {
    expect.assertions(1);

    await testDirective(async resolve => {
      expect(await resolve({ required: false })).toBeUndefined();
    });
  });

  it('Throws an error if the scope is invalid', async () => {
    expect.assertions(1);

    await testDirective(async resolve => {
      try {
        await resolve({ scope: 'xxx' });
      } catch (e) {
        expect(e.message).toBe(ScopeRequired.message);
      }
    }).set('Authorization', 'Bearer ' + ACCESS_TOKEN);
  });

  it('Continues if the scope is valid', async () => {
    expect.assertions(1);

    await testDirective(async resolve => {
      expect(await resolve({ scope: validScope })).toBeUndefined();
    }).set('Authorization', 'Bearer ' + ACCESS_TOKEN);
  });
});
