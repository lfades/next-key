import { AuthClient } from 'next-key-client';
import PropTypes from 'prop-types';
import React from 'react';
import {
  GetAuthProps,
  GetInitialProps,
  WithAuthHOC,
  WithAuthOptions,
  WithAuthProps
} from './types';

// Gets the display name of a JSX component for dev tools
function getDisplayName(Component: React.ComponentType) {
  return Component.displayName || Component.name || 'Unknown';
}

export default function withAuth(options: WithAuthOptions) {
  let lastToken: string;
  const auth =
    options.client instanceof AuthClient
      ? options.client
      : new AuthClient(options.client);

  const getAuthProps: GetAuthProps = async ({ req }) => {
    const props: WithAuthProps = {};

    if (process.browser) {
      props.accessToken = auth.getAccessToken();
      return props;
    }

    const accessToken = await auth.fetchAccessToken(req);

    if (accessToken) {
      props.accessToken = accessToken;
      req.headers.Authorization = 'Bearer ' + accessToken;
    }

    return props;
  };

  const withAuthHOC = (Child: any) => {
    let getInitialProps: GetInitialProps;

    if (options.getInitialProps !== false) {
      getInitialProps = async ctx => {
        let childProps = {};
        if (Child.getInitialProps) {
          childProps = await Child.getInitialProps(ctx);
        }

        return {
          ...(await getAuthProps(ctx, childProps)),
          ...childProps
        };
      };
    }

    return class WithAuth extends React.Component<WithAuthProps> {
      public static displayName = `WithAuth(${getDisplayName(Child)})`;

      public static propTypes = {
        accessToken: PropTypes.string
      };

      public static getInitialProps = getInitialProps;

      constructor(props: WithAuthProps) {
        super(props);

        const { accessToken } = props;

        if (process.browser && accessToken && accessToken !== lastToken) {
          lastToken = accessToken;
          auth.setAccessToken(lastToken);
        }
      }

      public render() {
        return <Child {...this.props} />;
      }
    };
  };

  return Object.assign(withAuthHOC, {
    getInitialProps: getAuthProps
  }) as WithAuthHOC;
}
