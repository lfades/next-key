import http from 'http';
import { RequestHandler } from 'micro';
import request from 'supertest';
import {
  AuthError,
  BAD_REQUEST_MESSAGE,
  BAD_REQUEST_STATUS,
  INTERNAL_ERROR_MESSAGE,
  INTERNAL_ERROR_STATUS,
  run
} from '../utils';

describe('run', () => {
  const testRequest = (fn: RequestHandler) => {
    return request(http.createServer(run(fn))).get('/');
  };

  it('Sends an error on undefined return', async () => {
    const response = await testRequest(async () => {
      // same as return undefined
    });

    expect(response.get('Content-Type')).toBeUndefined();
    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.text).toBe(BAD_REQUEST_MESSAGE);
  });

  it('Throws if the error is not AuthError', async () => {
    expect.assertions(2);

    await request(
      http.createServer(async (req, res) => {
        const handler = run(() => {
          throw new Error();
        });

        try {
          await handler(req, res);
        } catch (e) {
          expect(e.name).not.toBe('AuthError');
        }
        expect(res.finished).toBe(true);
      })
    ).get('/');
  });

  describe('Can throw an AuthError', () => {
    it('Has a default message and status', async () => {
      const response = await testRequest(async () => {
        throw new AuthError();
      });

      expect(response.get('Content-Type')).toBeUndefined();
      expect(response.status).toBe(INTERNAL_ERROR_STATUS);
      expect(response.text).toBe(INTERNAL_ERROR_MESSAGE);
    });

    it('Can use a custom message', async () => {
      const response = await testRequest(async () => {
        throw new AuthError('it failed');
      });

      expect(response.status).toBe(INTERNAL_ERROR_STATUS);
      expect(response.text).toBe('it failed');
    });

    it('Can use a custom status and message', async () => {
      const response = await testRequest(async () => {
        throw new AuthError({ status: 401, message: 'it failed' });
      });

      expect(response.get('Content-Type')).toBeUndefined();
      expect(response.status).toBe(401);
      expect(response.text).toBe('it failed');
    });
  });

  it('Can send a json', async () => {
    const response = await testRequest(async () => {
      return { a: 'b', c: 'd' };
    });

    expect(response.get('Content-Type')).toMatch('application/json');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ a: 'b', c: 'd' });
  });
});
