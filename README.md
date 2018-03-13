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

For a basic implementation a refreshToken is not required, in this case we're
using an accessToken that never expires and a Express server

### Server

```js
import { ExpressAuth } from 'next-key-express';
import jwt from 'jsonwebtoken';

const secret = 'xxx'
const authServer = new ExpressAuth({
  accessToken: {
    create(data) {
      return jwt.sign(payload, secret);
    },
    verify(accessToken) {
      return jwt.verify(accessToken, secret, {
        algorithms: ['HS256']
      });
    }
  }
});
```

### Client

```js
const authClient = new AuthClient({
    decode(at) {
      try {
        return jwtDecode(at);
      } catch {
        return;
      }
    }
  });
```
