import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = "SmartTiruppur2026!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const demoUsers = [
    {
      name: "System Administrator",
      email: "admin@smarttiruppur.local",
      role: Role.ADMIN,
      organization: "Smart Tiruppur Core Admin",
    },
    {
      name: "TNPCB Regional Officer",
      email: "regulator@smarttiruppur.local",
      role: Role.REGULATOR,
      organization: "Tamil Nadu Pollution Control Board",
    },
    {
      name: "Unit 001 Operations Manager",
      email: "industry@smarttiruppur.local",
      role: Role.INDUSTRY,
      industryUnitId: "unit_001",
      organization: "Arulpuram CETP Textile Dyeing Unit 001",
    },
    {
      name: "CGWB Hydrogeologist",
      email: "groundwater@smarttiruppur.local",
      role: Role.GROUNDWATER_OFFICER,
      organization: "Central Ground Water Board - Tiruppur District",
    },
    {
      name: "Tiruppur Citizen Representative",
      email: "citizen@smarttiruppur.local",
      role: Role.CITIZEN,
      organization: "Civic Environmental Forum",
    },
  ];

  console.log("Seeding demo users...");

  for (const user of demoUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          industryUnitId: user.industryUnitId || null,
          organization: user.organization,
          active: true,
        },
      });
      console.log(`Created user: ${user.email} [${user.role}]`);
    } else {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          name: user.name,
          passwordHash,
          role: user.role,
          industryUnitId: user.industryUnitId || null,
          organization: user.organization,
        },
      });
      console.log(`Updated user: ${user.email} [${user.role}]`);
    }
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
