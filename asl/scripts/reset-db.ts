import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Database Reset...");

  // Delete everything
  await prisma.leaderboardEntry.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.player.deleteMany({});
  // Keeping Songs for now unless you want them gone too, but usually reset means everything.
  await prisma.song.deleteMany({});

  console.log("✅ Database Cleared.");

  // Create Test User
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: "test@gmail.com",
      displayName: "TestHero",
      password: hashedPassword,
    },
  });

  console.log("✨ Test Account Created:");
  console.log(`   Email: ${user.email}`);
  console.log(`   Hero Name: ${user.displayName}`);
  console.log(`   Password: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
