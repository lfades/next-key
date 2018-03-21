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

### `Payload`

#### `constructor(payload: { [key: string]: string }): AuthPayload`

Aims to rename the keys of an `accessToken` payload, useful for example if you want to have shorter keys in the payload.

`payload` receives an object where the `key` is the key you want to have and the `value` is the actual key

```js
import { Payload } from 'next-key-server'

const userPayload = {
  id: 'user_123',
  companyId: 'company_123',
  scope: 'a:r:w',
  name: 'Luis'
}

const tokenPayload = {
  uId: 'user_123',
  cId: 'company_123',
  scope: 'a:r:w'
}

const payload = new Payload({
  uId: 'id',
  cId: 'companyId',
  scope: 'scope'
})

payload.create(userPayload) // -> tokenPayload

payload.parse(tokenPayload) // -> userPayload without 'name'
```

> Keys not defined in `payload` will be excluded after `create()`

> `AuthServer` will use `create()` and `parse()` for you

### `Scope`
