import { GraphQLSchema } from 'graphql';
import MicroAuth from 'next-key-micro';
import { AuthConnector, ConnectorOptions } from './connector';
import { AuthSchemaOptions, getAuthSchema } from './schema';

export default class GraphqlAuth extends MicroAuth {
  /**
   * Returns an authentication connector that can be used in the context of a
   * graphql request
   */
  public connector(options: ConnectorOptions) {
    return new AuthConnector({ auth: this, ...options });
  }
  /**
   * Creates an executable schema that handles authentication, it can be merged
   * with any other schema
   */
  public getSchema(options?: AuthSchemaOptions): GraphQLSchema {
    return getAuthSchema(options);
  }
}
