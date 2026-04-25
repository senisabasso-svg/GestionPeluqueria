import { useCallback, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EM, ELLIPSIS, T } from "../lib/uiText";

export type Producto = {
  id: number;
  descripcion: string;
  categoria: string | null;
  marca: string | null;
  color: string | null;
  notas: string | null;
  precioVenta: number;
  codigo: string | null;
  idProveedor: number;
  estado: string;
  nombreProveedor?: string | null;
};

type SalonItem = {
  id: number;
  tipo: string;
  nombre: string;
  precio: number;
  idProducto: number | null;
};

type SalonCategoria = { id: number; nombre: string; orden: number; items: SalonItem[] };

type ClienteRes = { id: number; nombre: string; telefono: string | null; email: string | null };

export type LineaCobro = {
  cartKey: string;
  descripcion: string;
  precioUnitario: number;
  tipo: "producto" | "servicio";
  idProducto?: number;
  /** Para devolver la fila al listado de inventario al quitar del cobro */
  productoSnapshot?: Producto;
};

export type TicketData = {
  ventaId: number;
  fechaLabel: string;
  lines: { descripcion: string; precioVenta: number }[];
  total: number;
  peluqueria?: { nombre: string; logoUrl?: string } | null;
  clienteNombre?: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function newCartKey() {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function VentaPage() {
  const [disponibles, setDisponibles] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<SalonCategoria[]>([]);
  const [cart, setCart] = useState<LineaCobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastTicket, setLastTicket] = useState<TicketData | null>(null);
  const [peluqueria, setPeluqueria] = useState<{ id: number; nombre: string; logoUrl?: string } | null>(null);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroId, setFiltroId] = useState<string>("");
  const [filtroProveedor, setFiltroProveedor] = useState<string>("");
  const [clientes, setClientes] = useState<ClienteRes[]>([]);
  const [idCliente, setIdCliente] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, cats, cli] = await Promise.all([
        api<Producto[]>("/api/productos/disponibles"),
        api<SalonCategoria[]>("/api/salon-categorias"),
        api<ClienteRes[]>("/api/clientes"),
      ]);
      setDisponibles(rows);
      setCategorias(cats);
      setClientes(cli);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api<{ id: number; nombre: string; logoUrl?: string }>("/api/peluqueria").then(setPeluqueria).catch(() => {});
    api<{ id: number; nombre: string }[]>("/api/proveedores")
      .then((rows) => setProveedores(rows.map((p) => ({ id: p.id, nombre: p.nombre }))))
      .catch(() => {});
  }, [load]);

  const disponiblesFiltrados = useMemo(() => {
    let list = disponibles;
    const texto = filtroTexto.trim().toLowerCase();
    const idNum = Number(filtroId);
    const provNum = Number(filtroProveedor);
    if (texto) {
      list = list.filter((p) => (p.descripcion || "").toLowerCase().includes(texto));
    }
    if (!Number.isNaN(idNum) && filtroId !== "") {
      list = list.filter((p) => p.id === idNum);
    }
    if (!Number.isNaN(provNum) && filtroProveedor !== "") {
      list = list.filter((p) => p.idProveedor === provNum);
    }
    return list;
  }, [disponibles, filtroTexto, filtroId, filtroProveedor]);

  const addProductoInventario = (p: Producto) => {
    setCart((c) => [
      ...c,
      {
        cartKey: newCartKey(),
        descripcion: p.descripcion,
        precioUnitario: p.precioVenta,
        tipo: "producto",
        idProducto: p.id,
        productoSnapshot: { ...p },
      },
    ]);
    setDisponibles((d) => d.filter((x) => x.id !== p.id));
  };

  const addFromTarifario = (it: SalonItem) => {
    if (it.tipo === "producto" && it.idProducto != null) {
      const p = disponibles.find((x) => x.id === it.idProducto);
      if (!p) {
        setMsg("Ese producto del tarifario no está disponible en stock ahora.");
        return;
      }
      setCart((c) => [
        ...c,
        {
          cartKey: newCartKey(),
          descripcion: it.nombre,
          precioUnitario: it.precio,
          tipo: "producto",
          idProducto: it.idProducto,
          productoSnapshot: { ...p },
        },
      ]);
      setDisponibles((d) => d.filter((x) => x.id !== it.idProducto));
      return;
    }
    setCart((c) => [
      ...c,
      {
        cartKey: newCartKey(),
        descripcion: it.nombre,
        precioUnitario: it.precio,
        tipo: "servicio",
      },
    ]);
  };

  const removeFromCart = (line: LineaCobro) => {
    setCart((c) => c.filter((x) => x.cartKey !== line.cartKey));
    if (line.tipo === "producto" && line.productoSnapshot) {
      const snap = line.productoSnapshot;
      setDisponibles((d) => {
        if (d.some((x) => x.id === snap.id)) return d;
        return [...d, snap].sort((a, b) => b.id - a.id);
      });
    }
  };

  const total = cart.reduce((s, x) => s + x.precioUnitario, 0);

  const printTicket = (data: TicketData) => {
    const w = window.open("", "_blank");
    if (!w) {
      setMsg("Permite ventanas emergentes para imprimir el ticket.");
      return;
    }
    const rows = data.lines
      .map(
        (l) =>
          `<tr><td style="padding:4px 0;border-bottom:1px solid #ddd">${escapeHtml(l.descripcion)}</td><td style="text-align:right;padding:4px 0;border-bottom:1px solid #ddd">$${l.precioVenta.toFixed(2)}</td></tr>`
      )
      .join("");
    const titulo = escapeHtml(data.peluqueria?.nombre || "Peluquería") + " — Ticket de cobro";
    const gracias = "¡Gracias por su visita!";
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${data.ventaId}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:20px;max-width:360px;margin:0 auto;font-size:14px}
        h1{font-size:16px;margin:0 0 8px}
        .meta{color:#444;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        .total{font-weight:bold;font-size:16px;margin-top:12px;padding-top:8px;border-top:2px solid #000}
        @media print{body{padding:8px}}
      </style></head><body>
      ${data.peluqueria?.logoUrl ? `<img src=\"${escapeHtml(data.peluqueria.logoUrl)}\" alt=\"logo\" style=\"width:72px;height:72px;border-radius:50%\"/>` : ``}
      <h1>${titulo}</h1>
      <div class="meta">Venta #${data.ventaId}<br>${escapeHtml(data.fechaLabel)}${
        data.clienteNombre ? `<br>Cliente: ${escapeHtml(data.clienteNombre)}` : ""
      }</div>
      <table><tbody>${rows}</tbody></table>
      <div class="total">Total: $${data.total.toFixed(2)}</div>
      <p style="margin-top:24px;font-size:11px;color:#666">${gracias}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const confirmarVenta = async () => {
    if (cart.length === 0) return;
    if (!idCliente) {
      setMsg("Debe elegir un cliente antes de confirmar el cobro.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const snapshot = cart.map((p) => ({
      descripcion: p.descripcion,
      precioVenta: p.precioUnitario,
    }));
    const totalVenta = cart.reduce((s, x) => s + x.precioUnitario, 0);
    try {
      const res = await api<{ id: number; total: number; fecha: string }>("/api/ventas", {
        method: "POST",
        body: JSON.stringify({
          idCliente: Number(idCliente),
          items: cart.map((l) =>
            l.tipo === "servicio"
              ? { tipo: "servicio", descripcion: l.descripcion, precioUnitario: l.precioUnitario }
              : { tipo: "producto", idProducto: l.idProducto, precioUnitario: l.precioUnitario }
          ),
        }),
      });
      const fechaLabel = new Date(res.fecha).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const cliNombre = clientes.find((c) => c.id === Number(idCliente))?.nombre;
      const ticket: TicketData = {
        ventaId: res.id,
        fechaLabel,
        lines: snapshot,
        total: totalVenta,
        peluqueria,
        clienteNombre: cliNombre,
      };
      setLastTicket(ticket);
      setCart([]);
      await load();
      setMsg("Venta registrada correctamente.");
      window.setTimeout(() => printTicket(ticket), 300);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page venta-grid">
      <section className="card">
        <h2>Tarifario (por categoría)</h2>
        <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
          Líneas configuradas en <strong>Tarifario</strong>. Servicios no descuentan stock; productos vinculados sí.
        </p>
        {loading ? (
          <p>{"Cargando" + ELLIPSIS}</p>
        ) : categorias.length === 0 ? (
          <p className="muted">No hay categorías todavía. Créelas en la pestaña Tarifario.</p>
        ) : (
          categorias.map((cat) => (
            <div key={cat.id} style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{cat.nombre}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ítem</th>
                      <th>Tipo</th>
                      <th>Precio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.nombre}</td>
                        <td>{it.tipo === "producto" ? "Producto" : "Servicio"}</td>
                        <td>${it.precio.toFixed(2)}</td>
                        <td>
                          <button type="button" className="btn btn-primary" onClick={() => addFromTarifario(it)}>
                            Al cobro
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cat.items.length === 0 && <p className="muted">Sin ítems en esta categoría.</p>}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Inventario disponible</h2>
        <div className="form-grid form-grid--venta-filters" style={{ marginBottom: "0.5rem" }}>
          <label>
            <span className="muted" style={{ fontSize: 12 }}>
              Buscar por descripción
            </span>
            <input
              type="text"
              placeholder="Ej: tinte, champú…"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </label>
          <label>
            <span className="muted" style={{ fontSize: 12 }}>
              Buscar por ID
            </span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="ID"
              value={filtroId}
              onChange={(e) => setFiltroId(e.target.value)}
            />
          </label>
          <label>
            <span className="muted" style={{ fontSize: 12 }}>
              Filtrar por proveedor
            </span>
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
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
                  <th>Código</th>
                  <th>Precio</th>
                  <th>Proveedor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {disponiblesFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.categoria ?? EM}</td>
                    <td>{p.marca ?? EM}</td>
                    <td>{p.color ?? EM}</td>
                    <td>{p.codigo ?? EM}</td>
                    <td>${p.precioVenta.toFixed(2)}</td>
                    <td>{p.nombreProveedor ?? EM}</td>
                    <td>
                      <button type="button" className="btn btn-primary" onClick={() => addProductoInventario(p)}>
                        Al cobro
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disponibles.length === 0 && !loading && <p className="muted">No hay unidades disponibles en inventario.</p>}
          </div>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load}>
          Actualizar listas
        </button>
      </section>

      <section className="card">
        <h2>Cobro actual</h2>
        <label style={{ display: "block", marginBottom: "0.75rem", maxWidth: 420 }}>
          <span className="muted" style={{ fontSize: "0.9rem", display: "block", marginBottom: 4 }}>
            Cliente (obligatorio)
          </span>
          <select
            value={idCliente}
            onChange={(e) => setIdCliente(e.target.value)}
            style={{ width: "100%", padding: "0.45rem" }}
            required
          >
            <option value="">— Elegir cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.telefono ? ` · ${c.telefono}` : ""}
              </option>
            ))}
          </select>
        </label>
        {clientes.length === 0 && !loading && (
          <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            No hay clientes cargados.{" "}
            <Link to="/clientes" className="btn btn-secondary" style={{ display: "inline-block", padding: "0.25rem 0.6rem" }}>
              Ir a Clientes
            </Link>
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.cartKey}>
                  <td>{line.descripcion}</td>
                  <td>{line.tipo === "servicio" ? "Servicio" : "Producto"}</td>
                  <td>${line.precioUnitario.toFixed(2)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost" onClick={() => removeFromCart(line)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="total">
          <strong>Total: ${total.toFixed(2)}</strong>
        </p>
        <div className="form-actions btn-row">
          <button
            type="button"
            className="btn btn-accent"
            disabled={cart.length === 0 || saving || !idCliente}
            onClick={confirmarVenta}
          >
            {saving ? "Guardando" + ELLIPSIS : "Confirmar cobro"}
          </button>
          {lastTicket && (
            <button type="button" className="btn btn-secondary" onClick={() => printTicket(lastTicket)}>
              Imprimir último ticket
            </button>
          )}
        </div>
        {msg && <p className={msg.includes("correctamente") ? "ok" : "err"}>{msg}</p>}
        {lastTicket && (
          <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
            Ticket #{lastTicket.ventaId} disponible para imprimir.
          </p>
        )}
      </section>
    </div>
  );
}
