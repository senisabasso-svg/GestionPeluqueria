import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const up = await prisma.peluqueria.update({ where: { id: 2 }, data: { logoUrl: "/romilogo.jpeg" } });
  console.log("OK", up.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
