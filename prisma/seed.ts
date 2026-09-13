import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.usageLimit.upsert({
    where: { plan: "FREE" },
    create: { plan: "FREE", maxSites: 1, maxScansMonth: 3, maxPagesScan: 5 },
    update: { maxSites: 1, maxScansMonth: 3, maxPagesScan: 5 },
  });

  await prisma.usageLimit.upsert({
    where: { plan: "PRO" },
    create: { plan: "PRO", maxSites: 10, maxScansMonth: 100, maxPagesScan: 20 },
    update: { maxSites: 10, maxScansMonth: 100, maxPagesScan: 20 },
  });

  console.log("Seed completato: limiti Free/Pro impostati.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
