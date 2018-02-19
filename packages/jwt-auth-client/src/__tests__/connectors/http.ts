import express from 'express';
import { Server } from 'http';
import { HttpConnector } from '../..';

describe('Http connector', () => {
  const PORT = 5001;
  const URL = 'http://localhost:' + PORT;
  const NETWORK_ERROR_CODE = 'network_error';
  const NETWORK_ERROR_MESSAGE = 'A network error has occurred. Please retry';

  let server: Server;

  const accessToken = '12345';
  const app = express();
  const connector = new HttpConnector({
    createAccessTokenUrl: URL + '/accessToken',
    logoutUrl: URL + '/logout'
  });

  app.get('/accessToken', (_req, res) => {
    res.json({ accessToken });
  });

  app.get('/accessToken/error', () => {
    throw new Error();
  });

  app.get('/accessToken/customErrorObj', (_req, res) => {
    res.status(400).json({ message: 'failed', code: 'it_failed' });
  });

  app.get('/logout', (_req, res) => {
    res.json({ done: true });
  });

  beforeAll(() => {
    server = app.listen(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('Creates an accessToken', async () => {
    const data = await connector.createAccessToken({});

    expect(data).toEqual({ accessToken });
  });

  it('Logouts', async () => {
    const data = await connector.logout({});

    expect(data).toEqual({ done: true });
  });

  it('Throws a FetchError for custom error object response', async () => {
    const c = new HttpConnector({
      createAccessTokenUrl: URL + '/accessToken/customErrorObj',
      logoutUrl: URL + '/logout'
    });

    expect.assertions(5);

    try {
      await c.createAccessToken({});
    } catch (e) {
      expect(e.name).toBe('FetchError');
      expect(e.status).toBe(400);
      expect(e.code).toBe('it_failed');
      expect(e.message).toBe('failed');
      expect(e.res).toBeTruthy();
    }
  });

  it('Throws a NetworkError for invalid requests', async () => {
    const c = new HttpConnector({
      createAccessTokenUrl: URL + '/accessToken/error',
      logoutUrl: URL + '/logout'
    });

    expect.assertions(3);

    try {
      await c.createAccessToken({});
    } catch (e) {
      expect(e.name).toBe('NetworkError');
      expect(e.code).toBe(NETWORK_ERROR_CODE);
      expect(e.message).toBe(NETWORK_ERROR_MESSAGE);
    }
  });
});
