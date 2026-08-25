import bcrypt from "bcryptjs";
import { ParentRelationship, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  // System B (the back-office portal) is district-level for a SYSTEM_OWNER,
  // so the seed needs a district and more than one school under it —
  // otherwise the Multi-School Overview has nothing to compare.
  const district = await prisma.district.create({
    data: { name: "Johannesburg Central District" },
  });

  const school = await prisma.school.create({
    data: {
      districtId: district.id,
      name: "Riverside Primary School",
      address: "12 Main Road, Johannesburg",
      phone: "+27 11 555 0100",
      principalName: "Jennifer Johnson",
    },
  });

  const secondSchool = await prisma.school.create({
    data: {
      districtId: district.id,
      name: "Hilltop Primary School",
      address: "48 Ridge Avenue, Johannesburg",
      phone: "+27 11 555 0180",
      principalName: "Samuel Khumalo",
    },
  });

  await prisma.user.create({
    data: {
      districtId: district.id,
      role: Role.SYSTEM_OWNER,
      name: "Kari Group Operations",
      email: "owner@karigroup.example",
      passwordHash,
    },
  });

  await prisma.user.create({
    data: {
      schoolId: secondSchool.id,
      role: Role.SUPER_USER,
      name: "Samuel Khumalo",
      email: "principal@hilltop.example",
      passwordHash,
    },
  });

  await prisma.user.create({
    data: {
      schoolId: school.id,
      role: Role.SUPPORT,
      name: "Thandi Support",
      email: "support@riverside.example",
      passwordHash,
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

  console.log("Seeded (every login uses Password123!):");
  console.log(`  District:   ${district.name}`);
  console.log(`  School:     ${school.name} (${school.id})`);
  console.log(`  School 2:   ${secondSchool.name} (${secondSchool.id})`);
  console.log("  -- System B (back-office web portal) --");
  console.log("  System Owner: owner@karigroup.example");
  console.log("  Super User:   principal@riverside.example  (also principal@hilltop.example)");
  console.log("  Support:      support@riverside.example");
  console.log("  -- System A (mobile PWA) --");
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
