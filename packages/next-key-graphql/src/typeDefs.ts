/**
 * Type definitions for the graphql schema
 */
import { importSchema } from 'graphql-import';
import path from 'path';

const graphqlFile = (name: string) =>
  importSchema(path.join(__dirname, `../graphql/${name}.graphql`));

export const authTypeDefs = {
  auth: graphqlFile('auth'),
  Mutation: graphqlFile('Mutation'),
  Query: graphqlFile('Query')
};
/**
 * Type definition for the @auth directive, this is the same as
 * authTypeDefs.auth
 */
export const authDirective = authTypeDefs.auth;
