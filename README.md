# next-key

next-key is a collection of packages to make simpler the building of a
customized auth workflow, it has support for Express, Micro.js, and any other
http server cause Micro is just http. It also includes support for Graphql, a
client side implementation and a HOC for Next.js

## How it works

next-key uses an accessToken and refreshToken (optional but recommended) to
manage authentication in your app, it doesn't create the tokens for you, instead
it only reduces the boilerplate required to use the auth tokens so you can use
any database and token implementation you like.

This package was also built thinking in microservices, to know more, get
started!

## Getting started

The docs for every package are inside their own folder instead of here

* [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client): Handles authentication for the client, supports SSR
* next-key-server: Handles authentication in Node.js
* next-key-micro: Handles authentication for Micro.js, Micro is almost the same as a basic http server
* next-key-express: Handles authentication for Express
* next-key: This one is a HOC for Next.js that implements **next-key-client**

For a basic implementation a refreshToken is not required, in this case we're
using an accessToken that never expires on a Express server, the accessToken
is created after the user goes to `/login` and added as a cookie by the server

```js
// server.js
import { ExpressAuth } from 'next-key-express'
import jwt from 'jsonwebtoken'

const secret = 'xxx'
const authServer = new ExpressAuth({
  accessToken: {
    create(data) {
      return jwt.sign(payload, secret)
    },
    verify(accessToken) {
      return jwt.verify(accessToken, secret, {
        algorithms: ['HS256']
      })
    }
  }
})
const app = express()

app.get('/login', (req, res) => {
  const user = { id: '123', name: 'Luis' }
  const { accessToken } = authServer.createAccessToken(user)

  authServer.setAccessToken(res, accessToken)
})
app.listen(3000)
// -----------------------------------------------------------------------
// client.js
import { AuthClient } from 'next-key-client'

const authClient = new AuthClient({
  decode(at) {
    try {
      return jwtDecode(at)
    } catch {
      return
    }
  }
})

await fetch('http://localhost:3000/login')
```

Sometimes is unnecessary to set the accessToken in the server, specially if the
cookie will be available in `document.cookie`, with a little change the client
can be the one who sets the cookie:

```js
// server.js
app.get('/login', (req, res) => {
  const user = { id: '123', name: 'Luis' }
  const { accessToken } = authServer.createAccessToken(user)

  res.json({ accessToken })
})
// client.js
const accessToken = await fetch('http://localhost:3000/login')
authClient.setAccessToken(accessToken)
```

Now, using a refreshToken

```js
// server.js
import { ExpressAuth } from 'next-key-express'
import jwt from 'jsonwebtoken'

const secret = 'xxx'
const refreshTokens = new Map() // use a database/redis/etc here
const authServer = new ExpressAuth({
  accessToken: {
    create(payload) {
      return jwt.sign(payload, secret)
    },
    verify(accessToken) {
      return jwt.verify(accessToken, secret, {
        algorithms: ['HS256']
      })
    }
  },
  refreshToken: {
    async getPayload(refreshToken, reset) {
      reset() // useful to refresh the expiration date of our refreshToken
      return refreshTokens.get(refreshToken)
    },
    async create(data) {
      const id = 'random_id'
      refreshTokens.set(id, data)
      return id
    },
    remove(refreshToken) {
      return refreshTokens.delete(refreshToken);
    }
  }
})
const app = express()

app.get('/refresh', authServer.refreshAccessTokenHandler)
app.get('/logout', authServer.logoutHandler)
app.get('/login', async (req, res) => {
  const user = { id: '123', name: 'Luis' }
  const { refreshToken, accessToken } = await authServer.createTokens(user)

  authServer.setRefreshToken(res, refreshToken)
  authServer.setAccessToken(res, accessToken)
})
app.get('/profile', authServer.authorize, req => {
  console.log(req.user) // { id: '123', name: 'Luis' } or null
})
app.listen(3000)
// -----------------------------------------------------------------------
// client.js
import { AuthClient, HttpConnector } from 'next-key-client'

const authClient = new AuthClient({
  refreshTokenCookie: 'r_t', // This is the default cookie used by the server
  fetchConnector: new HttpConnector({
    refreshAccessTokenUri: 'http://localhost:3000/refresh',
    logoutUri: 'http://localhost:3000/logout'
  }),
  decode(at) {
    try {
      return jwtDecode(at)
    } catch {
      return
    }
  }
})

await fetch('http://localhost:3000/login')

await authClient.fetchAccessToken() // returns a new accessToken

await authClient.logout() // removes both tokens
```

For Next.js there is a HOC (High Order Component) available that will send
the `accessToken` as a prop to the component

```js
// withAuth.js
import { withAuth } from 'next-key'

export default withAuth({ ...AuthClient options })

// pages/page.js
import withAuth from '../withAuth'

export default withAuth(({ accessToken }) => (
  <h1>Hello World! {accessToken}</h1>
))
```

When using an endpoint that only cares about verifying the accessToken and
nothing else, like a microservice, the following is also possible

```js
// auth.js
import { MicroAuth } from 'next-key-micro'
import jwt from 'jsonwebtoken'

const secret = 'xxx'

export default new MicroAuth({
  accessToken: {
    verify(accessToken) {
      return jwt.verify(accessToken, secret, {
        algorithms: ['HS256']
      })
    }
  }
})

// microRoute.js - using Micro.js
import auth from './auth'

module.exports = req => {
  const user = auth.getUser(req) // is the payload of the accessToken or null
}
```
