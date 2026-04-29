import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

type Proveedor = { id: number; nombre: string; telefono: string | null; email: string | null };

const EM = "\u2014";

export default function ProveedoresPage() {
  const [rows, setRows] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<Proveedor[]>("/api/proveedores"));
    } catch (e) {
      setMsg(String(e));
    } finally { 
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => { 
    e.preventDefault();
    setMsg(null);
    if (!form.nombre.trim()) {
      setMsg("El nombre es obligatorio.");
      return;
    }
    try {
      await api("/api/proveedores", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || null,
          email: form.email.trim() || null,
        }),
      });
      setForm({ nombre: "", telefono: "", email: "" });
      await load();
      setMsg("Proveedor agregado.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Nuevo proveedor</h2>
        <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
          Distribuidores de cosmética, marcas capilares y mayoristas del salón.
        </p>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Nombre *
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required />
          </label>
          <label>
            Teléfono
            <input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
        {msg && <p className={msg.includes("agregado") ? "ok" : "err"}>{msg}</p>}
      </section>

      <section className="card mt-lg">
        <h2>Proveedores</h2>
        {loading ? (
          <p>Cargando{"\u2026"}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.nombre}</td>
                    <td>{r.telefono ?? EM}</td>
                    <td>{r.email ?? EM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar
        </button>
      </section>
    </div>
  );
}
