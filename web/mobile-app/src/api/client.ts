// Backend base URL. Defaults to localhost for same-machine testing; when
// testing from a phone on the same network, override with the dev
// machine's LAN IP in a .env.local file (see README "Testing on a phone").
// The trailing slash is stripped because request paths already start with
// one, and a URL copied out of a hosting dashboard usually carries it —
// which would otherwise produce "https://host//auth/login".
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

// True when the app is served from a real host but is still pointed at the
// default localhost backend — i.e. VITE_API_URL was never set for this build,
// so no request can possibly succeed and the reason is worth saying out loud
// rather than surfacing as a generic network failure.
const API_URL_UNCONFIGURED =
  !import.meta.env.VITE_API_URL &&
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem('digiscript_token')
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('digiscript_token', token)
  } else {
    localStorage.removeItem('digiscript_token')
  }
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

  // A network-level failure (backend down, wrong host, blocked mixed content)
  // rejects with a TypeError, which would otherwise reach the UI as an opaque
  // "something went wrong" — name the address we actually tried instead.
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
    throw new ApiError(res.status, body?.error ?? describeNonJson(res, contentType))
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
  assignedClassName?: string | null
  studentId?: string | null
}

export interface Student {
  id: string
  schoolId: string
  name: string
  grade?: string | null
  className?: string | null
  dateOfBirth?: string | null
  relationship?: string
}

export interface DocumentSummary {
  id: string
  studentId: string | null
  originalFilename: string
  status: 'PENDING_REVIEW' | 'CATEGORIZED' | 'ESCALATED' | 'ARCHIVED'
  categoryConfidence: number | null
  categoryReasons: string[] | null
  folderPath: string | null
  createdAt: string
  category?: { name: string } | null
  student?: { id: string; name: string } | null
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
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
  resolutionNotes: string | null
  createdAt: string
  resolvedAt: string | null
  document?: DocumentSummary | null
  student?: { id: string; name: string } | null
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

  myChildren: () =>
    request<{ children: Array<Record<string, unknown> & { id: string; name: string }> }>('/students/my-children'),

  listStudents: (schoolId: string) => request<{ students: Student[] }>(`/students?schoolId=${schoolId}`),

  myOwnStudentRecord: () => request<{ student: Student }>('/students/me'),

  getStudent: (studentId: string) => request<{ student: Student }>(`/students/${studentId}`),

  listConversations: (schoolId: string) =>
    request<{ conversations: Conversation[] }>(`/conversations?schoolId=${schoolId}`),

  startConversation: (schoolId: string, studentId?: string) =>
    request<{ conversation: Conversation }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ schoolId, studentId }),
    }),

  getConversation: (conversationId: string, schoolId: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(
      `/conversations/${conversationId}?schoolId=${schoolId}`,
    ),

  sendMessage: (conversationId: string, schoolId: string, body: string) =>
    request<{ parentMessage: Message; aiMessage: Message; escalated: boolean }>(
      `/conversations/${conversationId}/messages`,
      { method: 'POST', body: JSON.stringify({ schoolId, body }) },
    ),

  sendStaffReply: (conversationId: string, schoolId: string, body: string, isInternal: boolean) =>
    request<{ message: Message }>(`/conversations/${conversationId}/staff-reply`, {
      method: 'POST',
      body: JSON.stringify({ schoolId, body, isInternal }),
    }),

  resolveConversation: (conversationId: string, schoolId: string) =>
    request<{ conversation: Conversation }>(`/conversations/${conversationId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ schoolId }),
    }),

  listDocuments: (schoolId: string, params: { studentId?: string; status?: string } = {}) => {
    const qs = new URLSearchParams({ schoolId, ...params } as Record<string, string>)
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
    const qs = new URLSearchParams({ schoolId, ...(status ? { status } : {}) })
    return request<{ escalations: Escalation[] }>(`/escalations?${qs.toString()}`)
  },

  resolveEscalation: (escalationId: string, schoolId: string, resolutionNotes: string) =>
    request<{ escalation: Escalation }>(`/escalations/${escalationId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ schoolId, resolutionNotes }),
    }),
}

export interface Conversation {
  id: string
  schoolId: string
  studentId: string | null
  status: 'OPEN' | 'ESCALATED' | 'RESOLVED'
  channel: string
  createdAt: string
  updatedAt: string
  student?: { id: string; name: string } | null
}

export interface Message {
  id: string
  conversationId: string
  senderType: 'PARENT' | 'AI' | 'STAFF'
  senderUserId: string | null
  body: string
  confidence: number | null
  isInternal: boolean
  createdAt: string
}
