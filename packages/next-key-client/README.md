# next-key-client

Handles authentication for the client, supports SSR

## How to use

Install it with npm or yarn

```bash
npm install next-key-client
```

Create a new instance of the authentication client

```js
import { AuthClient } from 'next-key-client'
// this works too
// import AuthClient from 'next-key-client'

const authClient = new AuthClient({ ... })
```

## API

### `AuthClient`

#### `constructor(options: AuthClientOptions): AuthClient`

`AuthClientOptions` accepts the following fields:

#### cookie

`default:` `'a_t'`

Name of the cookie that will be used to save the accessToken

```ts
cookie?: string = 'a_t'
```

#### cookieOptions

Options that will be used to save the cookie, those are the same
[CookieAttributes](https://github.com/js-cookie/js-cookie#cookie-attributes)
of js-cookie

```ts
cookieOptions?: CookieAttributes | (accessToken?: string) => CookieAttributes
```

#### decode

`required`

Function that receives an `accessToken` and returns the decoded payload

```ts
decode: (accessToken: string) => object | null | void
```

#### fetchConnector

A [connector](#connectors) to connect `AuthClient` with a server, not using this means that you don't need a `refreshToken` because an `accessToken` can be entirely handled by the client

```ts
fetchConnector?: FetchConnector
```

#### refreshTokenCookie

Name of the `refreshToken` cookie, not using this means that you don't need a
`refreshToken`

```ts
refreshTokenCookie?: string
```

#### getTokens

Function that returns an object with an `accessToken` and `refreshToken`, used
to find the stored tokens during server side rendering (SSR)

```ts
getTokens?: (
  req: IncomingMessage
) => { refreshToken?: string; accessToken?: string } | void;
```

by default, `AuthClient` is using the following implementation that will work
for most use cases

```js
function getTokens(req) {
  const parseCookie = require('cookie').parse;
  const { cookie } = req.headers;
  const cookies = cookie && parseCookie(cookie);

  if (!cookies) return;

  return {
    refreshToken: this.refreshTokenCookie && cookies[this.refreshTokenCookie],
    accessToken: cookies[this.cookie]
  };
}
```

---

After creating an instance of `AuthClient` the following methods are available

#### `getAccessToken(): string`

Returns the accessToken from cookies

#### `setAccessToken(accessToken: string): string`

Sets an accessToken as a cookie

#### `removeAccessToken(): void`

Removes the accessToken from cookies, if you're not using a `refreshToken`, this
does the same of `logout`

#### `fetchAccessToken(req?: IncomingMessage): Promise<string>`

Request a new accessToken, sending `req` means that the token will be
created during SSR

#### `logout(): Promise<{ done: boolean }>`

Logouts the user, this means remove both accessToken and refreshToken from
cookies, it's client side only

### Connectors

A connector will allow `AuthClient` to connect with a server, required only
when you're working with a `refreshToken`, that are usually very secure and
`httpOnly`

#### HttpConnector

Connects the client with a REST API

```ts
new HttpConnector({
  refreshAccessTokenUri: string;
  logoutUri: string;
}): HttpConnector
```

The implementation should look like this

```js
import { AuthClient, HttpConnector } from 'next-key-client'

const authClient = new AuthClient({
  fetchConnector: new HttpConnector({
    refreshAccessTokenUri: 'http://localhost:3000/refresh',
    logoutUri: 'http://localhost:3000/logout'
  })
})
```
