import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getApiBase } from "../api";

const TOKEN_KEY = "gestion_token";
const USER_KEY = "gestion_user";

export type Usuario = {
  id: number;
  email: string;
  nombre: string | null;
  rol: string;
  idPeluqueria: number | null;
};

type AuthState = {
  token: string | null;
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (token: string, usuario: Usuario) => void;
};

const AuthContext = createContext<AuthState | null>(null);

function readStoredUser(): Usuario | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Usuario & { idSecond?: number };
    if (u.idPeluqueria == null && u.idSecond != null) {
      u.idPeluqueria = u.idSecond;
    }
    return u;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [usuario, setUsuario] = useState<Usuario | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    const base = getApiBase();
    const url = base ? `${base}/api/auth/me` : "/api/auth/me";
    fetch(url, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => {
        if (!r.ok) throw new Error("session");
        return r.json();
      })
      .then((u: Usuario & { idSecond?: number }) => {
        if (u.idPeluqueria == null && u.idSecond != null) u.idPeluqueria = u.idSecond;
        setUsuario(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUsuario(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setSession = useCallback((tok: string, u: Usuario) => {
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(tok);
    setUsuario(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const base = getApiBase();
      const url = base ? `${base}/api/auth/login` : "/api/auth/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Error al iniciar sesión");
      }
      const { token: tok, usuario: usr } = data as { token: string; usuario: Usuario };
      setSession(tok, usr);
    },
    [setSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("sh_token");
    localStorage.removeItem("sh_user");
    setToken(null);
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ token, usuario, loading, login, logout, setSession }),
    [token, usuario, loading, login, logout, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
