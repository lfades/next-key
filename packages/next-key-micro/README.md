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

`AuthServerOptions` are the same options used by [next-key-server](https://github.com/lfades/next-key/tree/master/packages/next-key-server#authserver). The cookie options used by this package are the same of [cookie](https://github.com/jshttp/cookie#options-1)

---

After creating an instance of `MicroAuth` the following methods are available

#### `refreshAccessTokenHandler`

Http handler that will create a new `accessToken` using the current `refreshToken` stored in cookies

```js
module.exports = microAuth.refreshAccessTokenHandler
```

The response body will be a json with the `accessToken` inside, [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client) will handle the response for you

#### `logoutHandler`

Http handler that will logout an user by removing his `refreshToken` from cookies

```js
module.exports = microAuth.logoutHandler
```

The response body will be a json with the following shape: `{ done: boolean }`, [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client) will handle the response for you

#### `getUser(req)`

Returns the user payload in an `accessToken` from a request or `null`, the `req` prop can be an http request or an object with headers

```js
module.exports = (req, res) => {
  const user = microAuth.getUser(req)
  if (!user) throw new Error('Unauthorized')
}
```

#### `getRefeshToken(headers)`

Returns the refreshToken from cookies or `null`

#### `getAccessToken(headers)`

Returns the accessToken from headers or `null`

#### `setRefreshToken(res, refreshToken)`

Sets a `refreshToken` as a cookie, `res` is an http response and `refreshToken` the token string that will be set

#### `setAccessToken(res, accessToken)`

Sets an `accessToken` as a cookie, `res` is an http response and `accessToken` the token string that will be set

> **Note**: the examples show the usage with Micro.js
