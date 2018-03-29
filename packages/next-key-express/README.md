# next-key-express

Handles authentication for Express

## How to use

Install it with npm or yarn

```bash
npm install next-key-express
```

Create a new instance of the authentication server

```js
import { ExpressAuth } from 'next-key-express'
// this works too
// import ExpressAuth from 'next-key-express'

const expressAuth = new ExpressAuth({ ... })
```

## API

### `ExpressAuth`

#### `constructor(options: AuthServerOptions<CookieOptions>): ExpressAuth`

`AuthServerOptions` are the same options used by [next-key-server](https://github.com/lfades/next-key/tree/master/packages/next-key-server). The cookie options used by this package are the same of [express](http://expressjs.com/en/4x/api.html#res.cookie)

---

After creating an instance of `ExpressAuth` the following methods are available

#### `refreshAccessTokenHandler`

Http handler that will create a new `accessToken` using the current `refreshToken` stored in cookies

```js
const app = express()
app.get(
  '/refreshAccessToken', expressAuth.refreshAccessTokenHandler
)
```

The response body will be a json with the `accessToken` inside, [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client) will handle the response for you

#### `logoutHandler`

Http handler that will logout an user by removing his `refreshToken` from cookies

```js
const app = express()
app.get('/logout', expressAuth.logoutHandler)
```

The response body will be a json with the following shape: `{ done: boolean }`

#### `authorize`

Assigns to req.user the payload of the `accessToken` or null

```js
const app = express()
app.get('/profile', expressAuth.authorize, req => {
  const user = req.user
})
```

#### `getUser(req)`

Returns the user payload in an `accessToken` from a request or `null`. `req` can be an http request or an object with headers

```js
const app = express()
app.get('/profile', (req, res) => {
  const user = expressAuth.getUser(req)
  if (!user) res.status(401).send('Unauthorized')
})
```

#### `getRefeshToken(req)`

Returns the refreshToken from cookies or `null`

#### `getAccessToken(headers)`

Returns the accessToken from headers or `null`

#### `setRefreshToken(res, refreshToken)`

Sets a `refreshToken` as a cookie, `res` is an http response and `refreshToken` the token string that will be set

#### `setAccessToken(res, accessToken)`

Sets an `accessToken` as a cookie, `res` is an http response and `accessToken` the token string that will be set
