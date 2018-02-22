import { AuthPayload, StringAnyMap } from './interfaces';
import Payload from './payload';
/**
 * Returns a function that can verify an accessToken
 */
export default function Verifier({
  payload = new Payload(),
  verify
}: {
  payload?: AuthPayload;
  verify: (accessToken: string) => StringAnyMap;
}) {
  return (accessToken: string) => {
    if (!accessToken) return null;

    let tokenPayload: StringAnyMap;

    try {
      tokenPayload = verify(accessToken);
    } catch (error) {
      return null;
    }

    return payload.parse(tokenPayload);
  };
}
