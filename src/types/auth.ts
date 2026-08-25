import type { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  schoolId: string | null;
  districtId: string | null;
  email: string;
  assignedClassName: string | null;
  // Set only for role STUDENT: the one Student record this login may view.
  studentId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
