import "./ensureDb.js";

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "cambiar-en-produccion";

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : true, credentials: true }));
/* Límite mayor que el default (~100kb): publicaciones con imagen en base64 en JSON. */
app.use(express.json({ limit: "12mb" }));

function tenantIdFromUser(user) {
  if (!user) return null;
  if (user.idPeluqueria != null) return user.idPeluqueria;
  if (user.idSecond != null) return user.idSecond;
  return null;
}

function signToken(user) {
  const idPeluqueria = user.idPeluqueria ?? user.idSecond ?? null;
  return jwt.sign({ sub: user.id, rol: user.rol, idPeluqueria }, JWT_SECRET, { expiresIn: "7d" });
}

function authOptional(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    if (req.user && req.user.idPeluqueria == null && req.user.idSecond != null) {
      req.user.idPeluqueria = req.user.idSecond;
    }
  } catch {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user?.sub) return res.status(401).json({ error: "No autorizado. Inicie sesión." });
  next();
}

function requireTenant(req, res, next) {
  if (req.user.rol === "superadmin") {
    return res.status(403).json({ error: "Use el panel de superadmin para gestionar peluquerías." });
  }
  if (tenantIdFromUser(req.user) == null) {
    return res.status(403).json({ error: "Usuario sin peluquería asignada." });
  }
  next();
}

function requireSuperadmin(req, res, next) {
  if (req.user?.rol !== "superadmin") return res.status(403).json({ error: "Solo superadministrador." });
  next();
}

app.get("/health", (_, res) => res.json({ ok: true }));

function mapProductoApi(p) {
  return {
    id: p.id,
    descripcion: p.descripcion,
    categoria: p.categoria,
    marca: p.marca,
    color: p.color,
    notas: p.notas,
    precioVenta: p.precioVenta,
    codigo: p.codigo,
    idProveedor: p.idProveedor,
    estado: p.estado,
    nombreProveedor: p.proveedor?.nombre,
  };
}

function mapInformeVentaItem(vi) {
  const p = vi.producto;
  const c = vi.venta?.cliente;
  return {
    idVenta: vi.venta.id,
    fechaVenta: vi.venta.fecha,
    totalVenta: vi.venta.total,
    idProducto: p?.id ?? null,
    descripcionProducto: p?.descripcion ?? vi.descripcionLinea ?? "",
    categoria: p?.categoria ?? null,
    marca: p?.marca ?? null,
    color: p?.color ?? null,
    precioUnitario: vi.precioUnitario,
    idProveedor: p?.proveedor?.id ?? null,
    nombreProveedor: p?.proveedor?.nombre ?? (vi.tipoLinea === "servicio" ? "Servicio" : "—"),
    telefonoProveedor: p?.proveedor?.telefono ?? null,
    tipoLinea: vi.tipoLinea,
    nombreCliente: c?.nombre ?? null,
    telefonoCliente: c?.telefono ?? null,
  };
}

const CATALOGO_BASE_UY = [
  {
    nombre: "Cortes dama",
    items: [
      ["Corte clásico dama", 750],
      ["Corte con brushing", 980],
      ["Corte en capas", 920],
      ["Corte bob", 960],
      ["Corte pixie", 900],
      ["Flequillo", 420],
      ["Corte de puntas", 520],
    ],
  },
  {
    nombre: "Cortes caballero",
    items: [
      ["Corte clásico caballero", 650],
      ["Corte degradé / fade", 780],
      ["Corte máquina completo", 520],
      ["Corte + lavado", 820],
      ["Diseño de líneas", 260],
      ["Perfilado de cejas", 250],
    ],
  },
  {
    nombre: "Niños y teens",
    items: [
      ["Corte niño", 560],
      ["Corte niña", 620],
      ["Primer corte (bebé)", 680],
      ["Corte teens", 700],
    ],
  },
  {
    nombre: "Barbería",
    items: [
      ["Arreglo de barba", 540],
      ["Perfilado de barba", 420],
      ["Afeitado tradicional", 620],
      ["Combo corte + barba", 1100],
      ["Toallas calientes", 180],
    ],
  },
  {
    nombre: "Lavado y peinado",
    items: [
      ["Lavado simple", 320],
      ["Brushing corto", 520],
      ["Brushing medio", 650],
      ["Brushing largo", 780],
      ["Planchita", 420],
      ["Ondas / bucles", 550],
      ["Peinado social", 1200],
      ["Peinado de novia (prueba)", 2800],
      ["Peinado de novia (evento)", 3600],
      ["Recogido", 1400],
    ],
  },
  {
    nombre: "Coloración",
    items: [
      ["Retoque de raíz", 1500],
      ["Color global corto", 1700],
      ["Color global medio", 2100],
      ["Color global largo", 2500],
      ["Baño de color", 1150],
      ["Tonalización", 980],
      ["Matización", 920],
      ["Corrección de color", 2900],
      ["Color fantasía", 3200],
    ],
  },
  {
    nombre: "Mechas y balayage",
    items: [
      ["Mechas gorra", 1700],
      ["Mechas papel corto", 2100],
      ["Mechas papel largo", 2800],
      ["Balayage medio", 3600],
      ["Balayage largo", 4300],
      ["Babylights", 3000],
      ["Money piece", 1200],
      ["Decoloración global", 3600],
    ],
  },
  {
    nombre: "Tratamientos capilares",
    items: [
      ["Hidratación profunda", 1200],
      ["Nutrición capilar", 1200],
      ["Reconstrucción capilar", 1450],
      ["Botox capilar", 2200],
      ["Alisado corto", 2500],
      ["Alisado medio", 3200],
      ["Alisado largo", 3900],
      ["Keratina corto", 2200],
      ["Keratina largo", 3100],
      ["Detox capilar", 1300],
    ],
  },
  {
    nombre: "Manicura",
    items: [
      ["Manicura básica", 700],
      ["Manicura express", 500],
      ["Esmaltado tradicional", 580],
      ["Esmaltado semipermanente", 950],
      ["Kapping gel", 1200],
      ["Soft gel", 1550],
      ["Esculpidas gel", 1850],
      ["Esculpidas acrílico", 2050],
      ["Relleno", 1300],
      ["Nail art básico", 350],
      ["Nail art avanzado", 700],
      ["Retiro de semipermanente", 420],
      ["Retiro de esculpidas", 650],
      ["Spa de manos", 900],
      ["Parafina manos", 750],
    ],
  },
  {
    nombre: "Pedicuría",
    items: [
      ["Pedicura estética", 950],
      ["Pedicura spa", 1400],
      ["Esmaltado semipermanente pies", 980],
      ["Retiro semipermanente pies", 420],
      ["Belleza de pies express", 700],
      ["Parafina pies", 850],
    ],
  },
  {
    nombre: "Depilación facial",
    items: [
      ["Bozo", 280],
      ["Mentón", 280],
      ["Patillas", 350],
      ["Cejas diseño", 400],
      ["Rostro completo", 980],
    ],
  },
  {
    nombre: "Maquillaje",
    items: [
      ["Maquillaje social", 1800],
      ["Maquillaje noche", 2100],
      ["Maquillaje novia (prueba)", 3000],
      ["Maquillaje novia (evento)", 3800],
      ["Pestañas postizas", 600],
    ],
  },
  {
    nombre: "Paquetes y combos",
    items: [
      ["Color + corte + brushing", 3400],
      ["Mechas + tonalización + secado", 4300],
      ["Corte caballero + barba", 1100],
      ["Manicura + pedicura", 1550],
      ["Novia (peinado + maquillaje)", 7000],
      ["Quinceañera (peinado + maquillaje)", 5200],
    ],
  },
];

// Datos de la peluquería del usuario autenticado
app.get("/api/peluqueria", authOptional, requireAuth, requireTenant, async (req, res) => {
  try {
    const id = tenantIdFromUser(req.user);
    const row = await prisma.peluqueria.findUnique({
      where: { id },
      select: { id: true, nombre: true, logoUrl: true },
    });
    if (!row) return res.status(404).json({ error: "Peluquería no encontrada." });
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    const u = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }
    res.json({
      token: signToken({ id: u.id, rol: u.rol, idPeluqueria: u.idPeluqueria }),
      usuario: {
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        rol: u.rol,
        idPeluqueria: u.idPeluqueria,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/auth/me", authOptional, requireAuth, async (req, res) => {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, nombre: true, rol: true, idPeluqueria: true },
    });
    if (!u) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(u);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/super/peluquerias", authOptional, requireAuth, requireSuperadmin, async (_, res) => {
  try {
    res.json(await prisma.peluqueria.findMany({ orderBy: { id: "desc" } }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/super/peluquerias", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { nombre, logoUrl } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre de la peluquería es obligatorio." });
    const row = await prisma.peluqueria.create({
      data: { nombre: nombre.trim(), activo: true, logoUrl: logoUrl?.trim() || null },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/super/peluquerias/:id", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, activo, logoUrl } = req.body;
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre?.trim() || null;
    if (activo !== undefined) updateData.activo = Boolean(activo);
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null;
    const row = await prisma.peluqueria.update({ where: { id }, data: updateData });
    res.json(row);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Peluquería no encontrada." });
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/super/usuarios", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { email, password, idPeluqueria, idSecond, nombre, rol } = req.body;
    const idSalon = idPeluqueria != null ? Number(idPeluqueria) : idSecond != null ? Number(idSecond) : null;
    if (!email || !password || idSalon == null) {
      return res.status(400).json({ error: "Correo, contraseña e idPeluqueria (ID del salón) son obligatorios." });
    }
    const r = rol === "operador" ? "operador" : "admin";
    const salon = await prisma.peluqueria.findUnique({ where: { id: idSalon } });
    if (!salon) return res.status(400).json({ error: "No existe una peluquería con ese id." });
    const row = await prisma.usuario.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        nombre: nombre?.trim() || null,
        rol: r,
        idPeluqueria: idSalon,
      },
    });
    res.status(201).json({
      id: row.id,
      email: row.email,
      nombre: row.nombre,
      rol: row.rol,
      idPeluqueria: row.idPeluqueria,
    });
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "Ese correo ya está registrado." });
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

const PUBLICACION_TIPOS = new Set(["novedad", "aviso", "promocion", "evento", "general"]);
const PUBLICACION_IMAGEN_MAX = 2_200_000;

function normalizeTipoPublicacion(t) {
  const s = String(t || "general")
    .toLowerCase()
    .trim();
  return PUBLICACION_TIPOS.has(s) ? s : "general";
}

app.get("/api/publicaciones-globales", authOptional, requireAuth, requireTenant, async (_, res) => {
  try {
    const rows = await prisma.publicacionGlobal.findMany({ orderBy: { createdAt: "desc" } });
    res.json(
      rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        subtitulo: r.subtitulo,
        tipo: r.tipo,
        imagenUrl: r.imagenUrl,
        createdAt: r.createdAt,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/super/publicaciones", authOptional, requireAuth, requireSuperadmin, async (_, res) => {
  try {
    const rows = await prisma.publicacionGlobal.findMany({ orderBy: { createdAt: "desc" } });
    res.json(
      rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        subtitulo: r.subtitulo,
        tipo: r.tipo,
        imagenUrl: r.imagenUrl,
        createdAt: r.createdAt,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/super/publicaciones", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { titulo, subtitulo, tipo, imagenUrl } = req.body;
    if (!titulo?.trim()) return res.status(400).json({ error: "El título es obligatorio." });
    const img = imagenUrl != null ? String(imagenUrl).trim() : "";
    if (!img) return res.status(400).json({ error: "La imagen es obligatoria (subida o URL)." });
    if (img.length > PUBLICACION_IMAGEN_MAX) {
      return res.status(400).json({ error: "La imagen es demasiado grande. Use una más pequeña o comprímala." });
    }
    const row = await prisma.publicacionGlobal.create({
      data: {
        titulo: titulo.trim(),
        subtitulo: subtitulo?.trim() || null,
        tipo: normalizeTipoPublicacion(tipo),
        imagenUrl: img,
      },
    });
    res.status(201).json({
      id: row.id,
      titulo: row.titulo,
      subtitulo: row.subtitulo,
      tipo: row.tipo,
      imagenUrl: row.imagenUrl,
      createdAt: row.createdAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete("/api/super/publicaciones/:id", authOptional, requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.publicacionGlobal.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Publicación no encontrada." });
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.use("/api/proveedores", authOptional, requireAuth, requireTenant);
app.use("/api/productos", authOptional, requireAuth, requireTenant);
app.use("/api/ventas", authOptional, requireAuth, requireTenant);
app.use("/api/informes", authOptional, requireAuth, requireTenant);
app.use("/api/salon-categorias", authOptional, requireAuth, requireTenant);
app.use("/api/salon-categoria-items", authOptional, requireAuth, requireTenant);
app.use("/api/clientes", authOptional, requireAuth, requireTenant);
app.use("/api/turnos", authOptional, requireAuth, requireTenant);

const tw = (req) => ({ idPeluqueria: tenantIdFromUser(req.user) });

app.get("/api/proveedores", async (req, res) => {
  try {
    res.json(await prisma.proveedor.findMany({ where: tw(req), orderBy: { nombre: "asc" } }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/proveedores", async (req, res) => {
  try {
    const { nombre, telefono, email } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio." });
    const row = await prisma.proveedor.create({
      data: { nombre, telefono: telefono || null, email: email || null, idPeluqueria: tenantIdFromUser(req.user) },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/clientes", async (req, res) => {
  try {
    res.json(
      await prisma.cliente.findMany({
        where: tw(req),
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/clientes", async (req, res) => {
  try {
    const { nombre, telefono, email, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre del cliente es obligatorio." });
    const row = await prisma.cliente.create({
      data: {
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        notas: notas?.trim() || null,
        idPeluqueria: tenantIdFromUser(req.user),
      },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/clientes/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const existente = await prisma.cliente.findFirst({ where: { id, idPeluqueria: idP } });
    if (!existente) return res.status(404).json({ error: "Cliente no encontrado." });
    const { nombre, telefono, email, notas } = req.body;
    const updated = await prisma.cliente.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre: String(nombre).trim() || existente.nombre } : {}),
        ...(telefono !== undefined ? { telefono: telefono?.trim() || null } : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(notas !== undefined ? { notas: notas?.trim() || null } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/productos", async (req, res) => {
  try {
    const rows = await prisma.producto.findMany({ where: tw(req), include: { proveedor: true }, orderBy: { id: "desc" } });
    res.json(rows.map(mapProductoApi));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/productos/disponibles", async (req, res) => {
  try {
    const rows = await prisma.producto.findMany({
      where: { ...tw(req), estado: "disponible" },
      include: { proveedor: true },
      orderBy: { id: "desc" },
    });
    res.json(rows.map(mapProductoApi));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/productos", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const { descripcion, categoria, tipoPrenda, marca, color, notas, condicion, precioVenta, codigo, talle, idProveedor, estado } =
      req.body;
    const cat = categoria ?? tipoPrenda;
    const nts = notas ?? condicion;
    const cod = codigo ?? talle;
    if (!descripcion || precioVenta == null || !idProveedor) {
      return res.status(400).json({ error: "Descripción, precio de venta e identificador de proveedor son obligatorios." });
    }
    const prov = await prisma.proveedor.findFirst({
      where: { id: Number(idProveedor), idPeluqueria: idP },
    });
    if (!prov) return res.status(400).json({ error: "Proveedor no válido para esta peluquería." });
    const row = await prisma.producto.create({
      data: {
        descripcion,
        categoria: cat || null,
        marca: marca || null,
        color: color || null,
        notas: nts || null,
        precioVenta: Number(precioVenta),
        codigo: cod || null,
        idProveedor: Number(idProveedor),
        idPeluqueria: idP,
        estado: estado || "disponible",
      },
      include: { proveedor: true },
    });
    res.status(201).json(mapProductoApi(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/productos/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const existente = await prisma.producto.findFirst({ where: { id, idPeluqueria: idP } });
    if (!existente) return res.status(404).json({ error: "Artículo no encontrado en su peluquería." });
    const { descripcion, categoria, tipoPrenda, marca, color, notas, condicion, precioVenta, codigo, talle, idProveedor, estado } =
      req.body;
    const cat = categoria !== undefined ? categoria : tipoPrenda;
    const nts = notas !== undefined ? notas : condicion;
    const cod = codigo !== undefined ? codigo : talle;
    if (idProveedor) {
      const prov = await prisma.proveedor.findFirst({ where: { id: Number(idProveedor), idPeluqueria: idP } });
      if (!prov) return res.status(400).json({ error: "Proveedor no válido para esta peluquería." });
    }
    const updated = await prisma.producto.update({
      where: { id },
      data: {
        ...(descripcion !== undefined ? { descripcion } : {}),
        ...(cat !== undefined ? { categoria: cat || null } : {}),
        ...(marca !== undefined ? { marca: marca || null } : {}),
        ...(color !== undefined ? { color: color || null } : {}),
        ...(nts !== undefined ? { notas: nts || null } : {}),
        ...(precioVenta !== undefined ? { precioVenta: Number(precioVenta) } : {}),
        ...(cod !== undefined ? { codigo: cod || null } : {}),
        ...(idProveedor !== undefined ? { idProveedor: Number(idProveedor) } : {}),
        ...(estado !== undefined ? { estado } : {}),
      },
      include: { proveedor: true },
    });
    res.json(mapProductoApi(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/ventas", async (req, res) => {
  const { items, idCliente } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debe enviar al menos un artículo en la venta." });
  }
  const idPeluqueria = tenantIdFromUser(req.user);
  const idCli = Number(idCliente);
  if (idCliente == null || Number.isNaN(idCli)) {
    return res.status(400).json({ error: "Debe seleccionar un cliente para la venta." });
  }
  try {
    const clienteRow = await prisma.cliente.findFirst({
      where: { id: idCli, idPeluqueria },
    });
    if (!clienteRow) {
      return res.status(400).json({ error: "Cliente no válido o no pertenece a su salón." });
    }
    const productLines = items.filter((i) => (i.tipo || "producto") !== "servicio");
    const servicioLines = items.filter((i) => i.tipo === "servicio");
    for (const s of servicioLines) {
      if (!s.descripcion?.trim()) {
        return res.status(400).json({ error: "Cada línea de servicio debe incluir descripción." });
      }
    }
    const ids = productLines.map((i) => Number(i.idProducto)).filter((id) => !Number.isNaN(id));
    if (productLines.length !== ids.length) {
      return res.status(400).json({ error: "Cada línea de producto debe incluir idProducto." });
    }
    const productos = await prisma.producto.findMany({
      where: { id: { in: ids }, idPeluqueria, estado: "disponible" },
    });
    if (productos.length !== ids.length) {
      return res.status(400).json({
        error: "Algún producto no existe, no está disponible o no pertenece a su peluquería.",
      });
    }
    const total = items.reduce((s, i) => s + Number(i.precioUnitario || 0), 0);
    const result = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({ data: { total, idPeluqueria, idCliente: idCli } });
      for (const it of items) {
        const tipo = it.tipo === "servicio" ? "servicio" : "producto";
        if (tipo === "servicio") {
          await tx.ventaItem.create({
            data: {
              idVenta: venta.id,
              idPeluqueria,
              idProducto: null,
              descripcionLinea: String(it.descripcion).trim(),
              tipoLinea: "servicio",
              precioUnitario: Number(it.precioUnitario),
            },
          });
        } else {
          const pid = Number(it.idProducto);
          await tx.ventaItem.create({
            data: {
              idVenta: venta.id,
              idPeluqueria,
              idProducto: pid,
              descripcionLinea: null,
              tipoLinea: "producto",
              precioUnitario: Number(it.precioUnitario),
            },
          });
          await tx.producto.update({ where: { id: pid }, data: { estado: "vendido" } });
        }
      }
      return venta;
    });
    res.status(201).json({ id: result.id, total: result.total, fecha: result.fecha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const { month, from, to } = req.query;
    let where = { ...tw(req) };
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where = { ...where, venta: { fecha: { gte: start, lt: end } } };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      where = { ...where, venta: { fecha: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } } };
    }
    const items = await prisma.ventaItem.findMany({
      where,
      include: { venta: { include: { cliente: true } }, producto: { include: { proveedor: true } } },
      orderBy: [{ venta: { fecha: "desc" } }, { idVenta: "desc" }],
    });
    res.json(items.map(mapInformeVentaItem));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes/proveedor/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const prov = await prisma.proveedor.findFirst({ where: { id, idPeluqueria: idP } });
    if (!prov) return res.status(404).json({ error: "Proveedor no encontrado." });
    const { month, from, to } = req.query;
    let where = { idPeluqueria: idP, producto: { idProveedor: id } };
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where = { ...where, venta: { fecha: { gte: start, lt: end } } };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      where = { ...where, venta: { fecha: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } } };
    }
    const rows = await prisma.ventaItem.findMany({
      where,
      include: { venta: { include: { cliente: true } }, producto: { include: { proveedor: true } } },
      orderBy: [{ venta: { fecha: "desc" } }, { idVenta: "desc" }],
    });
    res.json(rows.map(mapInformeVentaItem));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/informes/proveedor/:id/total", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const prov = await prisma.proveedor.findFirst({ where: { id, idPeluqueria: idP } });
    if (!prov) return res.status(404).json({ error: "Proveedor no encontrado." });
    const { month, from, to } = req.query;
    let where = { idPeluqueria: idP, producto: { idProveedor: id } };
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where = { ...where, venta: { fecha: { gte: start, lt: end } } };
    } else if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lt = to ? new Date(String(to)) : undefined;
      where = { ...where, venta: { fecha: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } } };
    }
    const agg = await prisma.ventaItem.aggregate({
      where,
      _sum: { precioUnitario: true },
    });
    res.json({ total: agg._sum.precioUnitario ?? 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/salon-categorias", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const rows = await prisma.salonCategoria.findMany({
      where: { idPeluqueria: idP },
      orderBy: [{ orden: "asc" }, { id: "asc" }],
      include: { items: { orderBy: { id: "asc" } } },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/salon-categorias/bootstrap-uy", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const created = { categorias: 0, items: 0 };

    for (let i = 0; i < CATALOGO_BASE_UY.length; i += 1) {
      const categoriaDef = CATALOGO_BASE_UY[i];
      let cat = await prisma.salonCategoria.findFirst({
        where: { idPeluqueria: idP, nombre: categoriaDef.nombre },
      });
      if (!cat) {
        cat = await prisma.salonCategoria.create({
          data: { idPeluqueria: idP, nombre: categoriaDef.nombre, orden: i },
        });
        created.categorias += 1;
      }

      for (const [nombre, precio] of categoriaDef.items) {
        const existe = await prisma.salonCategoriaItem.findFirst({
          where: { idPeluqueria: idP, idCategoria: cat.id, tipo: "servicio", nombre },
          select: { id: true },
        });
        if (!existe) {
          await prisma.salonCategoriaItem.create({
            data: {
              idPeluqueria: idP,
              idCategoria: cat.id,
              tipo: "servicio",
              nombre,
              precio,
              idProducto: null,
            },
          });
          created.items += 1;
        }
      }
    }

    res.json({
      ok: true,
      created,
      message:
        created.categorias === 0 && created.items === 0
          ? "El catálogo base ya estaba cargado."
          : `Catálogo base cargado. Categorías nuevas: ${created.categorias}. Servicios nuevos: ${created.items}.`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/salon-categorias", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const { nombre, orden } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre de la categoría es obligatorio." });
    const row = await prisma.salonCategoria.create({
      data: { nombre: nombre.trim(), orden: orden != null ? Number(orden) : 0, idPeluqueria: idP },
      include: { items: true },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/salon-categorias/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const cat = await prisma.salonCategoria.findFirst({ where: { id, idPeluqueria: idP } });
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada." });
    const { nombre, orden } = req.body;
    const updated = await prisma.salonCategoria.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre: String(nombre).trim() || cat.nombre } : {}),
        ...(orden !== undefined ? { orden: Number(orden) } : {}),
      },
      include: { items: { orderBy: { id: "asc" } } },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete("/api/salon-categorias/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const cat = await prisma.salonCategoria.findFirst({ where: { id, idPeluqueria: idP } });
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada." });
    await prisma.salonCategoria.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/salon-categorias/:id/items", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const idCat = Number(req.params.id);
    const cat = await prisma.salonCategoria.findFirst({ where: { id: idCat, idPeluqueria: idP } });
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada." });
    const { tipo, nombre, precio, idProducto } = req.body;
    const t = tipo === "producto" ? "producto" : "servicio";
    if (!nombre?.trim() || precio == null) return res.status(400).json({ error: "Nombre y precio son obligatorios." });
    if (t === "producto") {
      if (idProducto == null) return res.status(400).json({ error: "Debe elegir un producto de inventario." });
      const prod = await prisma.producto.findFirst({ where: { id: Number(idProducto), idPeluqueria: idP } });
      if (!prod) return res.status(400).json({ error: "Producto no válido para esta peluquería." });
    }
    const row = await prisma.salonCategoriaItem.create({
      data: {
        idPeluqueria: idP,
        idCategoria: idCat,
        tipo: t,
        nombre: nombre.trim(),
        precio: Number(precio),
        idProducto: t === "producto" ? Number(idProducto) : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/salon-categoria-items/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const row = await prisma.salonCategoriaItem.findFirst({ where: { id, idPeluqueria: idP } });
    if (!row) return res.status(404).json({ error: "Ítem no encontrado." });
    const { tipo, nombre, precio, idProducto } = req.body;
    let nextTipo = row.tipo;
    if (tipo === "producto" || tipo === "servicio") nextTipo = tipo;
    const nextNombre = nombre !== undefined ? String(nombre).trim() : row.nombre;
    const nextPrecio = precio !== undefined ? Number(precio) : row.precio;
    let nextIdProd = row.idProducto;
    if (nextTipo === "servicio") nextIdProd = null;
    else if (idProducto !== undefined) nextIdProd = idProducto != null ? Number(idProducto) : null;
    if (nextTipo === "producto") {
      if (nextIdProd == null) return res.status(400).json({ error: "Debe asociar un producto de inventario." });
      const prod = await prisma.producto.findFirst({ where: { id: nextIdProd, idPeluqueria: idP } });
      if (!prod) return res.status(400).json({ error: "Producto no válido." });
    }
    const updated = await prisma.salonCategoriaItem.update({
      where: { id },
      data: { tipo: nextTipo, nombre: nextNombre, precio: nextPrecio, idProducto: nextIdProd },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete("/api/salon-categoria-items/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const row = await prisma.salonCategoriaItem.findFirst({ where: { id, idPeluqueria: idP } });
    if (!row) return res.status(404).json({ error: "Ítem no encontrado." });
    await prisma.salonCategoriaItem.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/turnos", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const { from, to } = req.query;
    let where = { idPeluqueria: idP };
    if (from || to) {
      const gte = from ? new Date(String(from)) : undefined;
      const lte = to ? new Date(String(to)) : undefined;
      where = { ...where, fechaHora: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } };
    }
    const rows = await prisma.turno.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        salonItem: { select: { id: true, nombre: true, precio: true } },
      },
      orderBy: [{ fechaHora: "asc" }, { id: "asc" }],
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/turnos", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const { idCliente, idSalonItem, fechaHora, notas } = req.body;
    if (!idCliente || !idSalonItem || !fechaHora) {
      return res.status(400).json({ error: "Cliente, servicio y fecha/hora son obligatorios." });
    }

    const cliente = await prisma.cliente.findFirst({ where: { id: Number(idCliente), idPeluqueria: idP } });
    if (!cliente) return res.status(400).json({ error: "Cliente no válido para esta peluquería." });

    const servicio = await prisma.salonCategoriaItem.findFirst({
      where: { id: Number(idSalonItem), idPeluqueria: idP, tipo: "servicio" },
    });
    if (!servicio) return res.status(400).json({ error: "Servicio no válido para esta peluquería." });

    const when = new Date(String(fechaHora));
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "Fecha/hora inválida." });
    }

    const row = await prisma.turno.create({
      data: {
        idPeluqueria: idP,
        idCliente: Number(idCliente),
        idSalonItem: Number(idSalonItem),
        fechaHora: when,
        notas: notas?.trim() || null,
      },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        salonItem: { select: { id: true, nombre: true, precio: true } },
      },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.put("/api/turnos/:id", async (req, res) => {
  try {
    const idP = tenantIdFromUser(req.user);
    const id = Number(req.params.id);
    const row = await prisma.turno.findFirst({ where: { id, idPeluqueria: idP } });
    if (!row) return res.status(404).json({ error: "Turno no encontrado." });

    const { estado, notas } = req.body;
    const nextEstado =
      estado === "pendiente" || estado === "confirmado" || estado === "cancelado" || estado === "realizado"
        ? estado
        : row.estado;

    const updated = await prisma.turno.update({
      where: { id },
      data: {
        estado: nextEstado,
        ...(notas !== undefined ? { notas: notas?.trim() || null } : {}),
      },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        salonItem: { select: { id: true, nombre: true, precio: true } },
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

/** Credenciales por defecto solo si no existe aún ese email (cambiar en producción). */
const BOOTSTRAP_SUPERADMIN_EMAIL = "superadmin@gmail.com";
const BOOTSTRAP_SUPERADMIN_PASSWORD = "cambiar123123";

async function ensureBootstrapSuperadmin() {
  const email = BOOTSTRAP_SUPERADMIN_EMAIL.trim().toLowerCase();
  try {
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      if (existing.rol !== "superadmin") {
        console.warn(
          `[Auth] ${email} ya existe con rol "${existing.rol}". No se modifica; use otro email para superadmin o ajuste la BD.`,
        );
      }
      return;
    }
    await prisma.usuario.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(BOOTSTRAP_SUPERADMIN_PASSWORD, 10),
        nombre: "Superadministrador",
        rol: "superadmin",
        idPeluqueria: null,
      },
    });
    console.log("[Auth] Superadmin de arranque creado:", email, "(revise la contraseña en producción).");
  } catch (e) {
    console.error("[Auth] No se pudo crear superadmin de arranque:", e.message || e);
  }
}

ensureBootstrapSuperadmin().then(() => {
  app.listen(PORT, () => console.log(`API GestionPeluqueria en http://localhost:${PORT}`));
});
