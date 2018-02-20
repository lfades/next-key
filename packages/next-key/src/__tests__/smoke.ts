import { AuthClient, withAuth } from '../';

it('Should have the required exports', () => {
  expect(AuthClient).toBeDefined();
  expect(withAuth).toBeDefined();
});
