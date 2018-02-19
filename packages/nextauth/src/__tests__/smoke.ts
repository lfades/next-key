import { authClient, withAuth } from '../';

it('Should have the required exports', () => {
  expect(authClient).toBeDefined();
  expect(withAuth).toBeDefined();
});
