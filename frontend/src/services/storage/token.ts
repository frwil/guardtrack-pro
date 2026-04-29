const TOKEN_KEY = 'guardtrack_token';
const REFRESH_TOKEN_KEY = 'guardtrack_refresh_token';

/**
 * Sauvegarde le token.
 * persistent=true  → localStorage  (survit à la fermeture du navigateur — "Remember me")
 * persistent=false → sessionStorage (effacé à la fermeture de l'onglet)
 */
export const setToken = (token: string, persistent = true): void => {
  if (typeof window !== 'undefined') {
    if (persistent) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  }
};

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

export const setRefreshToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
};

export const hasToken = (): boolean => {
  return getToken() !== null;
};
