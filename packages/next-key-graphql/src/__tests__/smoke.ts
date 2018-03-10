import Default, {
  AuthConnector,
  authDirective,
  authDirectiveResolvers,
  authResolver,
  authResolvers,
  authTypeDefs,
  getAuthSchema,
  GraphqlAuth,
  MicroAuth
} from '../';

it('Should have the required exports', () => {
  expect(Default).toBe(GraphqlAuth);
  expect(GraphqlAuth).toBeDefined();
  expect(MicroAuth).toBeDefined();

  expect(AuthConnector).toBeDefined();
  expect(authDirectiveResolvers).toBeDefined();
  expect(authResolvers).toBeDefined();
  expect(getAuthSchema).toBeDefined();
  expect(authTypeDefs).toBeDefined();
  /**
   * Shorcuts to make easier the implementation of the @auth directive
   */
  expect(authDirective).toBe(authTypeDefs.auth);
  expect(authResolver).toBe(authDirectiveResolvers.auth);
});
