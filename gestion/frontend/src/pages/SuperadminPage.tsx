import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import TenantParallaxDecor from "../components/TenantParallaxDecor";

type PeluqueriaRow = { id: number; nombre: string; activo: boolean; createdAt: string; logoUrl: string | null };

export default function SuperadminPage() {
  const { usuario, logout } = useAuth();
  const [peluquerias, setPeluquerias] = useState<PeluqueriaRow[]>([]);
  const [nombreSalon, setNombreSalon] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgUser, setMsgUser] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", activo: true, logoUrl: "" });
  const [saving, setSaving] = useState(false);
  const [formUser, setFormUser] = useState({
    email: "",
    password: "",
    idPeluqueria: "",
    nombre: "",
    rol: "admin" as "admin" | "operador",
  });

  const load = useCallback(async () => {
    try {
      setPeluquerias(await api<PeluqueriaRow[]>("/api/super/peluquerias"));
    } catch (e) {
      setMsg(String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crearPeluqueria = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!nombreSalon.trim()) return;
    try {
      await api("/api/super/peluquerias", {
        method: "POST",
        body: JSON.stringify({ nombre: nombreSalon.trim() }),
      });
      setNombreSalon("");
      await load();
      setMsg("Peluquer\u00eda creada. Use el id mostrado para dar de alta usuarios del sal\u00f3n.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const iniciarEdicion = (t: PeluqueriaRow) => {
    setEditingId(t.id);
    setFormEdit({ nombre: t.nombre, activo: t.activo, logoUrl: t.logoUrl || "" });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setFormEdit({ nombre: "", activo: true, logoUrl: "" });
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setMsg(null);
    try {
      await api(`/api/super/peluquerias/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: formEdit.nombre.trim(),
          activo: formEdit.activo,
          logoUrl: formEdit.logoUrl.trim() || null,
        }),
      });
      await load();
      cancelarEdicion();
      setMsg("Peluquer\u00eda actualizada correctamente.");
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgUser(null);
    if (!formUser.email || !formUser.password || !formUser.idPeluqueria) {
      setMsgUser("Correo, contrase\u00f1a e ID de peluquer\u00eda son obligatorios.");
      return;
    }
    try {
      await api("/api/super/usuarios", {
        method: "POST",
        body: JSON.stringify({
          email: formUser.email.trim(),
          password: formUser.password,
          idPeluqueria: Number(formUser.idPeluqueria),
          nombre: formUser.nombre.trim() || null,
          rol: formUser.rol,
        }),
      });
      setFormUser((f) => ({ ...f, email: "", password: "", nombre: "" }));
      setMsgUser("Usuario creado correctamente.");
    } catch (e) {
      setMsgUser(String(e));
    }
  };

  return (
    <div className="app app--with-parallax">
      <TenantParallaxDecor />
      <header className="header">
        <div className="header-brand">
          <h1 className="logo">Superadmin</h1>
        </div>
        <div className="header-actions">
          <span className="muted">{usuario?.email}</span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="main">
        <section className="card">
          <h2>Nueva peluquería</h2>
          <p className="muted">
            Cada salón recibe un <strong>ID único</strong>. Inventario, ventas, tarifario y proveedores quedan vinculados
            a ese salón.
          </p>
          <form className="form-grid" onSubmit={crearPeluqueria} style={{ maxWidth: 480 }}>
            <label>
              Nombre del salón
              <input
                value={nombreSalon}
                onChange={(e) => setNombreSalon(e.target.value)}
                placeholder="Ej. Estilo Norte"
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Dar de alta peluquería
              </button>
            </div>
          </form>
          {msg && <p className={msg.includes("creada") || msg.includes("actualizada") ? "ok" : "err"}>{msg}</p>}
        </section>

        <section className="card mt-lg">
          <h2>Peluquerías registradas</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID salón</th>
                  <th>Logo</th>
                  <th>Nombre</th>
                  <th>Activa</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {peluquerias.map((t) => (
                  <tr key={t.id}>
                    {editingId === t.id ? (
                      <>
                        <td>
                          <strong>{t.id}</strong>
                        </td>
                        <td colSpan={5}>
                          <form onSubmit={guardarEdicion} className="form-grid" style={{ maxWidth: 600, margin: "0.5rem 0" }}>
                            <label>
                              Nombre
                              <input
                                value={formEdit.nombre}
                                onChange={(e) => setFormEdit((f) => ({ ...f, nombre: e.target.value }))}
                                required
                              />
                            </label>
                            <label>
                              Logo URL (ruta en /public, ej: /romilogo.jpeg)
                              <input
                                value={formEdit.logoUrl}
                                onChange={(e) => setFormEdit((f) => ({ ...f, logoUrl: e.target.value }))}
                                placeholder="/logos/salon.png"
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <input
                                type="checkbox"
                                checked={formEdit.activo}
                                onChange={(e) => setFormEdit((f) => ({ ...f, activo: e.target.checked }))}
                              />
                              Salón activo
                            </label>
                            {formEdit.logoUrl && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <strong>Vista previa:</strong>
                                <div style={{ marginTop: "0.25rem" }}>
                                  <img
                                    src={formEdit.logoUrl}
                                    alt="Logo"
                                    style={{ maxWidth: 80, maxHeight: 80, objectFit: "contain", border: "1px solid #ddd", borderRadius: 4 }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            <div className="form-actions" style={{ marginTop: "0.5rem" }}>
                              <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? "Guardando..." : "Guardar"}
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={cancelarEdicion} disabled={saving}>
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{t.id}</strong>
                        </td>
                        <td>
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt="Logo"
                              style={{ maxWidth: 50, maxHeight: 50, objectFit: "contain" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="muted" style={{ fontSize: "0.85rem" }}>
                              Sin logo
                            </span>
                          )}
                        </td>
                        <td>{t.nombre}</td>
                        <td>{t.activo ? "Sí" : "No"}</td>
                        <td>{new Date(t.createdAt).toLocaleString("es")}</td>
                        <td>
                          <button type="button" className="btn btn-ghost" onClick={() => iniciarEdicion(t)}>
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {peluquerias.length === 0 && <p className="muted">No hay peluquerías todavía.</p>}
          </div>
          <button type="button" className="btn btn-secondary mt" onClick={load}>
            Actualizar lista
          </button>
        </section>

        <section className="card mt-lg">
          <h2>Usuario del salón (admin u operador)</h2>
          <p className="muted">
            Indique el <strong>ID de peluquería</strong> de la tabla anterior para vincular el usuario a ese salón.
          </p>
          <form className="form-grid" onSubmit={crearUsuario} style={{ maxWidth: 520 }}>
            <label>
              Correo electrónico *
              <input
                type="email"
                value={formUser.email}
                onChange={(e) => setFormUser((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Contraseña *
              <input
                type="password"
                value={formUser.password}
                onChange={(e) => setFormUser((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </label>
            <label>
              ID peluquería *
              <input
                type="number"
                min={1}
                value={formUser.idPeluqueria}
                onChange={(e) => setFormUser((f) => ({ ...f, idPeluqueria: e.target.value }))}
                required
              />
            </label>
            <label>
              Nombre para mostrar
              <input value={formUser.nombre} onChange={(e) => setFormUser((f) => ({ ...f, nombre: e.target.value }))} />
            </label>
            <label>
              Rol
              <select
                value={formUser.rol}
                onChange={(e) => setFormUser((f) => ({ ...f, rol: e.target.value as "admin" | "operador" }))}
              >
                <option value="admin">Administrador</option>
                <option value="operador">Operador / recepción</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-accent">
                Crear usuario
              </button>
            </div>
          </form>
          {msgUser && <p className={msgUser.includes("correctamente") ? "ok" : "err"}>{msgUser}</p>}
        </section>
      </main>
    </div>
  );
}
