import express from 'express';
import request from 'supertest';
import { asyncMiddleware, Fn } from '../utils';

describe('asyncMiddleware', () => {
  const testRequest = (fn: Fn) => {
    const app = express();

    app.get('/', asyncMiddleware(fn));

    return request(app).get('/');
  };
  const invalidTokenMsg = 'Invalid token';

  it('Should send an error with undefined return', async () => {
    const response = await testRequest(async () => {
      // same as return undefined
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: invalidTokenMsg });
  });

  it('Can use a custom error message and error code', async () => {
    const response = await testRequest(async () => {
      return { errorCode: 401, errorMessage: 'it failed' };
    });

    expect(response.get('content-type')).toMatch('application/json');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'it failed' });
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
