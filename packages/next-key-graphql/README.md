# next-key-graphql

Handles authentication for a Graphql server

## How to use

Install it with npm or yarn

```bash
npm install next-key-graphql
```

Add the `auth` directive to the schema

```js
import { authDirective, authResolver } from 'next-key-graphql'

const schema = makeExecutableSchema({
  typeDefs: [..., authDirective],
  resolvers: {...},
  directiveResolvers: { auth: authResolver }
})
```

The `auth` directive needs to use the `context` for it to work, so the `AuthToken` connector
should be included too

```js
import { AuthConnector } from 'next-key-graphql'

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress((req, res) => ({
  context: {
    // microAuth is the auth server created by next-key-micro
    // next-key-express will also work here using expressAuth.micro
    AuthToken: new AuthConnector({ auth: microAuth, req, res })
  }
})))
```

Now add the auth directive to any of your queries!

```graphql
type Query {
  user: User @auth
}
```

The directive will check for an `accessToken` and do some validations before the
exceution of the `user` resolver

## API

any of the following can be imported directly from the package

```ts
import { AuthConnector, ... } from 'next-key-graphql'
```

### `AuthConnector`

Connector to handle authentication inside resolvers for a graphql request, this is required for the use of the `auth` directive and `getAuthSchema`

#### `constructor(options: AuthConnectorOptions): AuthConnector`

`AuthConnectorOptions` accepts the following fields

**`auth`**: Instance of `MicroAuth`, if you're using [next-key-express](https://github.com/lfades/next-key/tree/master/packages/next-key-express) it must be in `expressAuth.micro`

**`req`**: Http request, it can also be an object with headers

**`res?`**: Http response, it's not required but is necessary if you want to use [getAuthSchema](#getAuthSchema)

**`errors?`**: Custom errors that will be thrown if an user is not authorized, by default the following errors are used

```js
{
  LoginRequired: Error.bind(null, 'You need to login first'),
  ScopeRequired: Error.bind(null, 'You are not allowed to be here')
}
```

The default errors are located in a `static` prop inside `AuthConnector.errors`, changing it will also work, specially useful if you're using a class that extends `AuthConnector` instead of using it directly

The connector must be added to the graphql context as `AuthToken`, then you can use it in any resolver

```js
const resolvers = {
  Query: {
    // We're assuming here that user it's using @auth
    user(source, args, context) {
      return context.AuthToken.getUser()
    }
  }
}
```

to see all the methods available in `AuthConnector` check the docs in the [source](https://github.com/lfades/next-key/blob/master/packages/next-key-graphql/src/connector.ts#L25) code.

### `authDirective`

`string` that contains the graphql definition for the [auth directive](https://github.com/lfades/next-key/blob/master/packages/next-key-graphql/graphql/auth.graphql), the following examples will explain how the directive works

`@auth`: check for an accessToken, will throw an error if it's invalid

`@auth(required: false)`: same as above, but will not throw an error

`@auth(scope: 'admin:read')`: check if the accessToken contains an specific scope, will throw an error if it doesn't, `scope` can be a string or an array of strings: `['admin:read', 'admin:write']`

### `authResolver`

resolver for the `auth` directive, it should be used inside `directiveResolvers`

### `getAuthSchema()`

Creates an executable schema that handles authentication and can be merged with any other schema, it doesn't includes the auth directive but two mutations that will allow you to create a new accessToken and do a logout using graphql

```js
import { getAuthSchema } from 'next-key-graphql'

const authSchema = getAuthSchema()
const appSchema = makeExecutableSchema({...})

const schema = mergeSchemas({
  schemas: [appSchema, authSchema]
})
```

`schema` is now merged with the following graphql schema

```graphql
type AuthTokenData {
  accessToken: String!
}

type Mutation {
  # Logouts the user
  logout: Boolean!

  # Refreshes the accessToken
  refreshAccessToken: AuthTokenData!
}
```
