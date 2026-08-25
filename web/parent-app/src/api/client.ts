// Backend base URL. Defaults to localhost for same-machine testing; when
// testing from a phone on the same network, override with the dev
// machine's LAN IP in a .env.local file (see README "Testing on a phone").
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getToken(): string | null {
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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
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
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: AuthUser }>('/auth/me'),

  myChildren: () =>
    request<{ children: Array<Record<string, unknown> & { id: string; name: string }> }>('/students/my-children'),

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
