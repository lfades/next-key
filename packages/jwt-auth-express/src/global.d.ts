import { StringAnyMap } from 'jwt-auth-server';

declare global {
  namespace Express {
    interface Request {
      user?: StringAnyMap | null;
    }
  }
}
