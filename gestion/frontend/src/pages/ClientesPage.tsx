import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
};

const EM = "\u2014";

export default function ClientesPage() {
  const [rows, setRows] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", notas: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", telefono: "", email: "", notas: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<Cliente[]>("/api/clientes"));
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
      await api("/api/clientes", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || null,
          email: form.email.trim() || null,
          notas: form.notas.trim() || null,
        }),
      });
      setForm({ nombre: "", telefono: "", email: "", notas: "" });
      await load();
      setMsg("Cliente agregado.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const startEdit = (c: Cliente) => {
    setEditingId(c.id);
    setEditForm({
      nombre: c.nombre,
      telefono: c.telefono ?? "",
      email: c.email ?? "",
      notas: c.notas ?? "",
    });
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
  };

  const saveEdit = async (id: number) => {
    setMsg(null);
    if (!editForm.nombre.trim()) {
      setMsg("El nombre no puede quedar vacío.");
      return;
    }
    try {
      await api(`/api/clientes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: editForm.nombre.trim(),
          telefono: editForm.telefono.trim() || null,
          email: editForm.email.trim() || null,
          notas: editForm.notas.trim() || null,
        }),
      });
      setEditingId(null);
      await load();
      setMsg("Cliente actualizado.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Nuevo cliente</h2>
        <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
          En <Link to="/">Cobro</Link> debe elegirse un cliente antes de confirmar cada venta (servicios o productos).
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
          <label style={{ gridColumn: "1 / -1" }}>
            Notas
            <input value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
        {msg && <p className={/agregado|actualizado/i.test(msg) ? "ok" : "err"}>{msg}</p>}
      </section>

      <section className="card mt-lg">
        <h2>Clientes</h2>
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
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  editingId === r.id ? (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        <input
                          value={editForm.nombre}
                          onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                          style={{ width: "100%", minWidth: 140 }}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.telefono}
                          onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.notas}
                          onChange={(e) => setEditForm((f) => ({ ...f, notas: e.target.value }))}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-primary" onClick={() => saveEdit(r.id)}>
                          Guardar
                        </button>{" "}
                        <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.nombre}</td>
                      <td>{r.telefono ?? EM}</td>
                      <td>{r.email ?? EM}</td>
                      <td>{r.notas ?? EM}</td>
                      <td>
                        <button type="button" className="btn btn-secondary" onClick={() => startEdit(r)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                )}
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
