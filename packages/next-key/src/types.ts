import { IncomingMessage, ServerResponse } from 'http';
import AuthClient, { AuthClientOptions } from 'next-key-client';
import { ComponentType } from 'react';

declare global {
  namespace NodeJS {
    interface Process {
      browser?: boolean;
    }
  }
}

export interface WithAuthOptions {
  getInitialProps?: boolean;
  client: AuthClient | AuthClientOptions;
}

export interface WithAuthHOC {
  (Child: ComponentType): ComponentType<WithAuthProps>;
  getInitialProps: GetAuthProps;
}

export interface WithAuthProps {
  accessToken?: string;
}

export interface NextContext {
  err?: Error;
  req?: IncomingMessage;
  res?: ServerResponse;
  pathname: string;
  asPath: string;
  query: {
    [key: string]: boolean | boolean[] | number | number[] | string | string[];
  };
}

export type GetInitialProps = (context: NextContext) => Promise<object>;

export type GetAuthProps = (
  context: NextContext,
  childProps: object
) => Promise<WithAuthProps>;
