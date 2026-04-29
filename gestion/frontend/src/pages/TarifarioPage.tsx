import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { ELLIPSIS, EM } from "../lib/uiText";

type SalonItem = {
  id: number;
  tipo: string;
  nombre: string;
  precio: number;
  idProducto: number | null;
};

type SalonCategoria = {
  id: number;
  nombre: string;
  orden: number;
  items: SalonItem[];
};

type ProductoOpt = { id: number; descripcion: string; precioVenta: number; estado: string };
type BootstrapCatalogResponse = {
  ok: boolean;
  created: { categorias: number; items: number };
  message: string;
};

export default function TarifarioPage() {
  const [categorias, setCategorias] = useState<SalonCategoria[]>([]);
  const [productos, setProductos] = useState<ProductoOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [nombreCat, setNombreCat] = useState("");
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatNombre, setEditCatNombre] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        api<SalonCategoria[]>("/api/salon-categorias"),
        api<ProductoOpt[]>("/api/productos"),
      ]);
      setCategorias(cats);
      setProductos(prods);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!nombreCat.trim()) return;
    try {
      await api("/api/salon-categorias", {
        method: "POST",
        body: JSON.stringify({ nombre: nombreCat.trim(), orden: categorias.length }),
      });
      setNombreCat("");
      await load();
      setMsg("Categoría creada.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const guardarNombreCat = async (id: number) => {
    setMsg(null);
    try {
      await api(`/api/salon-categorias/${id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre: editCatNombre.trim() }),
      });
      setEditCatId(null);
      await load();
      setMsg("Categoría actualizada.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const borrarCategoria = async (id: number) => {
    if (!confirm("¿Eliminar la categoría y todos sus ítems del tarifario?")) return;
    setMsg(null);
    try {
      await api(`/api/salon-categorias/${id}`, { method: "DELETE" });
      await load();
      setMsg("Categoría eliminada.");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const cargarCatalogoUy = async () => {
    if (!confirm("¿Cargar catálogo base de peluquería para Uruguay? Se agregarán categorías y servicios faltantes.")) return;
    setMsg(null);
    try {
      const resp = await api<BootstrapCatalogResponse>("/api/salon-categorias/bootstrap-uy", { method: "POST" });
      await load();
      setMsg(resp.message);
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Categorías del tarifario</h2>
        <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
          Agrupe servicios (corte, peinado) o productos de venta con precio en mostrador (ej. crema bajo &quot;Cortes
          dama&quot;). En <strong>Cobro</strong> verá estas líneas siempre listas para cobrar.
        </p>
        <form className="form-grid" onSubmit={crearCategoria} style={{ maxWidth: 480 }}>
          <label>
            Nueva categoría *
            <input
              value={nombreCat}
              onChange={(e) => setNombreCat(e.target.value)}
              placeholder="Ej. Cortes dama, Coloración, Retail…"
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Crear categoría
            </button>
          </div>
        </form>
        <div className="form-actions" style={{ marginTop: "0.5rem" }}>
          <button type="button" className="btn btn-secondary" onClick={cargarCatalogoUy}>
            Cargar catálogo completo Uruguay
          </button>
        </div>
        {msg && (
          <p className={/creada|actualizada|eliminada|añadido|Ítem/i.test(msg) ? "ok" : "err"}>{msg}</p>
        )}
      </section>

      {loading ? (
        <p className="card">{"Cargando" + ELLIPSIS}</p>
      ) : (
        categorias.map((cat) => (
          <CategoriaBlock
            key={cat.id}
            cat={cat}
            productos={productos}
            onReload={load}
            onMsg={setMsg}
            editCatId={editCatId}
            setEditCatId={setEditCatId}
            editCatNombre={editCatNombre}
            setEditCatNombre={setEditCatNombre}
            onGuardarNombreCat={guardarNombreCat}
            onBorrarCategoria={borrarCategoria}
          />
        ))
      )}

      {!loading && categorias.length === 0 && (
        <section className="card mt-lg">
          <p className="muted">Todavía no hay categorías. Cree la primera arriba.</p>
        </section>
      )}
    </div>
  );
}

function CategoriaBlock({
  cat,
  productos,
  onReload,
  onMsg,
  editCatId,
  setEditCatId,
  editCatNombre,
  setEditCatNombre,
  onGuardarNombreCat,
  onBorrarCategoria,
}: {
  cat: SalonCategoria;
  productos: ProductoOpt[];
  onReload: () => Promise<void>;
  onMsg: (s: string | null) => void;
  editCatId: number | null;
  setEditCatId: (n: number | null) => void;
  editCatNombre: string;
  setEditCatNombre: (s: string) => void;
  onGuardarNombreCat: (id: number) => Promise<void>;
  onBorrarCategoria: (id: number) => Promise<void>;
}) {
  const [tipoNuevo, setTipoNuevo] = useState<"servicio" | "producto">("servicio");
  const [nombreItem, setNombreItem] = useState("");
  const [precioItem, setPrecioItem] = useState("");
  const [idProdSel, setIdProdSel] = useState("");

  const agregarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    onMsg(null);
    if (!nombreItem.trim() || precioItem === "") {
      onMsg("Nombre y precio del ítem son obligatorios.");
      return;
    }
    if (tipoNuevo === "producto" && !idProdSel) {
      onMsg("Elija un producto de inventario.");
      return;
    }
    try {
      await api(`/api/salon-categorias/${cat.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          tipo: tipoNuevo,
          nombre: nombreItem.trim(),
          precio: Number(precioItem),
          idProducto: tipoNuevo === "producto" ? Number(idProdSel) : undefined,
        }),
      });
      setNombreItem("");
      setPrecioItem("");
      setIdProdSel("");
      await onReload();
      onMsg("Ítem añadido al tarifario.");
    } catch (e) {
      onMsg(String(e));
    }
  };

  const borrarItem = async (itemId: number) => {
    if (!confirm("¿Quitar esta línea del tarifario?")) return;
    onMsg(null);
    try {
      await api(`/api/salon-categoria-items/${itemId}`, { method: "DELETE" });
      await onReload();
      onMsg("Ítem eliminado.");
    } catch (e) {
      onMsg(String(e));
    }
  };

  const prodsDisponibles = productos.filter((p) => p.estado === "disponible");

  return (
    <section className="card mt-lg" key={cat.id}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {editCatId === cat.id ? (
          <>
            <input value={editCatNombre} onChange={(e) => setEditCatNombre(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <button type="button" className="btn btn-primary" onClick={() => onGuardarNombreCat(cat.id)}>
              Guardar
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditCatId(null)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: 0, flex: 1 }}>{cat.nombre}</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditCatId(cat.id);
                setEditCatNombre(cat.nombre);
              }}
            >
              Renombrar
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onBorrarCategoria(cat.id)}>
              Eliminar categoría
            </button>
          </>
        )}
      </div>

      <form className="form-grid" onSubmit={agregarItem} style={{ marginBottom: "1rem", maxWidth: 720 }}>
        <label>
          Tipo de ítem
          <select value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value as "servicio" | "producto")}>
            <option value="servicio">Servicio (solo nombre y precio)</option>
            <option value="producto">Producto de inventario (descuenta stock al cobrar)</option>
          </select>
        </label>
        <label>
          Nombre en el tarifario *
          <input
            value={nombreItem}
            onChange={(e) => setNombreItem(e.target.value)}
            placeholder={tipoNuevo === "servicio" ? "Ej. Peinado común" : "Ej. Crema keratina 250 ml"}
            required
          />
        </label>
        <label>
          Precio de cobro *
          <input type="number" step="0.01" min="0" value={precioItem} onChange={(e) => setPrecioItem(e.target.value)} required />
        </label>
        {tipoNuevo === "producto" && (
          <label>
            Producto de inventario *
            <select value={idProdSel} onChange={(e) => setIdProdSel(e.target.value)} required>
              <option value="">{EM} Elegir producto</option>
              {prodsDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.descripcion} (${p.precioVenta.toFixed(2)})
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Añadir a &quot;{cat.nombre}&quot;
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Producto inv.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cat.items.map((it) => (
              <tr key={it.id}>
                <td>{it.tipo === "producto" ? "Producto" : "Servicio"}</td>
                <td>{it.nombre}</td>
                <td>${it.precio.toFixed(2)}</td>
                <td>{it.idProducto != null ? `#${it.idProducto}` : EM}</td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => borrarItem(it.id)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cat.items.length === 0 && <p className="muted">Sin ítems en esta categoría.</p>}
      </div>
    </section>
   );
}
