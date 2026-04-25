import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";

type Informe = {
  idVenta: number;
  fechaVenta: string;
  totalVenta: number;
  idProducto: number | null;
  descripcionProducto: string;
  categoria: string | null;
  marca: string | null;
  color: string | null;
  precioUnitario: number;
  idProveedor: number | null;
  nombreProveedor: string;
  telefonoProveedor: string | null;
  tipoLinea?: "producto" | "servicio";
  nombreCliente?: string | null;
  telefonoCliente?: string | null;
};

type Proveedor = { id: number; nombre: string; telefono?: string | null };

function normalizePhoneForWhatsApp(raw?: string | null) {
  if (!raw) return "";
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("598")) return digits;
  if (digits.startsWith("54")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `598${digits}`;
}

export default function InformesPage() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [totalProv, setTotalProv] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadProveedores = useCallback(async () => {
    try {
      setProveedores(await api<Proveedor[]>("/api/proveedores"));
    } catch (e) {
      setMsg(String(e));
    }
  }, []);

  const loadInformes = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const id = filtro ? Number(filtro) : null;
      const qs = mes ? `?month=${encodeURIComponent(mes)}` : "";
      if (id) {
        const [rows, tot] = await Promise.all([
          api<Informe[]>(`/api/informes/proveedor/${id}${qs}`),
          api<{ total: number }>(`/api/informes/proveedor/${id}/total${qs}`),
        ]);
        setInformes(rows);
        setTotalProv(tot.total);
      } else {
        const rows = await api<Informe[]>(`/api/informes${qs}`);
        setInformes(rows);
        setTotalProv(null);
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, [filtro, mes]);

  const exportarExcel = () => {
    if (informes.length === 0) {
      setMsg("No hay datos para exportar.");
      return;
    }
    const rows = informes.map((r) => ({
      Venta: r.idVenta,
      Fecha: new Date(r.fechaVenta).toLocaleString("es-AR"),
      Tipo: r.tipoLinea === "servicio" ? "Servicio" : "Producto",
      Cliente: r.nombreCliente ?? "",
      "Tel. cliente": r.telefonoCliente ?? "",
      Artículo: r.descripcionProducto,
      Categoría: r.categoria ?? "",
      Marca: r.marca ?? "",
      Color: r.color ?? "",
      "Precio unitario": r.precioUnitario,
      Proveedor: r.nombreProveedor,
      "Teléfono proveedor": r.telefonoProveedor ?? "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(";"),
      ...rows.map((row) =>
        headers
          .map((h) => `"${String((row as Record<string, string | number>)[h] ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const labelMes = mes || "todos";
    a.href = url;
    a.download = `informes_peluqueria_${labelMes}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const proveedorSeleccionado = filtro ? proveedores.find((p) => p.id === Number(filtro)) : null;
  const waPhone = normalizePhoneForWhatsApp(proveedorSeleccionado?.telefono);
  const waHref = waPhone ? `https://wa.me/${waPhone}` : "";

  useEffect(() => {
    loadProveedores();
  }, [loadProveedores]);

  useEffect(() => {
    loadInformes();
  }, [loadInformes]);

  return (
    <div className="page">
      <section className="card">
        <h2>Informes de ventas del salón</h2>
        <div className="filter-row">
          <label>
            Mes
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </label>
          <label>
            Filtrar por proveedor
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          {filtro && totalProv !== null && (
            <p className="total-inline">
              <strong>Total filtrado: ${totalProv.toFixed(2)}</strong>
            </p>
          )}
          <button type="button" className="btn btn-secondary" onClick={exportarExcel}>
            Exportar Excel
          </button>
          {filtro &&
            (waHref ? (
              <a href={waHref} target="_blank" rel="noreferrer" className="btn btn-secondary btn-wa" title="Abrir WhatsApp con el proveedor">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M16.03 3.2c-7.07 0-12.8 5.72-12.8 12.78 0 2.25.59 4.45 1.71 6.39L3.2 28.8l6.6-1.72a12.8 12.8 0 0 0 6.23 1.6h.01c7.07 0 12.8-5.72 12.8-12.79 0-3.42-1.33-6.64-3.76-9.06A12.73 12.73 0 0 0 16.03 3.2Zm0 23.33h-.01a10.6 10.6 0 0 1-5.4-1.49l-.39-.23-3.91 1.02 1.05-3.81-.25-.39a10.58 10.58 0 0 1-1.63-5.66c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.1 7.52 3.11a10.55 10.55 0 0 1 3.12 7.52c0 5.86-4.77 10.63-10.64 10.63Zm5.83-7.95c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57a9.58 9.58 0 0 1-1.77-2.19c-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.15 3.09 1.31 3.3.16.21 2.27 3.47 5.49 4.86.77.33 1.37.52 1.84.66.77.24 1.47.2 2.02.12.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z"
                    />
                  </svg>
                  WhatsApp
                </span>
              </a>
            ) : (
              <span className="btn btn-secondary btn-wa-muted" title="Proveedor sin teléfono válido">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M16.03 3.2c-7.07 0-12.8 5.72-12.8 12.78 0 2.25.59 4.45 1.71 6.39L3.2 28.8l6.6-1.72a12.8 12.8 0 0 0 6.23 1.6h.01c7.07 0 12.8-5.72 12.8-12.79 0-3.42-1.33-6.64-3.76-9.06A12.73 12.73 0 0 0 16.03 3.2Zm0 23.33h-.01a10.6 10.6 0 0 1-5.4-1.49l-.39-.23-3.91 1.02 1.05-3.81-.25-.39a10.58 10.58 0 0 1-1.63-5.66c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.1 7.52 3.11a10.55 10.55 0 0 1 3.12 7.52c0 5.86-4.77 10.63-10.64 10.63Zm5.83-7.95c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57a9.58 9.58 0 0 1-1.77-2.19c-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.15 3.09 1.31 3.3.16.21 2.27 3.47 5.49 4.86.77.33 1.37.52 1.84.66.77.24 1.47.2 2.02.12.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z"
                    />
                  </svg>
                  WhatsApp
                </span>
              </span>
            ))}
          <button type="button" className="btn btn-secondary" onClick={loadInformes}>
            Actualizar
          </button>
        </div>
        {loading ? (
          <p>{"Cargando" + ELLIPSIS}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tel. cliente</th>
                  <th>Tipo</th>
                  <th>Artículo</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>P. unit.</th>
                  <th>Proveedor</th>
                  <th>{T.telefono} prov.</th>
                </tr>
              </thead>
              <tbody>
                {informes.map((r, i) => (
                  <tr key={`${r.idVenta}-${r.idProducto ?? "s"}-${r.descripcionProducto}-${i}`}>
                    <td>{r.idVenta}</td>
                    <td>{new Date(r.fechaVenta).toLocaleString("es")}</td>
                    <td>{r.nombreCliente ?? EM}</td>
                    <td>{r.telefonoCliente ?? EM}</td>
                    <td>{r.tipoLinea === "servicio" ? "Servicio" : "Producto"}</td>
                    <td>{r.descripcionProducto}</td>
                    <td>{r.categoria ?? EM}</td>
                    <td>{r.marca ?? EM}</td>
                    <td>{r.color ?? EM}</td>
                    <td>${r.precioUnitario.toFixed(2)}</td>
                    <td>{r.nombreProveedor}</td>
                    <td>{r.telefonoProveedor ?? EM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {informes.length === 0 && <p className="muted">No hay datos.</p>}
          </div>
        )}
        {msg && !loading && <p className="err">{msg}</p>}
      </section>
    </div>
  );
}
