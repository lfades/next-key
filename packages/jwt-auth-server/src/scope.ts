import { AuthScopeInterface, StringStringMap } from './interfaces';

export default class AuthScope implements AuthScopeInterface {
  private SCOPE: StringStringMap;
  private REVERSE_SCOPE: StringStringMap;

  constructor(scope: StringStringMap = {}) {
    this.SCOPE = {
      read: 'r',
      write: 'w',
      ...scope
    };
    this.REVERSE_SCOPE = Object.entries(this.SCOPE).reduce(
      (obj, [k, v]) => ({ ...obj, [v]: k }),
      {}
    );
  }
  /**
   * Returns a scope in the format 'a:r:w' using a set of rules like
   * ['admin:read', 'admin:write']
   */
  public create(scope: string[]): string {
    if (!scope || !scope.length) return '';

    let lastName: string;
    const shortPerm = (perm: string) => this.SCOPE[perm] || perm;
    const shortRole = (newScope: string[], r: string) => {
      const role = r.split(':').map(shortPerm);

      if (lastName === role[0]) {
        newScope[newScope.length - 1] += `:${role.slice(1).join(':')}`;
        return newScope;
      }

      lastName = role[0];
      newScope.push(role.join(':'));

      return newScope;
    };
    const scopeStr = scope.reduce(shortRole, []).join('|');

    return scopeStr;
  }
  /**
   * Returns a scope string as an array of rules
   */
  public parse(scopeStr: string): string[] {
    if (!scopeStr || !scopeStr.length) return [];

    const longPerm = (perm: string) => this.REVERSE_SCOPE[perm] || perm;
    const joinPerm = (name: string) => (perm: string) => name + ':' + perm;
    const splitRole = (role: string) => {
      const [name, ...perms] = role.split(':').map(longPerm);
      return perms.map(joinPerm(name));
    };
    const pushRoles = (roles: string[], role: string) =>
      roles.concat(splitRole(role));

    return scopeStr.split('|').reduce(pushRoles, []);
  }
}
