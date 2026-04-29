import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import TenantParallaxDecor from "../components/TenantParallaxDecor";
import type { PublicacionRow } from "./InformacionPage";

type PeluqueriaRow = { id: number; nombre: string; activo: boolean; createdAt: string; logoUrl: string | null };

const MAX_FILE_BYTES = 1_800_000;

const TIPO_OPTIONS = [
  { value: "general", label: "General" },
  { value: "novedad", label: "Novedad" },
  { value: "aviso", label: "Aviso" },
  { value: "promocion", label: "Promoción" },
  { value: "evento", label: "Evento" },
] as const;

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

  const [publicaciones, setPublicaciones] = useState<PublicacionRow[]>([]);
  const [pubTitulo, setPubTitulo] = useState("");
  const [pubSubtitulo, setPubSubtitulo] = useState("");
  const [pubTipo, setPubTipo] = useState<(typeof TIPO_OPTIONS)[number]["value"]>("general");
  const [pubImagenUrl, setPubImagenUrl] = useState("");
  const [pubFileData, setPubFileData] = useState<string | null>(null);
  const [pubMsg, setPubMsg] = useState<string | null>(null);
  const [pubSaving, setPubSaving] = useState(false);

  const loadPublicaciones = useCallback(async () => {
    try {
      setPublicaciones(await api<PublicacionRow[]>("/api/super/publicaciones"));
    } catch (e) {
      setPubMsg(String(e));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setPeluquerias(await api<PeluqueriaRow[]>("/api/super/peluquerias"));
    } catch (e) {
      setMsg(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    loadPublicaciones();
  }, [load, loadPublicaciones]);

  const onPubFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setPubMsg("Seleccione un archivo de imagen (JPG, PNG, WebP…).");
      setPubFileData(null);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setPubMsg("La imagen supera ~1,7 MB. Reduzca tamaño o use una URL.");
      setPubFileData(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") setPubFileData(r);
    };
    reader.readAsDataURL(f);
    setPubMsg(null);
  };

  const crearPublicacion = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setPubMsg(null);
    const imagenUrl = (pubFileData || pubImagenUrl.trim()) || "";
    if (!pubTitulo.trim()) {
      setPubMsg("El título es obligatorio.");
      return;
    }
    if (!imagenUrl) {
      setPubMsg("Suba una imagen o pegue una URL de imagen.");
      return;
    }
    setPubSaving(true);
    try {
      await api("/api/super/publicaciones", {
        method: "POST",
        body: JSON.stringify({
          titulo: pubTitulo.trim(),
          subtitulo: pubSubtitulo.trim() || null,
          tipo: pubTipo,
          imagenUrl,
        }),
      });
      setPubTitulo("");
      setPubSubtitulo("");
      setPubTipo("general");
      setPubImagenUrl("");
      setPubFileData(null);
      await loadPublicaciones();
      setPubMsg("Publicación creada. Visible en la pestaña Información de cada salón.");
    } catch (e) {
      setPubMsg(String(e));
    } finally {
      setPubSaving(false);
    }
  };

  const eliminarPublicacion = async (id: number) => {
    if (!window.confirm("¿Eliminar esta publicación en todos los salones?")) return;
    setPubMsg(null);
    try {
      await api(`/api/super/publicaciones/${id}`, { method: "DELETE" });
      await loadPublicaciones();
    } catch (e) {
      setPubMsg(String(e));
    }
  };

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
          <h2>Publicaciones para todos los salones</h2>
          <p className="muted">
            Aparecen en la pestaña <strong>Información</strong> de cada peluquería: título, tipo, subtítulo opcional e imagen
            (archivo o URL).
          </p>
          <form className="form-grid superadmin-pub-form" onSubmit={crearPublicacion}>
            <label className="superadmin-pub-form__full">
              Título *
              <input value={pubTitulo} onChange={(e) => setPubTitulo(e.target.value)} required placeholder="Ej. Horario especial enero" />
            </label>
            <label>
              Tipo *
              <select value={pubTipo} onChange={(e) => setPubTipo(e.target.value as (typeof TIPO_OPTIONS)[number]["value"])}>
                {TIPO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="superadmin-pub-form__full">
              Subtítulo (opcional)
              <textarea
                value={pubSubtitulo}
                onChange={(e) => setPubSubtitulo(e.target.value)}
                rows={2}
                placeholder="Texto breve debajo del título"
              />
            </label>
            <label className="superadmin-pub-form__full">
              Imagen — archivo
              <input type="file" accept="image/*" onChange={onPubFile} />
            </label>
            <label className="superadmin-pub-form__full">
              O URL de imagen (si no sube archivo)
              <input
                value={pubImagenUrl}
                onChange={(e) => setPubImagenUrl(e.target.value)}
                placeholder="https://… o /ruta/local.png"
                disabled={Boolean(pubFileData)}
              />
            </label>
            {(pubFileData || pubImagenUrl.trim()) && (
              <div className="superadmin-pub-preview superadmin-pub-form__full">
                <strong>Vista previa</strong>
                <img src={pubFileData || pubImagenUrl.trim()} alt="" />
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={pubSaving}>
                {pubSaving ? "Publicando…" : "Publicar"}
              </button>
              {pubFileData ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPubFileData(null);
                  }}
                >
                  Quitar archivo
                </button>
              ) : null}
            </div>
          </form>
          {pubMsg && (
            <p className={pubMsg.includes("creada") || pubMsg.includes("Visible") ? "ok" : "err"} style={{ marginTop: "0.75rem" }}>
              {pubMsg}
            </p>
          )}
          <div className="superadmin-pub-list mt-lg">
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Publicadas</h3>
            {publicaciones.length === 0 ? (
              <p className="muted">Ninguna todavía.</p>
            ) : (
              <ul className="superadmin-pub-items">
                {publicaciones.map((p) => (
                  <li key={p.id} className="superadmin-pub-item">
                    <img src={p.imagenUrl} alt="" />
                    <div className="superadmin-pub-item__text">
                      <span className={`informacion-badge informacion-badge--${p.tipo}`}>
                        {TIPO_OPTIONS.find((t) => t.value === p.tipo)?.label ?? p.tipo}
                      </span>
                      <strong>{p.titulo}</strong>
                      {p.subtitulo ? <span className="muted">{p.subtitulo}</span> : null}
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        {new Date(p.createdAt).toLocaleString("es")}
                      </span>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => eliminarPublicacion(p.id)}>
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card mt-lg">
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
