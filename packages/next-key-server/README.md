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
import { AuthServer } from 'next-key-client'
// this works too
// import AuthServer from 'next-key-client'

const AuthServer = new AuthServer({ ... })
```

## API

### `AuthServer`

#### `constructor(options: AuthServerOptions<CookieOptions>): AuthServer`

`AuthServerOptions` accepts the following fields:

#### accessToken

`required`

This is the `accessToken`implementation  that will be used by your server

```ts
accessToken: AuthAccessToken<CookieOptions>
```

#### refreshToken

This is the `refreshToken` implementation that will be used by your server, is very similar to `accessToken` and it's not required

```ts
refreshToken?: AuthRefreshToken<CookieOptions>
```

#### payload

`default:` `new Payload()`

This allows you to modify the payload before saving it to the `accessToken` and parse it back too. The default behaviour will leave the payload as it is, look at `Payload` to see what can you do with it

```ts
payload?: AuthPayload = new Payload()
```

#### scope

`default:` `new Scope()`

Manages a scope for the `accessToken`, to see how it works look at `Scope`

```ts
scope?: AuthScope = new Scope()
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

Creates a new `refreshToken`, it returns a Promise that resolvers with the refreshToken

#### `createTokens(data)`

Creates both accessToken and refreshToken, it returns a Promise that resolves with the tokens in an object

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
