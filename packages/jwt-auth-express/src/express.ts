import { CookieOptions, Request, RequestHandler, Response } from 'express';
import { AuthServer, StringAnyMap } from 'jwt-auth-server';
import { asyncMiddleware } from './utils';

declare global {
  namespace Express {
    interface Request {
      user?: StringAnyMap | null;
    }
  }
}

export interface PassportAuthOptions {
  successRedirect?: string;
  failureRedirect?: string;
}

export interface AuthWithExpressOptions {
  cookie?: CookieOptions | ((isAccessToken: boolean) => CookieOptions);
}
/**
 * Authenticate requests with Express
 */
export default class AuthWithExpress {
  public cookieOptions: AuthWithExpressOptions['cookie'];

  constructor(public Auth: AuthServer, options: AuthWithExpressOptions = {}) {
    this.cookieOptions = options.cookie;
  }
  /**
   * Creates an accessToken based in a refreshToken present in cookies
   */
  public createAccessToken = asyncMiddleware(async (req, res) => {
    const { Auth } = this;
    const refreshToken = Auth.getRefreshToken(req);
    const reset = () => this.setTokens(res, { refreshToken });
    const payload =
      refreshToken && (await Auth.getPayload(refreshToken, reset));

    if (!payload) return;

    const { accessToken } = Auth.createAccessToken(payload);

    this.setTokens(res, { accessToken });

    return { accessToken };
  });
  /**
   * Verifies an accessToken and assign it to cookies
   */
  public setAccessToken = asyncMiddleware(async (req, res) => {
    const { Auth } = this;
    const accessToken = req.query.at;

    if (!accessToken) return;

    Auth.verify(accessToken);

    this.setTokens(res, { accessToken });

    return { accessToken };
  });
  /**
   * Logouts an user
   */
  public logout = asyncMiddleware(async (req: Request, res: Response) => {
    const refreshToken = this.Auth.getRefreshToken(req);

    if (refreshToken) {
      await this.Auth.removeRefreshRoken(refreshToken);
    }
    this.removeTokens(res);

    return { refreshToken };
  });
  /**
   * Assigns to req.user the payload of an accessToken or null
   */
  public authorize: RequestHandler = (req: Request, _res, next) => {
    const accessToken = this.Auth.getAccessToken(req);

    req.user = accessToken ? this.Auth.decode(accessToken) : null;

    next();
  };
  /**
   * Returns the cookies that will be used to save a token
   */
  public getCookieOptions(
    options: CookieOptions,
    isAccessToken: boolean = true
  ): CookieOptions {
    const cookieOptions =
      this.cookieOptions && typeof this.cookieOptions === 'function'
        ? this.cookieOptions(isAccessToken)
        : this.cookieOptions;

    return { ...options, ...cookieOptions };
  }
  /**
   * Removes both tokens from cookies
   */
  public removeTokens(res: Response) {
    return this.setTokens(res, { accessToken: null, refreshToken: null });
  }
  /**
   * Adds the accessToken and refreshToken as cookies, sending null instead
   * of a token will remove it
   */
  public setTokens(
    res: Response,
    {
      accessToken,
      refreshToken
    }: {
      accessToken?: string | null;
      refreshToken?: string | null;
    }
  ) {
    const { Auth } = this;

    if (refreshToken === null) {
      res.clearCookie(Auth.refreshToken.cookie);
    } else if (refreshToken) {
      res.cookie(
        Auth.refreshToken.cookie,
        refreshToken,
        this.getCookieOptions(
          {
            httpOnly: true,
            expires: Auth.refreshToken.getExpDate(),
            signed: true
          },
          false
        )
      );
    }

    if (accessToken === null) {
      res.clearCookie(Auth.accessToken.cookie);
    } else if (accessToken) {
      res.cookie(
        Auth.accessToken.cookie,
        accessToken,
        this.getCookieOptions({
          httpOnly: true,
          expires: Auth.accessToken.getExpDate()
        })
      );
    }
  }
}
