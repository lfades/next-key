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
    refreshAccessTokenUri: URL + '/accessToken',
    logoutUri: URL + '/logout'
  });

  app.get('/accessToken', (_req, res) => {
    res.json({ accessToken });
  });

  app.get('/logout', (_req, res) => {
    res.json({ done: true });
  });

  app.get('/error', (_req, res) => {
    res.statusMessage = 'failed';
    res.status(400).end();
  });

  app.get('/customErrorMsg', (_req, res) => {
    res.status(400).json({ message: 'failed' });
  });

  app.get('/customErrorCode', (_req, res) => {
    res.status(400).json({ code: 'it_failed' });
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

  it('Throws a FetchError with a custom error object', async () => {
    const c = new HttpConnector({
      refreshAccessTokenUri: URL + '/customErrorMsg',
      logoutUri: URL + '/customErrorCode'
    });

    expect.assertions(10);

    try {
      await c.createAccessToken({});
    } catch (e) {
      expect(e.name).toBe('FetchError');
      expect(e.status).toBe(400);
      expect(e.code).toBe(400);
      expect(e.message).toBe('failed');
      expect(e.res).toBeDefined();
    }

    try {
      await c.logout({});
    } catch (e) {
      expect(e.name).toBe('FetchError');
      expect(e.status).toBe(400);
      expect(e.code).toBe('it_failed');
      expect(typeof e.message).toBe('string');
      expect(e.res).toBeDefined();
    }
  });

  it('Throws a FetchError on invalid status code', async () => {
    const c = new HttpConnector({
      refreshAccessTokenUri: URL + '/error',
      logoutUri: ''
    });

    expect.assertions(4);

    try {
      await c.createAccessToken({});
    } catch (e) {
      expect(e.name).toBe('FetchError');
      expect(e.code).toBe(400);
      expect(e.message).toBe('failed');
      expect(e.res).toBeDefined();
    }
  });

  it('Throws a NetworkError for invalid requests', async () => {
    const c = new HttpConnector({
      refreshAccessTokenUri: '',
      logoutUri: 'invalid url'
    });

    expect.assertions(4);

    try {
      await c.logout({});
    } catch (e) {
      expect(e.name).toBe('NetworkError');
      expect(e.code).toBe(NETWORK_ERROR_CODE);
      expect(e.message).toBe(NETWORK_ERROR_MESSAGE);
      expect(e.res).toBeUndefined();
    }
  });
});
