import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import LoginIntroOverlay, { shouldSkipLoginIntro } from "../components/LoginIntroOverlay";
import LoginSalonIllustration from "../components/LoginSalonIllustration";
import LoginGlassParallaxLayers from "../components/LoginGlassParallaxLayers";
import LoginGlassTilt from "../components/LoginGlassTilt";

const TOKEN_KEY = "gestion_token";
const USER_KEY = "gestion_user";
const REMEMBER_EMAIL_KEY = "gp_login_remember_email";

export default function LoginPage() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY));
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [salon, setSalon] = useState<{ id: number; nombre: string; logoUrl?: string } | null>(null);
  const [introDone, setIntroDone] = useState(shouldSkipLoginIntro);

  if (usuario) {
    navigate(usuario.rol === "superadmin" ? "/super" : "/", { replace: true });
    return null;
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem("sh_token");
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem("sh_user");
    let idSalon: number | undefined;
    try {
      const user = raw ? (JSON.parse(raw) as { idPeluqueria?: number; idSecond?: number }) : null;
      idSalon = user?.idPeluqueria ?? user?.idSecond;
    } catch {
      idSalon = undefined;
    }
    if (!token || idSalon == null) return;
    api<{ id: number; nombre: string; logoUrl?: string }>("/api/peluqueria")
      .then(setSalon)
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await login(email, password);
      try {
        if (remember && email.trim()) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      const u = JSON.parse(localStorage.getItem(USER_KEY) || "{}") as { rol?: string };
      navigate(u.rol === "superadmin" ? "/super" : "/", { replace: true });
    } catch (err) {
      setError(String(err)); 
    } finally {
      setSending(false);
    }
  };

  const salonNombre = salon?.nombre || "Gestión de peluquerías";

  return (
    <div className="login-split-page">
      <LoginGlassParallaxLayers />
      {!introDone && <LoginIntroOverlay onComplete={() => setIntroDone(true)} />}

      <div className="login-split-grid">
        <div className="login-split-left">
          <header className="login-split-brand">
            {salon?.logoUrl ? (
              <img src={salon.logoUrl} alt="" className="login-split-brand-logo" width={40} height={40} />
            ) : (
              <span className="login-split-brand-mark" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 14h12M10 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            )}
            <span className="login-split-brand-name">{salonNombre}</span>
          </header>

          <LoginGlassTilt className="login-split-form-shell">
            <div className="login-split-glass-inner">
              <h1 className="login-split-title">Bienvenido de nuevo</h1>
              <p className="login-split-subtitle">Ingrese sus datos para acceder al salón.</p>

              <form className="login-split-form" onSubmit={submit}>
              <label className="login-split-label">
                Correo electrónico
                <input
                  className="login-split-input"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="login-split-label">
                Contraseña
                <input
                  className="login-split-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <div className="login-split-row">
                <label className="login-split-check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Recordarme en este equipo</span>
                </label>
                <button
                  type="button"
                  className="login-split-link"
                  onClick={() =>
                    window.alert("Para restablecer la contraseña, contacte al administrador de su salón o al superadministrador.")
                  }
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>

              <button type="submit" className="login-split-submit" disabled={sending}>
                {sending ? "Entrando…" : "Iniciar sesión"}
              </button>
              </form>

              {error && <p className="err login-split-err">{error}</p>}

              <p className="login-split-foot muted">
                ¿No tiene cuenta? Solicite acceso a quien administra su peluquería.
              </p>
            </div>
          </LoginGlassTilt>
        </div>

        <div className="login-split-right">
          <div className="login-split-right-inner">
            <LoginSalonIllustration />
            <p className="login-split-tagline">Turnos, stock y cobros en un solo lugar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
