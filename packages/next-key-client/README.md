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

Connector that will be used to connector the `AuthClient` with the server, not
using this means that you don't need a `refreshToken` because an `accessToken`
can be entirely handle by the client

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
