import { Role } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { momTemplateConfig } from "../lib/templates/mom";
import { serializeCalculatorConfig } from "../types/calculator";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin12345";

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is required for seeding");
  }

  const passwordHash = await hashPassword(adminPassword);

  await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      defaultMaxCalculators: 5,
      defaultAccessDays: 30,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      emailVerified: new Date(),
      passwordHash,
      banned: false,
    },
    create: {
      email: adminEmail,
      name: "Admin",
      role: Role.ADMIN,
      emailVerified: new Date(),
      passwordHash,
    },
  });

  await prisma.calculator.upsert({
    where: { slug: "mom" },
    update: {
      name: "Mom (салон)",
      description: "Шаблон калькулятора салона красоты",
      config: serializeCalculatorConfig(momTemplateConfig),
      isTemplate: true,
      isPublic: true,
      userId: admin.id,
    },
    create: {
      userId: admin.id,
      name: "Mom (салон)",
      description: "Шаблон калькулятора салона красоты",
      slug: "mom",
      config: serializeCalculatorConfig(momTemplateConfig),
      isTemplate: true,
      isPublic: true,
    },
  });

  console.log(`Seeded admin: ${adminEmail}`);
  console.log("Seeded template: mom");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
