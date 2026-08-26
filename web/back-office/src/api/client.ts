// Backend base URL. The trailing slash is stripped because request paths
// already start with one, and a URL copied out of a hosting dashboard
// usually carries it.
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

// Served from a real host but still pointed at the default localhost
// backend — VITE_API_URL was never set for this build, so no request can
// succeed and the reason is worth saying out loud.
const API_URL_UNCONFIGURED =
  !import.meta.env.VITE_API_URL &&
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)

// Deliberately distinct from the mobile app's key: if both apps are ever
// served from one origin they share localStorage, and a parent's token
// must not be picked up by the back-office shell.
const TOKEN_KEY = 'digiscript_backoffice_token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  }

  if (API_URL_UNCONFIGURED) {
    throw new ApiError(
      0,
      'This deployment has no backend configured. Set VITE_API_URL to a reachable DigiScript API and redeploy.',
    )
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, `Can't reach the DigiScript API at ${API_URL}.`)
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json() : undefined

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed with status ${res.status}`)
  }
  return body as T
}

export interface AuthUser {
  id: string
  email: string
  role: string
  name: string
  schoolId?: string | null
  districtId?: string | null
  assignedClassName?: string | null
}

export interface School {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  principalName?: string | null
  district?: { id: string; name: string } | null
  counts: {
    users: number
    students: number
    documents: number
    pendingEscalations: number
  }
}

export interface SchoolStats {
  users: number
  students: number
  documents: number
  pendingEscalations: number
  documentsAwaitingReview: number
}

export interface StaffUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  assignedClassName?: string | null
  lastLoginAt?: string | null
  createdAt?: string
}

export interface Student {
  id: string
  schoolId: string
  name: string
  grade?: string | null
  className?: string | null
  dateOfBirth?: string | null
}

export interface DocumentSummary {
  id: string
  schoolId: string
  originalFilename: string
  status: string
  categoryConfidence: number | null
  categoryReasons?: string[] | null
  folderPath?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  studentId?: string | null
  createdAt: string
  category?: { id: string; name: string } | null
}

export interface Escalation {
  id: string
  schoolId: string
  documentId: string | null
  conversationId: string | null
  studentId: string | null
  reasonType: string
  reason: string
  aiConfidence: number | null
  status: string
  createdAt: string
  resolvedAt: string | null
}

export interface AuditEntry {
  id: string
  actorUserId: string | null
  schoolId: string | null
  action: string
  targetType: string | null
  targetId: string | null
  metadata?: unknown
  createdAt: string
}

export interface DemoPersonaUser {
  name: string
  email: string
  password: string
  subtitle: string
}

export interface DemoPersonaGroup {
  role: string
  label: string
  blurb: string
  users: DemoPersonaUser[]
}

export const api = {
  /**
   * Demo sign-in picker. Returns 404 when the API has DEMO_MODE off, which
   * is how the login screen decides whether to offer it at all.
   */
  demoPersonas: (app: 'mobile' | 'back-office') =>
    request<{ demoMode: boolean; groups: DemoPersonaGroup[] }>(`/demo/personas?app=${app}`),

  login: (email: string, password: string) =>
    request<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: AuthUser }>('/auth/me'),

  listSchools: () => request<{ schools: School[] }>('/schools'),

  schoolStats: (schoolId: string) => request<{ stats: SchoolStats }>(`/schools/${schoolId}/stats`),

  listUsers: (schoolId: string) => request<{ users: StaffUser[] }>(`/users?schoolId=${schoolId}`),

  createUser: (input: {
    schoolId: string
    name: string
    email: string
    role: string
    temporaryPassword: string
    assignedClassName?: string
  }) => request<{ user: StaffUser }>('/users', { method: 'POST', body: JSON.stringify(input) }),

  deactivateUser: (userId: string, schoolId: string) =>
    request<{ user: { id: string; status: string } }>(`/users/${userId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ schoolId }),
    }),

  listStudents: (schoolId: string) => request<{ students: Student[] }>(`/students?schoolId=${schoolId}`),

  getStudent: (studentId: string) => request<{ student: Student }>(`/students/${studentId}`),

  listDocuments: (schoolId: string, params: { studentId?: string; status?: string } = {}) => {
    const qs = new URLSearchParams({ schoolId })
    if (params.studentId) qs.set('studentId', params.studentId)
    if (params.status) qs.set('status', params.status)
    return request<{ documents: DocumentSummary[] }>(`/documents?${qs.toString()}`)
  },

  getDocument: (documentId: string, schoolId: string) =>
    request<{ document: DocumentSummary }>(`/documents/${documentId}?schoolId=${schoolId}`),

  uploadDocument: (form: FormData) => request<{ document: DocumentSummary }>('/documents', { method: 'POST', body: form }),

  confirmDocumentCategory: (documentId: string, schoolId: string, category: string) =>
    request<{ document: DocumentSummary }>(`/documents/${documentId}/confirm-category`, {
      method: 'POST',
      body: JSON.stringify({ schoolId, category }),
    }),

  listEscalations: (schoolId: string, status?: string) => {
    const qs = new URLSearchParams({ schoolId })
    if (status) qs.set('status', status)
    return request<{ escalations: Escalation[] }>(`/escalations?${qs.toString()}`)
  },

  resolveEscalation: (escalationId: string, schoolId: string, resolutionNotes?: string) =>
    request<{ escalation: Escalation }>(`/escalations/${escalationId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ schoolId, resolutionNotes }),
    }),

  listAudit: (params: { schoolId?: string; action?: string; targetType?: string } = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) qs.set(key, value)
    })
    const suffix = qs.toString()
    return request<{ entries: AuditEntry[] }>(`/audit${suffix ? `?${suffix}` : ''}`)
  },
}
