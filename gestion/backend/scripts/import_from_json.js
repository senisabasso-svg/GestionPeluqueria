import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_DIR = path.resolve(path.join(process.cwd(), "data_export"));

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8"));

async function ensurePeluqueriaAndUser(email) {
  const candidatas = await prisma.peluqueria.findMany({});
  let salon = candidatas.find((p) => p.nombre.toLowerCase().includes("romina"));
  if (!salon) {
    salon = await prisma.peluqueria.create({
      data: { nombre: "Peluquería Romina", activo: true },
    });
  }

  let user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcrypt.hash("cambiar123", 10);
    user = await prisma.usuario.create({
      data: {
        email,
        passwordHash: hash,
        nombre: "Romina",
        rol: "admin",
        idPeluqueria: salon.id,
      },
    });
  } else if (user.idPeluqueria == null) {
    user = await prisma.usuario.update({
      where: { id: user.id },
      data: { idPeluqueria: salon.id },
    });
  }

  return { salonId: salon.id, userId: user.id };
}

async function clearSalonData(idPeluqueria) {
  await prisma.ventaItem.deleteMany({ where: { idPeluqueria } });
  await prisma.venta.deleteMany({ where: { idPeluqueria } });
  await prisma.salonCategoriaItem.deleteMany({ where: { idPeluqueria } });
  await prisma.salonCategoria.deleteMany({ where: { idPeluqueria } });
  await prisma.producto.deleteMany({ where: { idPeluqueria } });
  await prisma.proveedor.deleteMany({ where: { idPeluqueria } });
  await prisma.cliente.deleteMany({ where: { idPeluqueria } });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const email = "romina@gmail.com";
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL. Defínelo en el entorno o en un archivo .env");
  }
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`No se encuentra la carpeta de datos: ${DATA_DIR}`);
  }

  const { salonId } = await ensurePeluqueriaAndUser(email);

  await clearSalonData(salonId);

  const proveedores = readJson("proveedores");
  const productos = readJson("productos");
  const ventas = readJson("ventas");
  const ventaItems = readJson("venta_items");

  if (proveedores.length) {
    const data = proveedores.map((p) => ({
      id: p.id,
      idPeluqueria: salonId,
      nombre: p.nombre,
      telefono: p.telefono || null,
      email: p.email || null,
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.proveedor.createMany({ data: batch });
    }
  }

  if (productos.length) {
    const data = productos.map((p) => ({
      id: p.id,
      idPeluqueria: salonId,
      descripcion: p.descripcion,
      categoria: p.tipo_prenda || null,
      marca: p.marca || null,
      color: p.color || null,
      notas: p.condicion || null,
      precioVenta: Number(p.precio_venta),
      codigo: p.talle || null,
      idProveedor: p.id_proveedor,
      estado: p.estado || "disponible",
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.producto.createMany({ data: batch });
    }
  }

  if (ventas.length) {
    const data = ventas.map((v) => ({
      id: v.id,
      idPeluqueria: salonId,
      idCliente: v.id_cliente != null ? Number(v.id_cliente) : null,
      fecha: new Date(v.fecha),
      total: Number(v.total),
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.venta.createMany({ data: batch });
    }
  }

  if (ventaItems.length) {
    const data = ventaItems.map((vi) => ({
      id: vi.id,
      idPeluqueria: salonId,
      idVenta: vi.id_venta,
      idProducto: vi.id_producto != null ? Number(vi.id_producto) : null,
      descripcionLinea: vi.descripcion_linea ?? null,
      tipoLinea: vi.tipo_linea || "producto",
      precioUnitario: Number(vi.precio_unitario),
    }));
    for (const batch of chunk(data, 500)) {
      await prisma.ventaItem.createMany({ data: batch });
    }
  }

  console.log("Importación finalizada para peluquería", salonId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
