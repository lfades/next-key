// Types from: https://github.com/developit/unfetch/blob/master/packages/isomorphic-unfetch/index.d.ts
// The following types are not yet publish to npm so I had to make my local copy
declare module 'isomorphic-unfetch' {
  import {
    Body as NodeBody,
    Headers as NodeHeaders,
    Request as NodeRequest,
    Response as NodeResponse
  } from "node-fetch";

  namespace unfetch {
    export type IsomorphicHeaders = Headers | NodeHeaders;
    export type IsomorphicBody = Body | NodeBody;
    export type IsomorphicResponse = Response | NodeResponse;
    export type IsomorphicRequest = Request | NodeRequest
  }

  const unfetch: typeof fetch;

  export = unfetch;
}
