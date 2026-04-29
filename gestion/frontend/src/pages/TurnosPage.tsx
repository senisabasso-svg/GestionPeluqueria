import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";

type Cliente = { id: number; nombre: string; telefono: string | null };
type SalonItem = { id: number; tipo: string; nombre: string; precio: number };
type SalonCategoria = { id: number; nombre: string; items: SalonItem[] };
type Turno = {
  id: number;
  fechaHora: string;
  estado: "pendiente" | "confirmado" | "cancelado" | "realizado";
  notas: string | null;
  cliente: Cliente;
  salonItem: { id: number; nombre: string; precio: number };
};

const ESTADOS: Turno["estado"][] = ["pendiente", "confirmado", "cancelado", "realizado"];

export default function TurnosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicios, setServicios] = useState<SalonItem[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [form, setForm] = useState({ idCliente: "", idSalonItem: "", fechaHora: "", notas: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cliRows, cats, turnosRows] = await Promise.all([
        api<Cliente[]>("/api/clientes"),
        api<SalonCategoria[]>("/api/salon-categorias"),
        api<Turno[]>("/api/turnos"),
      ]);
      const serviciosRows = cats.flatMap((c) => c.items.filter((it) => it.tipo === "servicio"));
      setClientes(cliRows);
      setServicios(serviciosRows);
      setTurnos(turnosRows);
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
    if (!form.idCliente || !form.idSalonItem || !form.fechaHora) {
      setMsg("Cliente, servicio y fecha/hora son obligatorios.");
      return;
    }
    try {
      await api("/api/turnos", {
        method: "POST",
        body: JSON.stringify({
          idCliente: Number(form.idCliente),
          idSalonItem: Number(form.idSalonItem),
          fechaHora: new Date(form.fechaHora).toISOString(),
          notas: form.notas.trim() || null,
        }),
      });
      setForm({ idCliente: "", idSalonItem: "", fechaHora: "", notas: "" });
      await load();
      setMsg("Turno agendado.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const cambiarEstado = async (id: number, estado: Turno["estado"]) => {
    setMsg(null);
    try {
      await api(`/api/turnos/${id}`, {
        method: "PUT",
        body: JSON.stringify({ estado }),
      });
      await load();
      setMsg("Estado de turno actualizado.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const turnosFiltrados = useMemo(() => {
    const q = filtroNombre.trim().toLowerCase();
    if (!q) return turnos;
    return turnos.filter((t) => t.cliente.nombre.toLowerCase().includes(q));
  }, [turnos, filtroNombre]);

  return (
    <div className="page">
      <section className="card">
        <h2>Agendar turno</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Cliente *
            <select value={form.idCliente} onChange={(e) => setForm((f) => ({ ...f, idCliente: e.target.value }))} required>
              <option value="">— Elegir cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} — {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Servicio / tipo de corte *
            <select value={form.idSalonItem} onChange={(e) => setForm((f) => ({ ...f, idSalonItem: e.target.value }))} required>
              <option value="">— Elegir servicio del tarifario</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} (${s.precio.toFixed(2)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha y hora *
            <input
              type="datetime-local"
              value={form.fechaHora}
              onChange={(e) => setForm((f) => ({ ...f, fechaHora: e.target.value }))}
              required
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Notas
            <input value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar turno
            </button>
          </div>
        </form>
        {msg ? <p className={/agendado|actualizado/i.test(msg) ? "ok" : "err"}>{msg}</p> : null}
      </section>

      <section className="card mt-lg">
        <h2>Turnos</h2>
        <div style={{ maxWidth: 420, marginBottom: "0.75rem" }}>
          <label>
            Buscar por cliente
            <input value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} placeholder="Ej. Ana, Martín…" />
          </label>
        </div>
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha/hora</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {turnosFiltrados.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.fechaHora).toLocaleString("es-UY")}</td>
                    <td>{t.cliente.nombre}</td>
                    <td>{t.salonItem.nombre}</td>
                    <td>${t.salonItem.precio.toFixed(2)}</td>
                    <td>
                      <select value={t.estado} onChange={(e) => cambiarEstado(t.id, e.target.value as Turno["estado"])}>
                        {ESTADOS.map((es) => (
                          <option key={es} value={es}>
                            {es}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{t.notas || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {turnosFiltrados.length === 0 ? <p className="muted">No hay turnos para esa búsqueda.</p> : null}
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar
        </button>
      </section>
    </div>
  );
}
