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

/** Fired when the server rejects the stored token, so the app can sign out. */
export const UNAUTHORIZED_EVENT = 'digiscript:unauthorized'

/** Endpoints where a 401 means "wrong credentials", not "session over". */
function isSignInPath(path: string): boolean {
  return path.startsWith('/auth/login') || path.startsWith('/demo/login')
}

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

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : undefined

  if (!res.ok) {
    // A rejected token mid-session used to leave the app signed in and
    // broken: /auth/me clears a bad token on load, but nothing handled one
    // going stale afterwards, so every later action failed with "Invalid or
    // expired token" and no route back to the sign-in screen. A secret
    // rotated on the server does exactly this to everyone already signed in.
    //
    // Sign-in itself is exempt: a 401 there means the password was wrong,
    // not that a session ended.
    if (res.status === 401 && !isSignInPath(path)) {
      setToken(null)
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }

    // Some endpoints send a `reason` alongside `error`: the short sentence is
    // for the screen, the reason is what makes the failure actionable. Losing
    // it left "Internal server error" as the whole of what a user could see.
    const message = body?.error ?? describeNonJson(res, contentType)
    throw new ApiError(res.status, body?.reason ? `${message} ${body.reason}` : message)
  }

  // A 2xx that is not JSON is not a success we can use. This happens when
  // something answers on the API's behalf — an access-protection wall, a
  // proxy error page, or a rewrite that fell through to the SPA shell — and
  // returning `undefined` here made that indistinguishable from an empty
  // result, so callers rendered nothing and reported no error.
  if (!isJson) {
    throw new ApiError(res.status, describeNonJson(res, contentType))
  }

  return body as T
}

/**
 * Names the likely cause when the API answers with something other than
 * JSON. The HTML case is worth calling out by name: a login or access wall
 * in front of the deployment intercepts every request, and its page looks
 * nothing like an API failure until you read the content type.
 */
function describeNonJson(res: Response, contentType: string): string {
  // 405 is diagnostic gold: our API implements the methods it exposes, so a
  // rejected method means the request never reached it. Static file hosting
  // allows GET and HEAD only, which is exactly what answers when the /api
  // rewrite fails and the path falls through to the static build.
  if (res.status === 405) {
    return `The API rejected the request method (HTTP 405), which means it was answered by static file hosting rather than the API itself — the /api route is not reaching the serverless function.`
  }
  if (contentType.includes('text/html')) {
    return `The API returned a web page instead of data (HTTP ${res.status}). Something is answering in front of it — most often deployment access protection, which has to be turned off or bypassed for ${API_URL} to be reachable.`
  }
  return `The API returned ${contentType || 'an unknown content type'} instead of data (HTTP ${res.status}).`
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
  demoModeEnabled: boolean
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
  subtitle: string
  /** null for district staff, who belong to no single school. */
  schoolKey: string | null
  schoolName: string | null
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
    request<{
      demoMode: boolean
      /** Whether the demo district exists yet — an empty group list means
       *  something different before and after seeding. */
      seeded: boolean
      schools: { key: string; name: string; seeded: boolean; demoModeEnabled: boolean }[]
      groups: DemoPersonaGroup[]
    }>(`/demo/personas?app=${app}`),

  /**
   * Loads the demo district. Open only while the database is empty, which is
   * how the login screen can offer it as a one-click bootstrap.
   */
  seedDemo: () => request<{ seeded: boolean }>('/demo/seed', { method: 'POST' }),

  /**
   * Signs in a demo persona by email alone — the server holds the demo
   * password, so no credential is ever sent to or held by this app.
   */
  demoLogin: (email: string) =>
    request<{ user: AuthUser; token: string }>('/demo/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (email: string, password: string) =>
    request<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: AuthUser }>('/auth/me'),

  listSchools: () => request<{ schools: School[] }>('/schools'),

  schoolStats: (schoolId: string) => request<{ stats: SchoolStats }>(`/schools/${schoolId}/stats`),

  /** SYSTEM_OWNER only: turns one school's demo logins on or off. */
  setSchoolDemoMode: (schoolId: string, enabled: boolean) =>
    request<{ school: { id: string; name: string; demoModeEnabled: boolean } }>(
      `/schools/${schoolId}/demo-mode`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) },
    ),

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
