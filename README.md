# next-key
next-key is a collection of packages to make simpler the building of a
customized auth workflow, it has support for Express, Micro.js, and any other
http server cause Micro is just http. It also includes support for Graphql, a
client side implementation and a HOC for Next.js

## How it works
next-key uses an accessToken and refreshToken (optional but recommended) to the manage authentication in your app, it doesn't create the tokens for you, instead
it only reduces the boilerplate required to use the auth tokens so you can use
any database and token implementation you like.

This package was also built thinking in microservices, to know more, get
started!

## Getting started
