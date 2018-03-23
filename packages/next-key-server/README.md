# next-key-server

Handles authentication in the server, you usually don't need to use this package directly, instead choose an http implementation of this package

* next-key-micro: Handles authentication for Micro.js, Micro is almost the same as a basic http server
* next-key-express: Handles authentication for Express

## How to use

Install it with npm or yarn

```bash
npm install next-key-server
```

Create a new instance of the authentication server

```js
import { AuthServer } from 'next-key-server'
// this works too
// import AuthServer from 'next-key-server'

const AuthServer = new AuthServer({ ... })
```

## API

### `AuthServer`

#### `constructor(options: AuthServerOptions<CookieOptions>): AuthServer`

`AuthServerOptions` accepts the following fields:

#### accessToken

`required`

This is the `accessToken` implementation  that will be used by your server

```ts
accessToken: AuthAccessToken<CookieOptions>
```

`AuthAccessToken<CookieOptions>` is an interface defined [here](https://github.com/lfades/next-key/blob/master/packages/next-key-server/src/interfaces.ts#L8) and accepts the following fields:

##### accessToken.scope

Manages an scope for the `accessToken`, this is only required when using
[next-key-graphql](https://github.com/lfades/next-key/tree/master/packages/next-key-graphql), to see how it works look at [Scope](#Scope)

```ts
scope?: AuthScope
```

##### accessToken.cookie

Name of the cookie for the `accessToken`, only used by http implementations of this package

##### accessToken.cookieOptions

Cookie options that will be used before creating or removing an `accessToken` as a cookie, it can be a function that receives the `accessToken` and returns the cookie options, the function will receive an empty string when removing. Only used by http implementations of this package

```ts
cookieOptions?: CookieOptions | ((accessToken: string) => CookieOptions);
```

##### accessToken.getPayload

Returns the payload that will be used for an `accessToken` based in `data`, not defining this method will leave `data` as the payload

```ts
getPayload?(data: { [key: string]: any }): { [key: string]: any }
```

##### accessToken.create

Creates the `accessToken`

```ts
create?(payload: { [key: string]: any }): Promise<string>
```

##### accessToken.verify

Verifies an `accessToken` and returns its payload

```ts
verify?(accessToken: string): { [key: string]: any }
```

#### refreshToken

This is the `refreshToken` implementation that will be used by your server, is very similar to `accessToken` and it's not required

```ts
refreshToken?: AuthRefreshToken<CookieOptions>
```

`AuthRefreshToken<CookieOptions>` is an interface defined [here](https://github.com/lfades/next-key/blob/master/packages/next-key-server/src/interfaces.ts#L33) and accepts the following fields:

##### refreshToken.cookie

Name of the cookie for the `refreshToken`, only used by http implementations of this package

##### refreshToken.cookieOptions

Cookie options that will be used before creating or removing an `refeshToken` as a cookie, it can be a function that receives the `refeshToken` and returns the cookie options, the function will receive an empty string when removing. Only used by http implementations of this package

```ts
cookieOptions?: CookieOptions | ((refreshToken: string) => CookieOptions);
```

##### refreshToken.getPayload

Returns the payload in a `refreshToken` that can be used to create a new `accessToken`, the first parameter is the `refreshToken` and the second a `reset`
function that can be used to refresh the cookie saved for the `refreshToken`

```ts
getPayload(
  refreshToken: string,
  reset: () => void
): Promise<{ [key: string]: any } | void
```

##### refreshToken.create

Creates a `refreshToken`

```ts
create(data: { [key: string]: any }): Promise<string>
```

##### refreshToken.remove

Removes a refreshToken

```ts
remove(refreshToken: string): Promise<boolean> | boolean
```

---

After creating an instance of `AuthServer` the following methods are available

#### `createAccessToken(data)`

Creates a new accessToken, `data` is the user that will be saved as the payload of the `accessToken`, it returns an object with the `accessToken` and resulting `payload` inside

```ts
createAccessToken(data: { [key: string]: any }): {
    accessToken: string;
    payload: { [key: string]: any };
}
```

#### `createRefreshToken(data): Promise<string>`

Creates a new `refreshToken`, it returns a Promise that resolves with the refreshToken

#### `createTokens(data)`

Creates both `accessToken` and `refreshToken`, it returns a Promise that resolves with the tokens in an object

```ts
createTokens(data: { [key: string]: any }): Promise<{
  refreshToken: string;
  accessToken: string;
  payload: StringAnyMap;
}>
```

#### `verify(accessToken: string): { [key: string]: any } | null`

Decodes and returns the payload of an accessToken

#### `removeRefreshRoken(refreshToken: string): boolean | Promise<boolean>`

Removes an active refreshToken

### `Scope`

#### `constructor(scope: { [key: string]: string }): AuthScope`

Manages a scope that can be used inside an `accessToken`, it aims to group multiple permissions in a tiny string

the param `scope` is an object where every `value` is the shortened version of its `key`, by default it includes the following: `{ read: 'r', write: 'w' }`

```js
const scope = new Scope({
  admin: 'a'
})

scope.create(['admin:read', 'admin:write']) // -> 'a:r:w'
scope.create(['admin:read:write']) // -> 'a:r:w'

scope.parse('a:r:w') // -> ['admin:read', 'admin:write']

scope.has(['admin:read', 'admin:write'], 'admin:read') // -> true
scope.has(['admin:read', 'admin:write'], ['xxx', 'admin:write']) // -> true
scope.has(['admin:read', 'admin:write'], 'xxx') // -> false
```

Inside `accessToken` it may look like this

```js
import { AuthServer, Scope } from 'next-key-server'

const secret = 'xxx'

const scope = new Scope({
  admin: 'a'
})

const AuthServer = new AuthServer({
  accessToken: {
    getPayload(data) {
      return {
        ...data,
        scope: scope.create(['admin:read', 'admin:write'])
      };
    }
    create(payload) {
      return jwt.sign(payload, secret)
    },
    verify(accessToken) {
      const payload = jwt.verify(accessToken, secret, {
        algorithms: ['HS256']
      })
      payload.scope = scope.parse(payload.scope)
      return payload
    }
  }
})
```
