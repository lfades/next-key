# next-key-micro

Handles authentication for Micro.js, it can also be used with any http server since Micro.js is a very simple http implementation

## How to use

Install it with npm or yarn

```bash
npm install next-key-micro
```

Create a new instance of the authentication server

```js
import { MicroAuth } from 'next-key-micro'
// this works too
// import MicroAuth from 'next-key-micro'

const microAuth = new MicroAuth({ ... })
```

## API

### `MicroAuth`

#### `constructor(options: AuthServerOptions<CookieOptions>): MicroAuth`

`AuthServerOptions` are the same options used by [next-key-server](https://github.com/lfades/next-key/tree/master/packages/next-key-server). The cookie options used by this package are the same of [cookie](https://github.com/jshttp/cookie#options-1)

---

After creating an instance of `MicroAuth` the following methods are available

#### `refreshAccessTokenHandler`

http handler that will return a new `accessToken` using the current `refreshToken` stored in cookies

```ts
// Usage in the server using micro.js
module.exports = authServer.refreshAccessTokenHandler
```

The response body will be a json with the `accessToken` inside, [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client) will handle the response for you
