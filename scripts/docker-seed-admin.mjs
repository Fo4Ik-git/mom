import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set — skip admin seed.");
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    if (existing.role !== "SUPERADMIN") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "SUPERADMIN" },
      });
      console.log(`Promoted existing user to SUPERADMIN: ${adminEmail}`);
    } else {
      console.log(`Superadmin already exists: ${adminEmail}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      defaultMaxCalculators: 5,
      defaultAccessDays: 30,
    },
  });

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Admin",
      role: "SUPERADMIN",
      emailVerified: new Date(),
      passwordHash,
    },
  });

  console.log(`Created superadmin: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
