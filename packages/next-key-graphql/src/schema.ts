import { GraphQLSchema } from 'graphql';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
import { authDirectiveResolvers } from './directiveResolvers';
import { authResolvers } from './resolvers';
import { authTypeDefs } from './typeDefs';

const { Mutation, Query } = authResolvers;

export interface AuthSchemaOptions {
  includeMutation?: boolean;
}
/**
 * Creates an executable schema that handles authentication, it can be merged
 * with any other schema
 * Important: by using mergeSchemas from Apollo it will not include the auth
 * directive
 */
export function getAuthSchema(options?: AuthSchemaOptions): GraphQLSchema {
  const { includeMutation = false } = options || {};
  const resolversMap = [];
  const typeDefs = [authTypeDefs.auth, authTypeDefs.Query];

  resolversMap.push({ Query });

  if (includeMutation) {
    typeDefs.push(authTypeDefs.Mutation);
    resolversMap.push({ Mutation });
  }

  const schema = makeExecutableSchema({
    typeDefs,
    directiveResolvers: authDirectiveResolvers,
    resolvers: resolversMap
  });

  addMockFunctionsToSchema({ schema });

  return schema;
}
