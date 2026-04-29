import { Routes, Route, NavLink, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api";
import VentaPage from "./pages/VentaPage";
import ProductosPage from "./pages/ProductosPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import InformesPage from "./pages/InformesPage";
import TarifarioPage from "./pages/TarifarioPage";
import ClientesPage from "./pages/ClientesPage";
import TurnosPage from "./pages/TurnosPage";
import InformacionPage from "./pages/InformacionPage";
import LoginPage from "./pages/LoginPage";
import SuperadminPage from "./pages/SuperadminPage";
import TenantParallaxDecor from "./components/TenantParallaxDecor";
import NavConfiguraciones from "./components/NavConfiguraciones";

function TenantLayout() {
  const { usuario, logout } = useAuth();
  const [salon, setSalon] = useState<{ id: number; nombre: string; logoUrl?: string | null } | null>(null);

  useEffect(() => {
    if (!usuario?.idPeluqueria) return;
    api<{ id: number; nombre: string; logoUrl?: string | null }>("/api/peluqueria")
      .then(setSalon)
      .catch(() => setSalon(null));
  }, [usuario?.idPeluqueria]);

  return (
    <div className="app app--with-parallax">
      <TenantParallaxDecor />
      <header className="header">
        <div className="header-brand">
          {salon?.logoUrl ? <img src={salon.logoUrl} alt="Logo peluquería" /> : null}
          <h1 className="logo">{salon?.nombre || "Gestión peluquería"}</h1>
        </div>
        <nav className="nav" aria-label="Secciones del salón">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Cobro
          </NavLink>
          <NavConfiguraciones />
          <NavLink to="/turnos" className={({ isActive }) => (isActive ? "active" : "")}>
            Turnos
          </NavLink>
          <NavLink to="/informes" className={({ isActive }) => (isActive ? "active" : "")}>
            Informes
          </NavLink>
          <NavLink to="/informacion" className={({ isActive }) => (isActive ? "active" : "")}>
            Información
          </NavLink>
        </nav>
        <div className="header-actions">
          <span className="muted">
            {usuario?.email}
            {salon?.nombre
              ? ` · ${salon.nombre}`
              : usuario?.idPeluqueria != null
                ? ` · Salón #${usuario.idPeluqueria}`
                : ""}
          </span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

function RequireTenant() {
  const { usuario, loading } = useAuth();
  if (loading) {
    return (
      <div className="main shell-loading">
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Cargando…
          </p>
        </div>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol === "superadmin") {
    return <Navigate to="/super" replace />;
  }
  if (usuario.idPeluqueria == null) {
    return (
      <div className="main card">
        <h2>Sin peluquería asignada</h2>
        <p className="muted">Pida al superadmin que vincule su usuario a un salón (ID peluquería).</p>
      </div>
    );
  }
  return <Outlet />;
}

function LoginRoute() {
  const { usuario, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-split-page shell-loading">
        <div className="card" style={{ maxWidth: 360 }}>
          <p className="muted" style={{ margin: 0 }}>
            Cargando…
          </p>
        </div>
      </div>
    );
  }
  if (usuario) {
    return <Navigate to={usuario.rol === "superadmin" ? "/super" : "/"} replace />;
  }
  return <LoginPage />;
}

function SuperadminRoute() {
  const { usuario, loading } = useAuth();
  if (loading) {
    return (
      <div className="app app--with-parallax">
        <TenantParallaxDecor />
        <main className="main shell-loading">
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Cargando…
            </p>
          </div>
        </main>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "superadmin") return <Navigate to="/" replace />;
  return <SuperadminPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/super" element={<SuperadminRoute />} />

      <Route element={<RequireTenant />}>
        <Route element={<TenantLayout />}>
          <Route path="/" element={<VentaPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/tarifario" element={<TarifarioPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/turnos" element={<TurnosPage />} />
          <Route path="/informes" element={<InformesPage />} />
          <Route path="/informacion" element={<InformacionPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
