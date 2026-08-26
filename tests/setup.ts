import { config } from "dotenv";
import { beforeEach } from "vitest";

config({ path: ".env.test", override: true });

const { prisma } = await import("../src/db/prisma.js");

// Deletes in dependency order so each test starts from a clean database.
async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentCategory.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.student.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.district.deleteMany();
}

beforeEach(async () => {
  await resetDatabase();
});
