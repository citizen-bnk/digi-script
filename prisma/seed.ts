import bcrypt from "bcryptjs";
import { ParentRelationship, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const school = await prisma.school.create({
    data: {
      name: "Riverside Primary School",
      address: "12 Main Road, Johannesburg",
      phone: "+27 11 555 0100",
      principalName: "Jennifer Johnson",
    },
  });

  const principal = await prisma.user.create({
    data: {
      schoolId: school.id,
      role: Role.SUPER_USER,
      name: "Jennifer Johnson",
      email: "principal@riverside.example",
      passwordHash,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      schoolId: school.id,
      role: Role.SUPERVISOR,
      name: "Mrs. Johnson",
      email: "supervisor@riverside.example",
      passwordHash,
      assignedClassName: "Grade 1A",
    },
  });

  const teacher = await prisma.user.create({
    data: {
      schoolId: school.id,
      role: Role.TEACHER,
      name: "Mr. Smith",
      email: "teacher@riverside.example",
      passwordHash,
      assignedClassName: "Grade 1A",
    },
  });

  const parent = await prisma.user.create({
    data: {
      schoolId: school.id,
      role: Role.PARENT,
      name: "Sarah Smith",
      email: "parent@riverside.example",
      phone: "+27 82 123 4567",
      passwordHash,
    },
  });

  const student = await prisma.student.create({
    data: {
      schoolId: school.id,
      name: "Jane Smith",
      grade: "Grade 1",
      className: "Grade 1A",
    },
  });

  await prisma.parentStudentLink.create({
    data: {
      parentUserId: parent.id,
      studentId: student.id,
      relationship: ParentRelationship.MOTHER,
    },
  });

  const studentLogin = await prisma.user.create({
    data: {
      schoolId: school.id,
      role: Role.STUDENT,
      name: student.name,
      email: "jane.smith@riverside.example",
      passwordHash,
      studentId: student.id,
    },
  });

  console.log("Seeded:");
  console.log(`  School:     ${school.name} (${school.id})`);
  console.log(`  Principal:  ${principal.email} / Password123!`);
  console.log(`  Supervisor: ${supervisor.email} / Password123!`);
  console.log(`  Teacher:    ${teacher.email} / Password123!`);
  console.log(`  Parent:     ${parent.email} / Password123!`);
  console.log(`  Student:   ${student.name} (${student.id})`);
  console.log(`  Student login: ${studentLogin.email} / Password123!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
