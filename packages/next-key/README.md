# next-key

HOC for Next.js that implements [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client)

## How to use

Install it with npm or yarn

```bash
npm install next-key
```

Create a new instance of the authentication client and create the HOC

```js
// lib/withAuth.js
import { AuthClient } from 'next-key'
// this works too
// import AuthClient from 'next-key'

export const authClient = new AuthClient({ ... })

export default withAuth({
  client: authClient
})
```

Use the instance on any of your pages!

```js
// pages/index.js
import withAuth from '../lib/withAuth'

export default withAuth(({ accessToken }) => {
  <h1>Hello world!, your accessToken is: {accessToken}<h1>
})
```

The HOC will take care of refetching the accessToken for you, it will be available in both SSR and client unless you're not logged in, of course

## API

### `AuthClient`

Same `AuthClient` used by [next-key-client](https://github.com/lfades/next-key/tree/master/packages/next-key-client#AuthClient)
