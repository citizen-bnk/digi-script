import { Role } from "@prisma/client";

/**
 * The demo cast, defined once and consumed by both `prisma/seed.ts` (which
 * creates these accounts) and `GET /demo/personas` (which offers them to the
 * demonstrator for one-click sign-in). Keeping them in one list is what stops
 * the login picker from advertising an account the seed never created.
 *
 * Setting is a South African school district: two schools in Gauteng, SA
 * grades and school terms, Rand amounts, and learner/staff names drawn from
 * several South African language groups.
 */

/** Every demo account shares this password — it is not a secret in demo mode. */
export const DEMO_PASSWORD = "Demo1234!";

export const DEMO_DISTRICT = "Gauteng East Education District";

export type SchoolKey = "lethabo" | "masibambane";

export interface DemoSchool {
  key: SchoolKey;
  name: string;
  address: string;
  phone: string;
  principalName: string;
}

export const DEMO_SCHOOLS: DemoSchool[] = [
  {
    key: "lethabo",
    name: "Lethabo Primary School",
    address: "27 Ndlovu Street, Tembisa, Gauteng",
    phone: "+27 11 924 0117",
    principalName: "Thandiwe Mokoena",
  },
  {
    key: "masibambane",
    name: "Masibambane Secondary School",
    address: "14 Moshoeshoe Road, Katlehong, Gauteng",
    phone: "+27 11 860 3342",
    principalName: "Bongani Zulu",
  },
];

export interface DemoPersona {
  email: string;
  name: string;
  role: Role;
  /** Shown under the name on the picker card, so a demonstrator can tell the two apart at a glance. */
  subtitle: string;
  /** Omitted for district-level accounts, which belong to no single school. */
  schoolKey?: SchoolKey;
  /** Set for the class-scoped staff; leaving it off is what makes a supervisor school-wide. */
  assignedClassName?: string;
  /** Matches a seeded Student by name, for STUDENT logins. */
  studentName?: string;
}

/** Which app each role signs into, so a picker only offers what it can serve. */
export const MOBILE_APP_ROLES: Role[] = [Role.PARENT, Role.TEACHER, Role.SUPERVISOR, Role.STUDENT];
export const BACK_OFFICE_ROLES: Role[] = [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPPORT];

/** Human labels and an ordering for the role list the demonstrator sees first. */
export const ROLE_PRESENTATION: Record<Role, { label: string; blurb: string; order: number }> = {
  [Role.SYSTEM_OWNER]: {
    label: "District Office",
    blurb: "Oversight across every school in the district",
    order: 1,
  },
  [Role.SUPER_USER]: {
    label: "Principal",
    blurb: "Runs one school: documents, staff, learners",
    order: 2,
  },
  [Role.SUPERVISOR]: {
    label: "Supervisor / Nurse",
    blurb: "Handles escalations and reviews documents",
    order: 3,
  },
  [Role.TEACHER]: {
    label: "Teacher",
    blurb: "Their class register and read-only documents",
    order: 4,
  },
  [Role.PARENT]: {
    label: "Parent",
    blurb: "Asks about their own child and nothing else",
    order: 5,
  },
  [Role.STUDENT]: {
    label: "Learner",
    blurb: "Read-only view of their own record",
    order: 6,
  },
  [Role.SUPPORT]: {
    label: "Support Desk",
    blurb: "Escalations and the audit trail only",
    order: 7,
  },
};

export const DEMO_PERSONAS: DemoPersona[] = [
  // --- District office -------------------------------------------------
  {
    email: "nomsa.dlamini@gauteng-east.demo",
    name: "Nomsa Dlamini",
    role: Role.SYSTEM_OWNER,
    subtitle: "District Director — sees both schools",
  },
  {
    email: "sipho.nkosi@gauteng-east.demo",
    name: "Sipho Nkosi",
    role: Role.SYSTEM_OWNER,
    subtitle: "District Finance Lead",
  },

  // --- Principals ------------------------------------------------------
  {
    email: "thandiwe.mokoena@lethabo.demo",
    name: "Thandiwe Mokoena",
    role: Role.SUPER_USER,
    subtitle: "Principal, Lethabo Primary",
    schoolKey: "lethabo",
  },
  {
    email: "bongani.zulu@masibambane.demo",
    name: "Bongani Zulu",
    role: Role.SUPER_USER,
    subtitle: "Principal, Masibambane Secondary",
    schoolKey: "masibambane",
  },

  // --- Supervisors. One class-scoped, one school-wide, which is the
  //     clearest way to show the scoping rule during a demo.
  {
    email: "lerato.molefe@lethabo.demo",
    name: "Lerato Molefe",
    role: Role.SUPERVISOR,
    subtitle: "Grade 4A only — class-scoped",
    schoolKey: "lethabo",
    assignedClassName: "Grade 4A",
  },
  {
    email: "ayanda.khumalo@masibambane.demo",
    name: "Ayanda Khumalo",
    role: Role.SUPERVISOR,
    subtitle: "School nurse — whole school, no class",
    schoolKey: "masibambane",
  },

  // --- Teachers --------------------------------------------------------
  {
    email: "tshepo.radebe@lethabo.demo",
    name: "Tshepo Radebe",
    role: Role.TEACHER,
    subtitle: "Grade 4A register teacher",
    schoolKey: "lethabo",
    assignedClassName: "Grade 4A",
  },
  {
    email: "naledi.sithole@masibambane.demo",
    name: "Naledi Sithole",
    role: Role.TEACHER,
    subtitle: "Grade 10B register teacher",
    schoolKey: "masibambane",
    assignedClassName: "Grade 10B",
  },

  // --- Parents ---------------------------------------------------------
  {
    email: "zanele.mahlangu@gmail.demo",
    name: "Zanele Mahlangu",
    role: Role.PARENT,
    subtitle: "Two learners at Lethabo Primary",
    schoolKey: "lethabo",
  },
  {
    email: "kagiso.motaung@gmail.demo",
    name: "Kagiso Motaung",
    role: Role.PARENT,
    subtitle: "One learner at Masibambane",
    schoolKey: "masibambane",
  },

  // --- Learners --------------------------------------------------------
  {
    email: "palesa.ndlovu@lethabo.demo",
    name: "Palesa Ndlovu",
    role: Role.STUDENT,
    subtitle: "Grade 4A learner",
    schoolKey: "lethabo",
    studentName: "Palesa Ndlovu",
  },
  {
    email: "sibusiso.mthembu@masibambane.demo",
    name: "Sibusiso Mthembu",
    role: Role.STUDENT,
    subtitle: "Grade 10B learner",
    schoolKey: "masibambane",
    studentName: "Sibusiso Mthembu",
  },

  // --- Support desk ----------------------------------------------------
  {
    email: "refilwe.sebe@gauteng-east.demo",
    name: "Refilwe Sebe",
    role: Role.SUPPORT,
    subtitle: "Support desk, Lethabo Primary",
    schoolKey: "lethabo",
  },
  {
    email: "themba.cele@gauteng-east.demo",
    name: "Themba Cele",
    role: Role.SUPPORT,
    subtitle: "Support desk, Masibambane",
    schoolKey: "masibambane",
  },
];

/** Groups personas by role, ordered for display, filtered to one app's roles. */
export function personasForRoles(roles: Role[]) {
  return roles
    .map((role) => ({
      role,
      ...ROLE_PRESENTATION[role],
      users: DEMO_PERSONAS.filter((persona) => persona.role === role).map((persona) => ({
        name: persona.name,
        email: persona.email,
        password: DEMO_PASSWORD,
        subtitle: persona.subtitle,
      })),
    }))
    .filter((group) => group.users.length > 0)
    .sort((a, b) => a.order - b.order);
}
