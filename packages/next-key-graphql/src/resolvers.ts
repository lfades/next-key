import { IFieldResolver, IResolvers } from 'graphql-tools/dist/Interfaces';
import pkg from '../package.json';
import { AuthConnectorContext } from './connector';

export type AuthResolver = IFieldResolver<any, AuthConnectorContext>;

export interface AuthResolvers extends IResolvers {
  Mutation: {
    logout: AuthResolver;
    refreshAccessToken: AuthResolver;
  };
  Query: {
    nextKeyVersion: IFieldResolver<any, any>;
  };
}

export const authResolvers: AuthResolvers = {
  Mutation: {
    logout(_source, _args, { AuthToken }) {
      return AuthToken.logout();
    },
    refreshAccessToken(_source, _args, { AuthToken }) {
      return AuthToken.refreshAccessToken();
    }
  },
  Query: {
    nextKeyVersion: () => pkg.version
  }
};
