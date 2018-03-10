import { GraphQLDirective, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { makeExecutableSchema, mergeSchemas } from 'graphql-tools';
import { getAuthSchema } from '..';

describe('getAuthSchema', () => {
  const appSchema = makeExecutableSchema({
    typeDefs: `
      type Post {
        id: ID!
        authorId: ID!
        text: String
      }

      type Query {
        postById(id: ID!): Post
        postsByAuthorId(authorId: ID!): [Post]
      }

      type Mutation {
        updatePostById(id: ID!, text: String!): Post
      }
    `
  });
  const authSchema = getAuthSchema({
    includeMutation: true
  });

  it('Creates a simple schema only with directives', () => {
    const schema = getAuthSchema();
    const query = schema.getQueryType();

    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(schema.getMutationType()).toBeFalsy();
    expect(schema.getDirective('auth')).toBeInstanceOf(GraphQLDirective);
    expect(schema.getType('AuthTokenData')).toBeUndefined();
    expect(query.getFields().nextKeyVersion).toMatchObject({
      name: 'nextKeyVersion'
    });
  });

  it('Creates the schema with mutations', () => {
    const schema = authSchema;
    const Mutation = schema.getMutationType();

    expect(schema).toBeInstanceOf(GraphQLSchema);
    expect(Mutation).toBeInstanceOf(GraphQLObjectType);
    expect(schema.getDirective('auth')).toBeInstanceOf(GraphQLDirective);
    expect(schema.getType('AuthTokenData')).toBeInstanceOf(GraphQLObjectType);

    if (Mutation) {
      const fields = Mutation.getFields();

      expect(fields.logout).toMatchObject({ name: 'logout' });
      expect(fields.refreshAccessToken).toMatchObject({
        name: 'refreshAccessToken'
      });
    }
  });

  it('Merges the schema', () => {
    const schema = mergeSchemas({
      schemas: [appSchema, authSchema]
    });
    const query = schema.getQueryType();
    const mutation = schema.getMutationType();

    // By the time I wrote this test mergeSchemas doesn't merge directives
    expect(schema.getDirective('auth')).toBeUndefined();
    expect(query.getFields()).toEqual({
      postById: expect.any(Object),
      postsByAuthorId: expect.any(Object),
      nextKeyVersion: expect.any(Object)
    });
    expect(mutation).toBeInstanceOf(GraphQLObjectType);

    if (mutation) {
      expect(mutation.getFields()).toEqual({
        updatePostById: expect.any(Object),
        logout: expect.any(Object),
        refreshAccessToken: expect.any(Object)
      });
    }
  });
});
