import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";
import type { Producto } from "./VentaPage";

type Proveedor = { id: number; nombre: string; telefono: string | null; email: string | null };

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    descripcion: "",
    categoria: "",
    marca: "",
    color: "",
    notas: "",
    precioVenta: "",
    codigo: "",
    idProveedor: "",
  });
  const [formEdit, setFormEdit] = useState({
    descripcion: "",
    categoria: "",
    marca: "",
    color: "",
    notas: "",
    precioVenta: "",
    codigo: "",
    idProveedor: "",
    estado: "disponible",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, provs] = await Promise.all([
        api<Producto[]>("/api/productos"),
        api<Proveedor[]>("/api/proveedores"),
      ]);
      setProductos(prods);
      setProveedores(provs);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (p: Producto) => {
    setEditId(p.id);
    setFormEdit({
      descripcion: p.descripcion || "",
      categoria: p.categoria || "",
      marca: p.marca || "",
      color: p.color || "",
      notas: p.notas || "",
      precioVenta: String(p.precioVenta ?? ""),
      codigo: p.codigo || "",
      idProveedor: String(p.idProveedor ?? ""),
      estado: p.estado || "disponible",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setMsg(null);
    try {
      await api(`/api/productos/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          descripcion: formEdit.descripcion,
          categoria: formEdit.categoria || null,
          marca: formEdit.marca || null,
          color: formEdit.color || null,
          notas: formEdit.notas || null,
          precioVenta: Number(formEdit.precioVenta),
          codigo: formEdit.codigo || null,
          idProveedor: Number(formEdit.idProveedor),
          estado: formEdit.estado,
        }),
      });
      await load();
      setMsg("Artículo actualizado.");
      setEditId(null);
    } catch (e) {
      setMsg(String(e));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.descripcion || !form.precioVenta || !form.idProveedor) {
      setMsg(T.completaProducto);
      return;
    }
    try {
      await api("/api/productos", {
        method: "POST",
        body: JSON.stringify({
          descripcion: form.descripcion,
          categoria: form.categoria || null,
          marca: form.marca || null,
          color: form.color || null,
          notas: form.notas || null,
          precioVenta: Number(form.precioVenta),
          codigo: form.codigo || null,
          idProveedor: Number(form.idProveedor),
          estado: "disponible",
        }),
      });
      setForm({
        descripcion: "",
        categoria: "",
        marca: "",
        color: "",
        notas: "",
        precioVenta: "",
        codigo: "",
        idProveedor: form.idProveedor,
      });
      await load();
      setMsg("Artículo agregado al inventario.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h2>{editId ? `Editar artículo #${editId}` : "Nuevo artículo de inventario"}</h2>
        <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
          Tintes, tratamientos en stock, accesorios a la venta, etc.
        </p>
        <form className="form-grid" onSubmit={editId ? saveEdit : submit}>
          <label>
            {T.descripcion} *
            <input
              value={editId ? formEdit.descripcion : form.descripcion}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, descripcion: e.target.value }))
                  : setForm((f) => ({ ...f, descripcion: e.target.value }))
              }
              required
            />
          </label>
          <label>
            Categoría (tinte, champú, herramienta…)
            <input
              value={editId ? formEdit.categoria : form.categoria}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, categoria: e.target.value })) : setForm((f) => ({ ...f, categoria: e.target.value }))
              }
            />
          </label>
          <label>
            Marca
            <input
              value={editId ? formEdit.marca : form.marca}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, marca: e.target.value })) : setForm((f) => ({ ...f, marca: e.target.value }))
              }
            />
          </label>
          <label>
            Color / tono
            <input
              value={editId ? formEdit.color : form.color}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, color: e.target.value })) : setForm((f) => ({ ...f, color: e.target.value }))
              }
            />
          </label>
          <label>
            Notas (lote, vencimiento, etc.)
            <input
              value={editId ? formEdit.notas : form.notas}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, notas: e.target.value })) : setForm((f) => ({ ...f, notas: e.target.value }))
              }
            />
          </label>
          <label>
            Precio venta *
            <input
              type="number"
              step="0.01"
              min="0"
              value={editId ? formEdit.precioVenta : form.precioVenta}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, precioVenta: e.target.value }))
                  : setForm((f) => ({ ...f, precioVenta: e.target.value }))
              }
              required
            />
          </label>
          <label>
            Código interno / SKU
            <input
              value={editId ? formEdit.codigo : form.codigo}
              onChange={(e) =>
                editId ? setFormEdit((f) => ({ ...f, codigo: e.target.value })) : setForm((f) => ({ ...f, codigo: e.target.value }))
              }
            />
          </label>
          <label>
            Proveedor *
            <select
              value={editId ? formEdit.idProveedor : form.idProveedor}
              onChange={(e) =>
                editId
                  ? setFormEdit((f) => ({ ...f, idProveedor: e.target.value }))
                  : setForm((f) => ({ ...f, idProveedor: e.target.value }))
              }
              required
            >
              <option value="">{T.elegirProveedor}</option>
              {proveedores.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.nombre}
                </option>
              ))}
            </select>
          </label>
          {editId && (
            <label>
              Estado
              <select value={formEdit.estado} onChange={(e) => setFormEdit((f) => ({ ...f, estado: e.target.value }))}>
                <option value="disponible">disponible</option>
                <option value="vendido">vendido</option>
              </select>
            </label>
          )}
          <div className="form-actions">
            {editId ? (
              <>
                <button type="submit" className="btn btn-primary">
                  Guardar cambios
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              </>
            ) : (
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            )}
          </div>
        </form>
        {msg && <p className={msg.includes("agregado") || msg.includes("actualizado") ? "ok" : "err"}>{msg}</p>}
      </section>

      <section className="card mt-lg">
        <h2>Inventario</h2>
        {loading ? (
          <p>{"Cargando" + ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{T.descripcion}</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>Notas</th>
                  <th>Código</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.categoria ?? EM}</td>
                    <td>{p.marca ?? EM}</td>
                    <td>{p.color ?? EM}</td>
                    <td>{p.notas ?? EM}</td>
                    <td>{p.codigo ?? EM}</td>
                    <td>${p.precioVenta.toFixed(2)}</td>
                    <td>{p.estado}</td>
                    <td>{p.nombreProveedor ?? EM}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                    </td>
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
