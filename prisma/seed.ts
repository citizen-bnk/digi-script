import bcrypt from "bcryptjs";
import { ParentRelationship, PrismaClient, Role } from "@prisma/client";
import {
  DEMO_DISTRICT,
  DEMO_PASSWORD,
  DEMO_PERSONAS,
  DEMO_SCHOOLS,
  type SchoolKey,
} from "../src/modules/demo/demo.personas.js";
import { ingestDocument } from "../src/modules/documents/document.service.js";
import { getOrCreateConversation, sendParentMessage, sendStaffReply } from "../src/modules/conversations/conversation.service.js";
import { resolveEscalation } from "../src/modules/escalations/escalation.service.js";
import type { AuthenticatedUser } from "../src/types/auth.js";

const prisma = new PrismaClient();

/**
 * Demo seed: a South African school district, sized so a demonstrator can
 * walk PRD use cases 1-4 (parent query, document upload and
 * auto-organization, supervisor review and escalation, compliance audit)
 * without typing anything in first.
 *
 * Documents and conversations are created by calling the real services
 * rather than by inserting rows, so the AI categorization, the
 * confidence-threshold routing into the escalation queue, and the audit
 * trail are all genuinely produced — the demo shows the system working, not
 * a set of pre-baked rows that happen to look right.
 */

/** Clears prior data so `npm run seed` can be re-run between demo runs. */
async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentCategory.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.user.deleteMany();
  await prisma.student.deleteMany();
  await prisma.school.deleteMany();
  await prisma.district.deleteMany();
}

interface Learner {
  name: string;
  grade: string;
  className: string;
  dateOfBirth: string;
  schoolKey: SchoolKey;
  /** Email of the parent persona who should be linked to this learner. */
  parentEmail?: string;
}

const LEARNERS: Learner[] = [
  // Lethabo Primary — Grade 4A is the class Lerato Molefe and Tshepo Radebe
  // are scoped to, so it needs enough learners for scoping to be visible.
  { name: "Palesa Ndlovu", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-03-14", schoolKey: "lethabo", parentEmail: "zanele.mahlangu@gmail.demo" },
  { name: "Katlego Mahlangu", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-07-02", schoolKey: "lethabo", parentEmail: "zanele.mahlangu@gmail.demo" },
  { name: "Buhle Mabaso", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-11-21", schoolKey: "lethabo" },
  { name: "Andile Zwane", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-05-09", schoolKey: "lethabo" },
  // A second class at the same school, to show class scoping excluding it.
  { name: "Nandi Ngcobo", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-02-18", schoolKey: "lethabo" },
  { name: "Lwazi Maluleke", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-09-30", schoolKey: "lethabo" },
  { name: "Amogelang Sithole", grade: "Grade R", className: "Grade RA", dateOfBirth: "2020-06-11", schoolKey: "lethabo" },

  // Masibambane Secondary
  { name: "Sibusiso Mthembu", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-04-25", schoolKey: "masibambane", parentEmail: "kagiso.motaung@gmail.demo" },
  { name: "Lindiwe Sibanda", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-08-07", schoolKey: "masibambane" },
  { name: "Mpho Rakoma", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-12-02", schoolKey: "masibambane" },
  { name: "Tumelo Baloyi", grade: "Grade 12", className: "Grade 12A", dateOfBirth: "2008-01-19", schoolKey: "masibambane" },
];

interface SeedDocument {
  filename: string;
  /** Drives the heuristic categorizer, standing in for extracted document text. */
  textSample: string;
  schoolKey: SchoolKey;
  learnerName?: string;
  term?: string;
}

/**
 * Chosen so the demo has a spread of outcomes: most land in a category
 * confidently, and the last two deliberately match no keyword, so they come
 * out low-confidence and drop into the escalation queue for the supervisor
 * to review. That is PRD use case 3, live.
 */
const DOCUMENTS: SeedDocument[] = [
  {
    filename: "School_Fees_Invoice_Term1_2026.pdf",
    textSample: "Tax invoice. School fees for Term 1 2026. Amount due R4 850.00. Payable to Lethabo Primary School.",
    schoolKey: "lethabo",
    term: "Term 1",
  },
  {
    filename: "Learner_Transport_Invoice_February.pdf",
    textSample: "Invoice for scholar transport services, February 2026. 42 learners. Total R18 300.00.",
    schoolKey: "lethabo",
    term: "Term 1",
  },
  {
    filename: "Grade4A_Attendance_Register_March.pdf",
    textSample: "Daily attendance register, Grade 4A, March 2026. Learners present and absent recorded per day.",
    schoolKey: "lethabo",
    term: "Term 1",
  },
  {
    filename: "Absence_Note_Palesa_Ndlovu.pdf",
    textSample: "Absence note. Palesa Ndlovu was absent on 4 March 2026 due to a clinic appointment.",
    schoolKey: "lethabo",
    learnerName: "Palesa Ndlovu",
    term: "Term 1",
  },
  {
    filename: "Medical_Certificate_Katlego_Mahlangu.pdf",
    textSample: "Medical certificate issued at Tembisa Clinic. Katlego Mahlangu, asthma. EpiPen not required.",
    schoolKey: "lethabo",
    learnerName: "Katlego Mahlangu",
    term: "Term 1",
  },
  {
    filename: "Report_Card_Palesa_Ndlovu_Term1.pdf",
    textSample: "Term result report card for Palesa Ndlovu, Grade 4A. Academic report, Term 1 2026.",
    schoolKey: "lethabo",
    learnerName: "Palesa Ndlovu",
    term: "Term 1",
  },
  {
    filename: "NSNP_Feeding_Scheme_Delivery_Note.pdf",
    textSample: "National School Nutrition Programme delivery. Receipt for maize meal and pilchards, March 2026.",
    schoolKey: "lethabo",
    term: "Term 1",
  },
  {
    filename: "Grade10B_Attendance_Register_March.pdf",
    textSample: "Attendance register, Grade 10B, March 2026. Present and absent marked daily.",
    schoolKey: "masibambane",
    term: "Term 1",
  },
  {
    filename: "Sick_Leave_Application_N_Sithole.pdf",
    textSample: "Sick leave application submitted by educator N. Sithole for 12-13 March 2026.",
    schoolKey: "masibambane",
    term: "Term 1",
  },
  {
    filename: "Disciplinary_Incident_Grade12A.pdf",
    textSample: "Incident report. Disciplinary matter recorded for a Grade 12A learner, 6 March 2026.",
    schoolKey: "masibambane",
    term: "Term 1",
  },

  // --- Deliberately unclassifiable: these land below the confidence
  //     threshold and appear in the escalation queue.
  {
    filename: "SGB_Resolution_Signed_Scan.pdf",
    textSample: "Signed resolution of the governing body taken at the sitting of 18 February 2026.",
    schoolKey: "lethabo",
    term: "Term 1",
  },
  {
    filename: "Scanned_Document_0043.pdf",
    textSample: "Photographed page, handwriting partly illegible.",
    schoolKey: "masibambane",
    learnerName: "Sibusiso Mthembu",
    term: "Term 1",
  },
];

function asAuthUser(user: {
  id: string;
  role: Role;
  schoolId: string | null;
  districtId: string | null;
  email: string;
  assignedClassName: string | null;
  studentId: string | null;
}): AuthenticatedUser {
  return user;
}

async function main() {
  await reset();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const district = await prisma.district.create({ data: { name: DEMO_DISTRICT } });

  const schoolsByKey = new Map<SchoolKey, { id: string; name: string }>();
  for (const school of DEMO_SCHOOLS) {
    const created = await prisma.school.create({
      data: {
        districtId: district.id,
        name: school.name,
        address: school.address,
        phone: school.phone,
        principalName: school.principalName,
      },
    });
    schoolsByKey.set(school.key, created);
  }

  // Learners first: a STUDENT login has to point at an existing record.
  const learnersByName = new Map<string, { id: string; schoolId: string }>();
  for (const learner of LEARNERS) {
    const school = schoolsByKey.get(learner.schoolKey)!;
    const created = await prisma.student.create({
      data: {
        schoolId: school.id,
        name: learner.name,
        grade: learner.grade,
        className: learner.className,
        dateOfBirth: new Date(learner.dateOfBirth),
      },
    });
    learnersByName.set(learner.name, { id: created.id, schoolId: school.id });
  }

  const usersByEmail = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();
  for (const persona of DEMO_PERSONAS) {
    const school = persona.schoolKey ? schoolsByKey.get(persona.schoolKey) : undefined;
    const created = await prisma.user.create({
      data: {
        districtId: persona.role === Role.SYSTEM_OWNER ? district.id : undefined,
        schoolId: school?.id,
        role: persona.role,
        name: persona.name,
        email: persona.email,
        passwordHash,
        assignedClassName: persona.assignedClassName,
        studentId: persona.studentName ? learnersByName.get(persona.studentName)?.id : undefined,
      },
    });
    usersByEmail.set(persona.email, created);
  }

  for (const learner of LEARNERS) {
    if (!learner.parentEmail) continue;
    const parent = usersByEmail.get(learner.parentEmail)!;
    await prisma.parentStudentLink.create({
      data: {
        studentId: learnersByName.get(learner.name)!.id,
        parentUserId: parent.id,
        relationship: ParentRelationship.MOTHER,
      },
    });
  }

  // --- Documents, through the real ingestion pipeline ------------------
  const uploaderByKey: Record<SchoolKey, string> = {
    lethabo: usersByEmail.get("thandiwe.mokoena@lethabo.demo")!.id,
    masibambane: usersByEmail.get("bongani.zulu@masibambane.demo")!.id,
  };

  for (const doc of DOCUMENTS) {
    const school = schoolsByKey.get(doc.schoolKey)!;
    await ingestDocument({
      schoolId: school.id,
      uploadedByUserId: uploaderByKey[doc.schoolKey],
      filename: doc.filename,
      mimeType: "application/pdf",
      buffer: Buffer.from(doc.textSample),
      studentId: doc.learnerName ? learnersByName.get(doc.learnerName)!.id : undefined,
      academicYear: "2026",
      term: doc.term,
      textSample: doc.textSample,
    });
  }

  // --- Parent conversations (PRD use case 1) ---------------------------
  const zanele = asAuthUser(usersByEmail.get("zanele.mahlangu@gmail.demo")!);
  const lethabo = schoolsByKey.get("lethabo")!;
  const palesa = learnersByName.get("Palesa Ndlovu")!;

  const answered = await getOrCreateConversation(zanele, { schoolId: lethabo.id, studentId: palesa.id });
  await sendParentMessage({
    conversationId: answered.id,
    schoolId: lethabo.id,
    parentUserId: zanele.id,
    body: "Good morning. Did you receive Palesa's absence note for 4 March?",
  });

  // A question nothing on file can answer, so it escalates and gives the
  // supervisor demo something waiting in the queue.
  const escalatedChat = await getOrCreateConversation(zanele, { schoolId: lethabo.id });
  await sendParentMessage({
    conversationId: escalatedChat.id,
    schoolId: lethabo.id,
    parentUserId: zanele.id,
    body: "When does the Grade 4 outing to the Union Buildings leave, and what must I pay?",
  });

  const kagiso = asAuthUser(usersByEmail.get("kagiso.motaung@gmail.demo")!);
  const masibambane = schoolsByKey.get("masibambane")!;
  const sibusiso = learnersByName.get("Sibusiso Mthembu")!;
  const secondaryChat = await getOrCreateConversation(kagiso, { schoolId: masibambane.id, studentId: sibusiso.id });
  await sendParentMessage({
    conversationId: secondaryChat.id,
    schoolId: masibambane.id,
    parentUserId: kagiso.id,
    body: "Please confirm Sibusiso's attendance for March.",
  });

  // A staff reply plus an internal note, so the demo can show that parents
  // see one and not the other.
  const lerato = usersByEmail.get("lerato.molefe@lethabo.demo")!;
  await sendStaffReply({
    conversationId: escalatedChat.id,
    schoolId: lethabo.id,
    staffUserId: lerato.id,
    body: "Morning Mrs Mahlangu — the outing letter goes out on Friday. I will confirm the amount then.",
    isInternal: false,
  });
  await sendStaffReply({
    conversationId: escalatedChat.id,
    schoolId: lethabo.id,
    staffUserId: lerato.id,
    body: "Internal: finance has not confirmed the transport quote yet. Do not commit to an amount.",
    isInternal: true,
  });

  // --- Leave the queue realistic: one resolved, the rest open ----------
  const openEscalations = await prisma.escalation.findMany({
    where: { schoolId: masibambane.id },
    orderBy: { createdAt: "asc" },
  });
  if (openEscalations.length > 0) {
    await resolveEscalation(
      openEscalations[0].id,
      masibambane.id,
      usersByEmail.get("ayanda.khumalo@masibambane.demo")!.id,
      "Confirmed with the class teacher and filed under Attendance.",
    );
  }

  // --- Summary ---------------------------------------------------------
  const [documentCount, escalationCount, pendingCount] = await Promise.all([
    prisma.document.count(),
    prisma.escalation.count(),
    prisma.escalation.count({ where: { status: { not: "RESOLVED" } } }),
  ]);

  console.log(`\nSeeded ${DEMO_DISTRICT}`);
  console.log(`  Schools:    ${DEMO_SCHOOLS.map((s) => s.name).join(", ")}`);
  console.log(`  Learners:   ${LEARNERS.length}`);
  console.log(`  Users:      ${DEMO_PERSONAS.length} (2 per role)`);
  console.log(`  Documents:  ${documentCount} (through the real categorization pipeline)`);
  console.log(`  Escalations:${escalationCount} total, ${pendingCount} still open`);
  console.log(`\n  Every demo login uses the password: ${DEMO_PASSWORD}`);
  console.log("  Run the API with DEMO_MODE=true and the apps show a role picker — no typing needed.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
