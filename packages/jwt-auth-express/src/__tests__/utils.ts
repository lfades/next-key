import express from 'express';
import request from 'supertest';
import {
  asyncMiddleware,
  BAD_REQUEST_CODE,
  BAD_REQUEST_MESSAGE,
  Fn,
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE
} from '../utils';

describe('asyncMiddleware', () => {
  const testRequest = (fn: Fn) => {
    const app = express();

    app.get('/', asyncMiddleware(fn));

    return request(app).get('/');
  };

  it('Should send an error with undefined return', async () => {
    const response = await testRequest(async () => {
      // same as return undefined
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(BAD_REQUEST_CODE);
    expect(response.body).toEqual({ message: BAD_REQUEST_MESSAGE });
  });

  it('Should send an internal error on throw', async () => {
    const response = await testRequest(async () => {
      throw new Error();
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(INTERNAL_ERROR_CODE);
    expect(response.body).toEqual({ message: INTERNAL_ERROR_MESSAGE });
  });

  it('Can send a custom status error', async () => {
    const response = await testRequest(async () => {
      return { error: { status: 401 } };
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: BAD_REQUEST_MESSAGE });
  });

  it('Can send custom error message and error code', async () => {
    const response = await testRequest(async () => {
      return { error: { code: 401, message: 'it failed' } };
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(BAD_REQUEST_CODE);
    expect(response.body).toEqual({ message: 'it failed', code: 401 });
  });

  it('Can send a json', async () => {
    const response = await testRequest(async () => {
      return { a: 'b', c: 'd' };
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ a: 'b', c: 'd' });
  });
});
