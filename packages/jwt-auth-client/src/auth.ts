import HttpConnector from './connectors/http';

export type Logout = (
  logout: () => Promise<{ refreshToken: string }>,
  options: any
) => void;

export interface AuthClientOptions {
  accessToken: {
    name: string;
    cookie: string;
    decode(accessToken: string): object | null;
  };
  refreshToken: {
    cookie: string;
  };
  fetchConnector: HttpConnector;
  getHeaders?(accessToken: string): object;
  onLogout?: Logout;
}

const getHeadersFn = (accessToken: string) => ({
  authorization: 'Bearer ' + accessToken
});

const onLogoutFn: Logout = logout => {
  logout().catch(error => {
    throw error;
  });
};

export default class AuthClient {
  public shouldDecodeToken: boolean;
  public accessToken: AuthClientOptions['accessToken'];
  public refreshToken: AuthClientOptions['refreshToken'];
  public fetch: HttpConnector;
  public getHeaders: (accessToken: string) => object;
  public onLogout: Logout;

  constructor(options: AuthClientOptions) {
    const { accessToken, refreshToken } = options;

    // Si es false se tratara de crear siempre un accessToken nuevo
    this.shouldDecodeToken = true;

    this.accessToken = {
      name: accessToken.name || 'accessToken',
      cookie: accessToken.cookie,
      decode: accessToken.decode || (() => null)
    };
    this.refreshToken = {
      cookie: refreshToken.cookie
    };

    this.fetch = options.fetchConnector;
    this.getHeaders = options.getHeaders || getHeadersFn;
    this.onLogout = options.onLogout || onLogoutFn;
  }
  public _logout = () =>
    this.fetch.logout({ credentials: 'same-origin' }).then(json => {
      this.removeAccessToken();
      return json;
    });
  /**
   * Cierra la sesión del usuario, esto significa eliminar el accessToken y
   * refreshToken de las cookies
   */
  public logout(options: any) {
    if (typeof window !== 'undefined') {
      this.onLogout(this._logout, options);
    }
  }
  /**
   * Obtiene el accessToken dentro de localStorage
   * @return {string}
   */
  public getAccessToken() {
    return localStorage.getItem(this.accessToken.name);
  }
  public decodeAccessToken(accessToken: string) {
    if (!accessToken) return null;
    return this.accessToken.decode(accessToken);
  }
  /**
   * Agrega el accessToken a localStorage y lo devuelve
   * @param {string} accessToken
   * @return {(string|null)}
   */
  public setAccessToken(accessToken: string) {
    if (!accessToken) return null;

    if (this.getAccessToken() !== accessToken) {
      localStorage.setItem(this.accessToken.name, accessToken);
    }

    return accessToken;
  }
  /**
   * Elimina el accessToken de localStorage
   */
  public removeAccessToken() {
    localStorage.removeItem(this.accessToken.name);
  }
  /**
   * Se ignora el accessToken actual para que la siguiente vez se cree uno nuevo
   */
  public ignoreCurrentAccessToken() {
    this.shouldDecodeToken = false;
  }
  /**
   * Obtiene el payload de un accessToken y válida que no este expirado y
   * devuelve el token en caso de que sea válido o null
   * @param {string} accessToken
   * @return {(string|null)}
   */
  public verifyAccessToken(accessToken: string) {
    if (accessToken && this.decodeAccessToken(accessToken)) {
      return accessToken;
    }
    return null;
  }
  public async fetchClientAccessToken() {
    try {
      const data = await this.fetch.createAccessToken({
        credentials: 'same-origin'
      });

      this.shouldDecodeToken = true;
      return this.setAccessToken(data.accessToken);
    } catch (err) {
      return null;
    }
  }
  /**
   * Devuelve el accessToken cuando se solicita en el servidor (SSR) desde las
   * cookies. Si no se encuentra o no es un token válido y hay un refreshToken
   * disponible consulta al servidor por un nuevo accessToken y lo devuelve
   * @param {Object} req
   * @return {{accessToken: string, setSession: (boolean|undefined)}} setSession
   * se envía al cliente para que este lo agregue en las cookies debido a que no
   * se pueden modificar las cookies en el SSR
   */
  public async getServerAccessToken(req) {
    const refreshToken = req.signedCookies[this.refreshToken.cookie];
    const accessToken = this.verifyAccessToken(
      req.cookies[this.accessToken.cookie]
    );

    if (accessToken) return { accessToken };

    if (!accessToken && refreshToken) {
      try {
        const data = await this.fetch.createAccessToken({
          headers: req.headers
        });

        return {
          accessToken: data.accessToken,
          setSession: true
        };
      } catch (err) {
        return refreshToken ? { removeTokens: true } : null;
      }
    }
  }
  /**
   * Devuelve el accessToken cuando se solicita en el cliente desde
   * localStorage. Si no se encuentra o no es un token válido consulta al
   * servidor por un nuevo accessToken y lo devuelve
   * @return {Promise} Se resuelve con el accessToken
   */
  public async getClientAccessToken() {
    if (this.shouldDecodeToken) {
      const _accessToken = this.getAccessToken();
      // Si el cliente no tiene ningún accessToken en localStorage no se trata
      // de crear uno nuevo
      if (!_accessToken) return null;

      const accessToken = this.verifyAccessToken(_accessToken);
      if (accessToken) return accessToken;
    }
    // En este caso el accessToken dentro de localStorage ya es invalido y se
    // consulta por uno nuevo, se reutiliza la promesa si se trata de crear el
    // token multiples veces
    if (this._clientATFetch) return this._clientATFetch;

    this._clientATFetch = this.fetchClientAccessToken();

    return this._clientATFetch.then(accessToken => {
      this._clientATFetch = null;
      return accessToken;
    });
  }
  /**
   * Agrega un accessToken creado en el servidor al localStorage, de ser
   * necesario también hace una petición al servidor para agregarlo en las
   * cookies y si no hay un refreshToken válido deslogea al usuario
   * @param {Object} data
   * @param {string} data.accessToken
   * @param {boolean} data.removeTokens
   * @param {boolean} data.setSession
   */
  public async setSession(data) {
    // No hay un token válido
    if (data.removeTokens) {
      return this.logout({ redirect: false });
    }

    // Agrega el token a localStorage
    this.setAccessToken(data.accessToken);

    // Agrega el token creado en el servidor a las cookies
    if (data.setSession) {
      return this.fetch.setAccessToken(data.accessToken, {
        credentials: 'same-origin'
      });
    }
    return data;
  }
}
