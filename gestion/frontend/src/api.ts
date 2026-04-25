/** Base del API: si VITE_API_URL no lleva https://, se antepone (evita rutas relativas en Pages). */
export function getApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";
  if (!raw) return "";
  const noTrailing = raw.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(noTrailing)) return noTrailing;
  return `https://${noTrailing}`;
}

const TOKEN_KEY = "gestion_token";
const USER_KEY = "gestion_user";
const LEGACY_TOKEN = "sh_token";
const LEGACY_USER = "sh_user";

function migrateLegacyStorage() {
  try {
    const lt = localStorage.getItem(LEGACY_TOKEN);
    if (lt && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, lt);
      localStorage.removeItem(LEGACY_TOKEN);
    }
    const lu = localStorage.getItem(LEGACY_USER);
    if (lu && !localStorage.getItem(USER_KEY)) {
      const u = JSON.parse(lu) as Record<string, unknown>;
      if (u && typeof u === "object") {
        if (u.idPeluqueria == null && u.idSecond != null) u.idPeluqueria = u.idSecond;
        delete u.idSecond;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      localStorage.removeItem(LEGACY_USER);
    }
  } catch {
    /* ignore */
  }
}

migrateLegacyStorage();

function authHeaders(): HeadersInit {
  const t = localStorage.getItem(TOKEN_KEY);
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : path;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_TOKEN);
    localStorage.removeItem(LEGACY_USER);
    if (!path.includes("/auth/login")) window.location.assign("/login");
    throw new Error("Sesi\u00f3n caducada o no autorizado.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
