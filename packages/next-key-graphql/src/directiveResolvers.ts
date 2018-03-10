import {
  DirectiveResolverFn,
  IDirectiveResolvers
} from 'graphql-tools/dist/Interfaces';
import { AuthConnectorContext } from './connector';

export type AuthDirectiveResolver = DirectiveResolverFn<
  any,
  AuthConnectorContext
>;

export interface AuthDirectiveArgs {
  required?: boolean;
  scope?: string | string[];
}

export interface AuthDirectiveResolvers
  extends IDirectiveResolvers<any, AuthConnectorContext> {
  auth: AuthDirectiveResolver;
}

export const authDirectiveResolvers: AuthDirectiveResolvers = {
  auth(next, _, { required, scope }: AuthDirectiveArgs, { AuthToken }) {
    const { errors } = AuthToken;
    const payload = AuthToken.getPayload();

    if (!payload && required === false) return next();
    if (!payload) throw new errors.LoginRequired();
    if (scope && !AuthToken.hasScope(scope)) throw new errors.ScopeRequired();

    return next();
  }
};
/**
 * Resolver for the @auth directive, this is the same as
 * authDirectiveResolvers.auth
 */
export const authResolver = authDirectiveResolvers.auth;
