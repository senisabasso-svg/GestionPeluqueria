import { useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

const CONFIG_PREFIXES = ["/productos", "/tarifario", "/proveedores", "/clientes"] as const;

function isConfigPath(pathname: string) {
  return CONFIG_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function NavConfiguraciones() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const location = useLocation();
  const sectionActive = isConfigPath(location.pathname);

  const close = () => {
    detailsRef.current?.removeAttribute("open");
  };

  return (
    <details
      ref={detailsRef}
      className={`nav-dropdown${sectionActive ? " nav-dropdown--section-active" : ""}`}
    >
      <summary className="nav-dropdown__summary">Configuraciones</summary>
      <div className="nav-dropdown__panel">
        <NavLink to="/productos" end onClick={close} className={({ isActive }) => (isActive ? "active" : "")}>
          Inventario
        </NavLink>
        <NavLink to="/tarifario" onClick={close} className={({ isActive }) => (isActive ? "active" : "")}>
          Tarifario
        </NavLink>
        <NavLink to="/proveedores" onClick={close} className={({ isActive }) => (isActive ? "active" : "")}>
          Proveedores
        </NavLink>
        <NavLink to="/clientes" onClick={close} className={({ isActive }) => (isActive ? "active" : "")}>
          Clientes
        </NavLink>
      </div>
    </details>
  );
}
