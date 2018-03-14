import express from 'express';
import { Server } from 'http';
import jwtDecode from 'jwt-decode';
import { AuthClient, HttpConnector } from '.';
/**
 * AccessToken with no expiration date
 */
export const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1SWQiOiJ1c2VyXzEyMyIsImNJZCI6ImNvbXBhbnlfMTIzIiwic2NvcGUiOiJhOnI6dyIsImlhdCI6MTUxOTA2MjY4MH0.FPnQLylqy7hfTLULsNDLNhaswFD3HI7zxRt6G-u3h9s';

export const AT_COOKIE = 'a_t';

export const RT_COOKIE = 'r_t';

export const decode = (at: string) => {
  try {
    return jwtDecode(at);
  } catch {
    return;
  }
};

export const fetchConnector = new HttpConnector({
  createAccessTokenUrl: '',
  logoutUrl: ''
});

export const basicAuth = new AuthClient({ decode });

export const createServer = (): {
  server: Server;
  authClient: AuthClient;
  url: string;
} => {
  const app = express();

  app.get('/accessToken', (_req, res) => {
    res.json({ accessToken: 'newToken' });
  });

  app.get('/accessToken/late', (_req, res) => {
    setTimeout(() => {
      res.json({ accessToken: Math.random().toString(36) });
    }, 500);
  });

  app.get('/logout', (_req, res) => {
    res.json({ done: true });
  });

  app.get('/error', (_req, res) => {
    res.status(400).json({ message: 'failed' });
  });

  const server: Server = app.listen(0);
  const { port } = server.address();
  const url = `http://localhost:${port}`;
  const authClient = new AuthClient({
    decode,
    refreshTokenCookie: 'r_t',
    fetchConnector: new HttpConnector({
      createAccessTokenUrl: `${url}/accessToken`,
      logoutUrl: `${url}/logout`
    })
  });

  return { server, authClient, url };
};
