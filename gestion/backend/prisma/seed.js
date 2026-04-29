import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || "superadmin@gmail.com").trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || "cambiar123123";
  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    console.log("Superadmin ya existe:", email);
    return;
  }

  await prisma.usuario.create({
    data: {
      email,
      passwordHash: hash,
      nombre: "Superadministrador",
      rol: "superadmin",
      idPeluqueria: null,
    },
  });
  console.log("Superadmin creado:", email, "(cambie la contraseña en producción)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
