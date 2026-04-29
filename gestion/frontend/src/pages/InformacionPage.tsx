import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export type PublicacionRow = {
  id: number;
  titulo: string;
  subtitulo: string | null;
  tipo: string;
  imagenUrl: string;
  createdAt: string;
};

const TIPO_LABEL: Record<string, string> = {
  novedad: "Novedad",
  aviso: "Aviso",
  promocion: "Promoción",
  evento: "Evento",
  general: "General",
};

export default function InformacionPage() {
  const [items, setItems] = useState<PublicacionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setItems(await api<PublicacionRow[]>("/api/publicaciones-globales"));
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page informacion-page">
      <section className="card">
        <h2>Información</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Comunicados del administrador general para todos los salones. Misma información en cada peluquería.
        </p>
        {err && <p className="err">{err}</p>}
        {loading ? (
          <p className="muted">Cargando publicaciones…</p>
        ) : items.length === 0 ? (
          <p className="muted">No hay publicaciones por el momento.</p>
        ) : (
          <ul className="informacion-feed" aria-label="Publicaciones">
            {items.map((p) => (
              <li key={p.id} className="informacion-card">
                <div className="informacion-card__media">
                  <img src={p.imagenUrl} alt={p.titulo} loading="lazy" decoding="async" />
                </div>
                <div className="informacion-card__body">
                  <span className={`informacion-badge informacion-badge--${p.tipo}`}>
                    {TIPO_LABEL[p.tipo] ?? p.tipo}
                  </span>
                  <h3 className="informacion-card__title">{p.titulo}</h3>
                  {p.subtitulo ? <p className="informacion-card__subtitle">{p.subtitulo}</p> : null}
                  <time className="informacion-card__date" dateTime={p.createdAt}>
                    {new Date(p.createdAt).toLocaleString("es", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-secondary mt" onClick={load} disabled={loading}>
          Actualizar
        </button>
      </section>
    </div>
  );
}
