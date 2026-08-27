import bcrypt from "bcryptjs";
import { EscalationStatus, ParentRelationship, Role } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  DEMO_DISTRICT,
  DEMO_PASSWORD,
  DEMO_PERSONAS,
  DEMO_SCHOOLS,
  type SchoolKey,
} from "./demo.personas.js";
import { ingestDocument } from "../documents/document.service.js";
import { pdfBytes, pngBytes } from "./demo.files.js";
import {
  getOrCreateConversation,
  resolveConversation,
  sendParentMessage,
  sendStaffReply,
} from "../conversations/conversation.service.js";
import { resolveEscalation } from "../escalations/escalation.service.js";
import type { AuthenticatedUser } from "../../types/auth.js";

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

/**
 * Real bytes for a seeded document: a readable one-page PDF for paperwork,
 * a photograph-shaped PNG for anything the scanning team would have
 * captured with a camera.
 */
function demoFileFor(doc: SeedDocument, schoolName: string): { buffer: Buffer; mimeType: string } {
  if (doc.filename.toLowerCase().endsWith(".png")) {
    return { buffer: pngBytes(), mimeType: "image/png" };
  }

  const heading = doc.filename.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  // Wrapped by hand: the PDF writer draws a line at a time and has no idea
  // how wide the page is.
  const wrapped = doc.textSample.match(/.{1,78}(\s|$)/g) ?? [doc.textSample];

  return {
    buffer: pdfBytes(heading, [
      schoolName,
      doc.term ? `${doc.term} 2026` : "2026",
      "",
      ...wrapped.map((line) => line.trim()),
    ]),
    mimeType: "application/pdf",
  };
}

/** Clears prior data so `npm run seed` can be re-run between demo runs. */
async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.document.deleteMany();
  // The bytes outlive the rows that point at them unless cleared here.
  await prisma.documentFile.deleteMany();
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
  // are scoped to, so it carries most of the roll: a class list only shows
  // scoping working when there is enough in it to be visibly a subset.
  { name: "Palesa Ndlovu", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-03-14", schoolKey: "lethabo", parentEmail: "zanele.mahlangu@gmail.demo" },
  { name: "Katlego Mahlangu", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-07-02", schoolKey: "lethabo", parentEmail: "zanele.mahlangu@gmail.demo" },
  { name: "Buhle Mabaso", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-11-21", schoolKey: "lethabo", parentEmail: "zanele.mahlangu@gmail.demo" },
  { name: "Andile Zwane", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-05-09", schoolKey: "lethabo" },
  { name: "Thandeka Mokwena", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-02-27", schoolKey: "lethabo" },
  { name: "Sanele Dube", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-09-15", schoolKey: "lethabo" },
  { name: "Refiloe Tshabalala", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-06-03", schoolKey: "lethabo" },
  { name: "Karabo Mnguni", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-12-08", schoolKey: "lethabo" },
  { name: "Zinhle Ngwenya", grade: "Grade 4", className: "Grade 4A", dateOfBirth: "2016-04-30", schoolKey: "lethabo" },

  // A second class at the same school, to show class scoping excluding it.
  { name: "Nandi Ngcobo", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-02-18", schoolKey: "lethabo", parentEmail: "zanele.mahlangu@gmail.demo" },
  { name: "Lwazi Maluleke", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-09-30", schoolKey: "lethabo" },
  { name: "Ayanda Mbeki", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-07-12", schoolKey: "lethabo" },
  { name: "Nkosana Dlamini", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-11-05", schoolKey: "lethabo" },
  { name: "Boitumelo Seima", grade: "Grade 6", className: "Grade 6C", dateOfBirth: "2014-03-22", schoolKey: "lethabo" },

  { name: "Amogelang Sithole", grade: "Grade R", className: "Grade RA", dateOfBirth: "2020-06-11", schoolKey: "lethabo" },
  { name: "Neo Mashaba", grade: "Grade R", className: "Grade RA", dateOfBirth: "2020-08-24", schoolKey: "lethabo" },
  { name: "Lesego Phiri", grade: "Grade R", className: "Grade RA", dateOfBirth: "2020-01-17", schoolKey: "lethabo" },

  // Masibambane Secondary
  { name: "Sibusiso Mthembu", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-04-25", schoolKey: "masibambane", parentEmail: "kagiso.motaung@gmail.demo" },
  { name: "Lindiwe Sibanda", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-08-07", schoolKey: "masibambane", parentEmail: "kagiso.motaung@gmail.demo" },
  { name: "Mpho Rakoma", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-12-02", schoolKey: "masibambane" },
  { name: "Thabang Motsepe", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-06-19", schoolKey: "masibambane" },
  { name: "Nomvula Khoza", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-10-11", schoolKey: "masibambane" },
  { name: "Sizwe Mahlaba", grade: "Grade 10", className: "Grade 10B", dateOfBirth: "2010-02-08", schoolKey: "masibambane" },
  { name: "Tumelo Baloyi", grade: "Grade 12", className: "Grade 12A", dateOfBirth: "2008-01-19", schoolKey: "masibambane" },
  { name: "Precious Nyathi", grade: "Grade 12", className: "Grade 12A", dateOfBirth: "2008-05-27", schoolKey: "masibambane" },
  { name: "Kabelo Sekhukhune", grade: "Grade 12", className: "Grade 12A", dateOfBirth: "2008-09-03", schoolKey: "masibambane" },
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
  // --- Lethabo Primary -------------------------------------------------
  { filename: "School_Fees_Invoice_Term1_2026.pdf", textSample: "Tax invoice. School fees for Term 1 2026. Amount due R4 850.00. Payable to Lethabo Primary School.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "School_Fees_Invoice_Term2_2026.pdf", textSample: "Tax invoice. School fees for Term 2 2026. Amount due R4 850.00. Outstanding balance carried forward.", schoolKey: "lethabo", term: "Term 2" },
  { filename: "Learner_Transport_Invoice_February.pdf", textSample: "Invoice for scholar transport services, February 2026. 42 learners. Total R18 300.00.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "Stationery_Purchase_Order_2026.pdf", textSample: "Purchase order for classroom stationery. Supplier invoice attached. Total R6 420.00.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "NSNP_Feeding_Scheme_Delivery_Note.pdf", textSample: "National School Nutrition Programme delivery. Receipt for maize meal and pilchards, March 2026.", schoolKey: "lethabo", term: "Term 1" },

  { filename: "Grade4A_Attendance_Register_March.pdf", textSample: "Daily attendance register, Grade 4A, March 2026. Learners present and absent recorded per day.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "Grade4A_Attendance_Register_April.pdf", textSample: "Daily attendance register, Grade 4A, April 2026. Learners present and absent recorded per day.", schoolKey: "lethabo", term: "Term 2" },
  { filename: "Grade6C_Attendance_Register_March.pdf", textSample: "Daily attendance register, Grade 6C, March 2026. Present and absent marked for each learner.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "Attendance_Summary_Term1_2026.pdf", textSample: "Attendance summary for Term 1 2026. Whole-school present and absent totals per grade.", schoolKey: "lethabo", term: "Term 1" },

  { filename: "Absence_Note_Palesa_Ndlovu.pdf", textSample: "Absence note. Palesa Ndlovu was absent on 4 March 2026 due to a clinic appointment.", schoolKey: "lethabo", learnerName: "Palesa Ndlovu", term: "Term 1" },
  { filename: "Absence_Note_Andile_Zwane.pdf", textSample: "Absence note from parent. Andile Zwane was absent on 11 March 2026, family funeral.", schoolKey: "lethabo", learnerName: "Andile Zwane", term: "Term 1" },
  { filename: "Medical_Certificate_Katlego_Mahlangu.pdf", textSample: "Medical certificate issued at Tembisa Clinic. Katlego Mahlangu, asthma. EpiPen not required.", schoolKey: "lethabo", learnerName: "Katlego Mahlangu", term: "Term 1" },
  { filename: "Immunization_Record_Palesa_Ndlovu.pdf", textSample: "Immunization record. Palesa Ndlovu. Vaccine schedule complete to Grade 4. Road to Health booklet.", schoolKey: "lethabo", learnerName: "Palesa Ndlovu", term: "Term 1" },
  { filename: "Allergy_Action_Plan_Buhle_Mabaso.pdf", textSample: "Health record. Allergy action plan for Buhle Mabaso. Peanut allergy, EpiPen kept at the office.", schoolKey: "lethabo", learnerName: "Buhle Mabaso", term: "Term 1" },
  { filename: "Health_Screening_GradeRA_2026.pdf", textSample: "Health screening results, Grade RA. Vision and hearing checks conducted by the school nurse.", schoolKey: "lethabo", term: "Term 1" },

  { filename: "Report_Card_Palesa_Ndlovu_Term1.pdf", textSample: "Term result report card for Palesa Ndlovu, Grade 4A. Academic report, Term 1 2026.", schoolKey: "lethabo", learnerName: "Palesa Ndlovu", term: "Term 1" },
  { filename: "Report_Card_Palesa_Ndlovu_Term2.pdf", textSample: "Term result report card for Palesa Ndlovu, Grade 4A. Academic report with grades, Term 2 2026.", schoolKey: "lethabo", learnerName: "Palesa Ndlovu", term: "Term 2" },
  { filename: "Report_Card_Katlego_Mahlangu_Term1.pdf", textSample: "Term result report card for Katlego Mahlangu, Grade 4A. Academic report, Term 1 2026.", schoolKey: "lethabo", learnerName: "Katlego Mahlangu", term: "Term 1" },
  { filename: "Report_Card_Nandi_Ngcobo_Term1.pdf", textSample: "Term result report card for Nandi Ngcobo, Grade 6C. Academic report with grades, Term 1 2026.", schoolKey: "lethabo", learnerName: "Nandi Ngcobo", term: "Term 1" },

  { filename: "Behaviour_Note_Grade4A_March.pdf", textSample: "Behaviour incident note recorded for a Grade 4A learner, 9 March 2026. Playground dispute.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "Educator_Leave_Application_T_Radebe.pdf", textSample: "Leave application submitted by educator T. Radebe for 20 March 2026, family responsibility leave.", schoolKey: "lethabo", term: "Term 1" },

  // --- Masibambane Secondary -------------------------------------------
  { filename: "Grade10B_Attendance_Register_March.pdf", textSample: "Attendance register, Grade 10B, March 2026. Present and absent marked daily.", schoolKey: "masibambane", term: "Term 1" },
  { filename: "Grade12A_Attendance_Register_March.pdf", textSample: "Attendance register, Grade 12A, March 2026. Daily present and absent record.", schoolKey: "masibambane", term: "Term 1" },
  { filename: "Report_Card_Sibusiso_Mthembu_Term1.pdf", textSample: "Term result report card for Sibusiso Mthembu, Grade 10B. Academic report, Term 1 2026.", schoolKey: "masibambane", learnerName: "Sibusiso Mthembu", term: "Term 1" },
  { filename: "Report_Card_Tumelo_Baloyi_Term1.pdf", textSample: "Term result report card for Tumelo Baloyi, Grade 12A. Academic report with grades for Term 1 2026.", schoolKey: "masibambane", learnerName: "Tumelo Baloyi", term: "Term 1" },
  { filename: "Immunization_Record_Sibusiso_Mthembu.pdf", textSample: "Immunization record for Sibusiso Mthembu. Vaccine history captured from the clinic card.", schoolKey: "masibambane", learnerName: "Sibusiso Mthembu", term: "Term 1" },
  { filename: "Sick_Leave_Application_N_Sithole.pdf", textSample: "Sick leave application submitted by educator N. Sithole for 12-13 March 2026.", schoolKey: "masibambane", term: "Term 1" },
  { filename: "Disciplinary_Incident_Grade12A.pdf", textSample: "Incident report. Disciplinary matter recorded for a Grade 12A learner, 6 March 2026.", schoolKey: "masibambane", term: "Term 1" },
  { filename: "Matric_Exam_Fees_Invoice_2026.pdf", textSample: "Invoice for National Senior Certificate examination fees, 2026 cohort. Total R12 600.00.", schoolKey: "masibambane", term: "Term 2" },
  { filename: "Laboratory_Equipment_Receipt.pdf", textSample: "Receipt for science laboratory equipment purchased for the Grade 12 practical programme.", schoolKey: "masibambane", term: "Term 1" },

  // --- Deliberately unclassifiable: these land below the confidence
  //     threshold and appear in the escalation queue.
  { filename: "Learner_ID_Card_Capture.png", textSample: "Identity document capture. Photographed learner identity card for enrolment records.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "Teacher_Registration_Form_Capture.png", textSample: "Photographed teacher registration form submitted during the capture drive.", schoolKey: "masibambane", term: "Term 1" },
  { filename: "SGB_Resolution_Signed_Scan.pdf", textSample: "Signed resolution of the governing body taken at the sitting of 18 February 2026.", schoolKey: "lethabo", term: "Term 1" },
  { filename: "Scanned_Document_0043.png", textSample: "Photographed page, handwriting partly illegible.", schoolKey: "masibambane", learnerName: "Sibusiso Mthembu", term: "Term 1" },
  { filename: "Untitled_Scan_0091.png", textSample: "Scanned page. Contents unclear from the capture.", schoolKey: "lethabo", term: "Term 2" },
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

export async function seedDemoData() {
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
        // Both demo schools start switched on; a SYSTEM_OWNER can turn
        // either off from the back office's Multi-School screen.
        demoModeEnabled: true,
      },
    });
    schoolsByKey.set(school.key, created);
  }

  // Learners first: a STUDENT login has to point at an existing record.
  //
  // Inserted in one statement rather than one per learner. This runs inside a
  // serverless function talking to a managed database, where the cost is
  // round trips rather than rows — a roll this size is the difference between
  // a seed that finishes and one that runs out of time part-way.
  await prisma.student.createMany({
    data: LEARNERS.map((learner) => ({
      schoolId: schoolsByKey.get(learner.schoolKey)!.id,
      name: learner.name,
      grade: learner.grade,
      className: learner.className,
      dateOfBirth: new Date(learner.dateOfBirth),
    })),
  });

  // createMany does not return the rows, and the ids are needed for parent
  // links, learner logins and per-learner documents.
  const learnersByName = new Map<string, { id: string; schoolId: string }>(
    (await prisma.student.findMany({ select: { id: true, name: true, schoolId: true } })).map(
      (learner) => [learner.name, { id: learner.id, schoolId: learner.schoolId }],
    ),
  );

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

  await prisma.parentStudentLink.createMany({
    data: LEARNERS.filter((learner) => learner.parentEmail).map((learner) => ({
      studentId: learnersByName.get(learner.name)!.id,
      parentUserId: usersByEmail.get(learner.parentEmail!)!.id,
      relationship: ParentRelationship.MOTHER,
    })),
  });

  // --- Documents, through the real ingestion pipeline ------------------
  const uploaderByKey: Record<SchoolKey, string> = {
    lethabo: usersByEmail.get("thandiwe.mokoena@lethabo.demo")!.id,
    masibambane: usersByEmail.get("bongani.zulu@masibambane.demo")!.id,
  };

  // Ingested in small parallel batches. Each document is still put through
  // the real pipeline — categorized, confidence-scored, escalated when it
  // scores low — but a document's cost is mostly waiting on the database, so
  // several at once finish in a fraction of the wall time. The batch is kept
  // small so a pooled connection is not exhausted.
  const INGEST_CONCURRENCY = 4;
  for (let start = 0; start < DOCUMENTS.length; start += INGEST_CONCURRENCY) {
    await Promise.all(
      DOCUMENTS.slice(start, start + INGEST_CONCURRENCY).map((doc) => {
        const school = schoolsByKey.get(doc.schoolKey)!;
        const file = demoFileFor(doc, school.name);
        return ingestDocument({
          schoolId: school.id,
          uploadedByUserId: uploaderByKey[doc.schoolKey],
          filename: doc.filename,
          mimeType: file.mimeType,
          buffer: file.buffer,
          studentId: doc.learnerName ? learnersByName.get(doc.learnerName)!.id : undefined,
          academicYear: "2026",
          term: doc.term,
          // The extracted text still drives categorization; the bytes are the
          // file a viewer opens. Previously they were the same thing, which
          // meant every stored document was a few sentences of plain text.
          textSample: doc.textSample,
        });
      }),
    );
  }

  // --- Parent conversations (PRD use case 1) ---------------------------
  //
  // One thread per topic a parent actually asks about, so the chat list has
  // the shape it has in real use rather than a single example. Each goes
  // through the real service, so the AI answer, its confidence, and the
  // escalation of anything it cannot answer are all genuinely produced.
  const zanele = asAuthUser(usersByEmail.get("zanele.mahlangu@gmail.demo")!);
  const lethabo = schoolsByKey.get("lethabo")!;
  const palesa = learnersByName.get("Palesa Ndlovu")!;
  const katlego = learnersByName.get("Katlego Mahlangu")!;

  /** Opens a thread and asks one question, as the parent. */
  async function parentAsks(
    parent: AuthenticatedUser,
    schoolId: string,
    body: string,
    studentId?: string,
  ) {
    const conversation = await getOrCreateConversation(parent, { schoolId, studentId });
    await sendParentMessage({ conversationId: conversation.id, schoolId, parentUserId: parent.id, body });
    return conversation;
  }

  const attendanceThread = await parentAsks(
    zanele,
    lethabo.id,
    "Good morning. Did you receive Palesa's absence note for 4 March?",
    palesa.id,
  );

  const reportCardThread = await parentAsks(
    zanele,
    lethabo.id,
    "Is Palesa's Term 2 report card available yet?",
    palesa.id,
  );

  const immunizationThread = await parentAsks(
    zanele,
    lethabo.id,
    "Do you have Palesa's immunization record on file, or must I bring the clinic card?",
    palesa.id,
  );

  await parentAsks(
    zanele,
    lethabo.id,
    "What is outstanding on the school fees account for this term?",
    katlego.id,
  );

  // A question nothing on file can answer, so it escalates and gives the
  // supervisor demo something waiting in the queue.
  const escalatedChat = await parentAsks(
    zanele,
    lethabo.id,
    "When does the Grade 4 outing to the Union Buildings leave, and what must I pay?",
  );

  const buhle = learnersByName.get("Buhle Mabaso")!;
  const nandi = learnersByName.get("Nandi Ngcobo")!;

  await parentAsks(
    zanele,
    lethabo.id,
    "Buhle's allergy plan — is the EpiPen still kept at the office?",
    buhle.id,
  );
  await parentAsks(
    zanele,
    lethabo.id,
    "How has Nandi's attendance been this term?",
    nandi.id,
  );

  const kagiso = asAuthUser(usersByEmail.get("kagiso.motaung@gmail.demo")!);
  const masibambane = schoolsByKey.get("masibambane")!;
  const sibusiso = learnersByName.get("Sibusiso Mthembu")!;

  await parentAsks(kagiso, masibambane.id, "Please confirm Sibusiso's attendance for March.", sibusiso.id);
  await parentAsks(
    kagiso,
    masibambane.id,
    "Has Sibusiso's Term 1 report card been issued?",
    sibusiso.id,
  );
  const lindiwe = learnersByName.get("Lindiwe Sibanda")!;
  await parentAsks(
    kagiso,
    masibambane.id,
    "Please send Lindiwe's Term 1 report card when it is ready.",
    lindiwe.id,
  );
  const transportThread = await parentAsks(
    kagiso,
    masibambane.id,
    "Which bus route serves Katlehong extension 4, and what time is pick-up?",
  );

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
  await sendStaffReply({
    conversationId: attendanceThread.id,
    schoolId: lethabo.id,
    staffUserId: lerato.id,
    body: "Received and filed, thank you. Palesa is marked as an excused absence for that day.",
    isInternal: false,
  });

  const ayanda = usersByEmail.get("ayanda.khumalo@masibambane.demo")!;
  await sendStaffReply({
    conversationId: transportThread.id,
    schoolId: masibambane.id,
    staffUserId: ayanda.id,
    body: "Route 3 covers extension 4. Pick-up is 06:40 at the Moshoeshoe Road stop.",
    isInternal: false,
  });

  // Threads a parent has finished with, so the list is not uniformly open.
  await resolveConversation(reportCardThread.id, lethabo.id, lerato.id);
  await resolveConversation(immunizationThread.id, lethabo.id, lerato.id);

  // --- Leave the queue realistic: a spread across every status ---------
  //
  // Done per school rather than across the district, so each supervisor sees
  // all three tabs populated — a queue that is entirely New tells a
  // demonstrator nothing about what the other two look like.
  const resolverBySchool: Record<string, string> = {
    [lethabo.id]: lerato.id,
    [masibambane.id]: ayanda.id,
  };

  for (const school of [lethabo, masibambane]) {
    const queue = await prisma.escalation.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: "asc" },
    });

    if (queue.length > 0) {
      await resolveEscalation(
        queue[0].id,
        school.id,
        resolverBySchool[school.id],
        "Confirmed with the class teacher and filed under the right category.",
      );
    }
    // Taken up but not finished: the state a queue spends most of its time in.
    if (queue.length > 2) {
      await prisma.escalation.update({
        where: { id: queue[1].id },
        data: { status: EscalationStatus.IN_PROGRESS },
      });
    }
    if (queue.length > 4) {
      await prisma.escalation.update({
        where: { id: queue[2].id },
        data: { status: EscalationStatus.IN_PROGRESS },
      });
    }
  }

  // --- Summary ---------------------------------------------------------
  const [documentCount, escalationCount, pendingCount, conversationCount, messageCount, categoryCount] =
    await Promise.all([
      prisma.document.count(),
      prisma.escalation.count(),
      prisma.escalation.count({ where: { status: { not: "RESOLVED" } } }),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.documentCategory.count(),
    ]);

  return {
    district: DEMO_DISTRICT,
    schools: DEMO_SCHOOLS.map((school) => school.name),
    learners: LEARNERS.length,
    users: DEMO_PERSONAS.length,
    documents: documentCount,
    categories: categoryCount,
    conversations: conversationCount,
    messages: messageCount,
    escalations: escalationCount,
    openEscalations: pendingCount,
  };
}

export type DemoSeedSummary = Awaited<ReturnType<typeof seedDemoData>>;
