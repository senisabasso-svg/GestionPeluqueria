/**
 * Fondo estático del login (sin animaciones por mouse para mejorar rendimiento).
 */
export default function LoginGlassParallaxLayers() {
  return (
    <div className="login-glass-layers login-glass-layers--static" aria-hidden>
      <div className="login-glass-blob login-glass-blob--1" />
      <div className="login-glass-blob login-glass-blob--2" />
      <div className="login-glass-blob login-glass-blob--3" />
      <div className="login-glass-blob login-glass-blob--4" />
      <div className="login-glass-noise" />
    </div>
  );
}
