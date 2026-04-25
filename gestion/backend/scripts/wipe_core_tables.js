import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL para conectarse a la base de datos.");
  }
  // Borrado en orden por dependencias
  await prisma.ventaItem.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.salonCategoriaItem.deleteMany({});
  await prisma.salonCategoria.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.proveedor.deleteMany({});
  await prisma.cliente.deleteMany({});
  console.log(
    "Tablas limpiadas: venta_items, ventas, salon_categoria_items, salon_categorias, productos, proveedores, clientes"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
