import withAuth, { AuthClient } from '../';

it('Should have the required exports', () => {
  expect(withAuth).toBeDefined();
  expect(AuthClient).toBeDefined();
});
