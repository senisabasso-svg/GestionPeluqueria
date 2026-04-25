import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL para conectarse a la base.");
  }

  // Tablas reales en Postgres (mapeadas por Prisma)
  const tables = ["proveedores", "productos", "ventas", "venta_items"];

  for (const t of tables) {
    // Nombre de la secuencia por convención: <tabla>_id_seq
    const seq = `${t}_id_seq`;
    const [{ max }] = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id), 0) AS max FROM "${t}"`);
    const nextVal = Number(max) + 1;
    await prisma.$executeRawUnsafe(`SELECT setval('${seq}', ${nextVal}, false)`);
    console.log(`Reseteada secuencia ${seq} -> ${nextVal}`);
  }

  console.log("Secuencias actualizadas correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
