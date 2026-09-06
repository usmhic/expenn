/**
 * Typed REST client for the Expenn .NET API.
 * Replaces the tRPC client — all calls go to the .NET Web API.
 */
import { getStoredSession } from './session';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.expenn.osas.cloud').replace(/\/+$/, '');

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
  const session = await getStoredSession();
  const { params, ...init } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error ?? body?.title ?? `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const get = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
  apiFetch<T>(path, { method: 'GET', params });

const post = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

const put = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });

const patch = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });

const del = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  sendOtp: (email: string) => post('/api/auth/send-otp', { email }),
  verifyOtp: (email: string, code: string) => post<AuthResponse>('/api/auth/verify-otp', { email, code }),
  login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }),
  adLogin: (username: string, password: string) => post<AuthResponse>('/api/auth/ad/login', { username, password }),
  me: () => get<MeResponse>('/api/auth/me'),
  logout: () => post('/api/auth/logout'),
  switchOrg: (organizationId: string) => post<AuthResponse>('/api/auth/switch-org', { organizationId }),
};

// ── Organizations ─────────────────────────────────────────────────────────────

export const organizations = {
  list: () => get<OrgDto[]>('/api/organizations'),
  create: (body: CreateOrgRequest) => post<OrgDto>('/api/organizations', body),
  getBySlug: (slug: string) => get<OrgDto>(`/api/organizations/${slug}`),

  getMembers: (orgId: string) => get<MemberDto[]>(`/api/organizations/${orgId}/members`),
  updateMemberRole: (orgId: string, memberId: string, role: string) =>
    patch(`/api/organizations/${orgId}/members/${memberId}/role`, { role }),
  removeMember: (orgId: string, memberId: string) => del(`/api/organizations/${orgId}/members/${memberId}`),

  getInvitations: (orgId: string) => get<InvitationDto[]>(`/api/organizations/${orgId}/invitations`),
  inviteMember: (orgId: string, email: string, role: string) =>
    post<InvitationDto>(`/api/organizations/${orgId}/invitations`, { email, role }),
  cancelInvitation: (orgId: string, invitationId: string) =>
    del(`/api/organizations/${orgId}/invitations/${invitationId}`),

  getTeams: (orgId: string) => get<TeamDto[]>(`/api/organizations/${orgId}/teams`),
  createTeam: (orgId: string, name: string) => post<TeamDto>(`/api/organizations/${orgId}/teams`, { name }),
  getTeamMembers: (orgId: string, teamId: string) => get<TeamMemberDto[]>(`/api/organizations/${orgId}/teams/${teamId}/members`),
  addTeamMember: (orgId: string, teamId: string, userId: string) =>
    post(`/api/organizations/${orgId}/teams/${teamId}/members`, { userId }),
  removeTeamMember: (orgId: string, teamId: string, userId: string) =>
    del(`/api/organizations/${orgId}/teams/${teamId}/members/${userId}`),
};

// ── Trips ─────────────────────────────────────────────────────────────────────

export const trips = {
  list: (params?: { status?: string; teamId?: string; mine?: boolean }) =>
    get<TripDto[]>('/api/trips', params),
  getById: (id: string) => get<TripDto>(`/api/trips/${id}`),
  create: (body: CreateTripRequest) => post<TripDto>('/api/trips', body),
  updateStatus: (id: string, status: string) => patch<TripDto>(`/api/trips/${id}/status`, { status }),

  getTravelers: (tripId: string) => get<TripTravelerDto[]>(`/api/trips/${tripId}/travelers`),
  assignTravelers: (tripId: string, travelerUserIds: string[]) =>
    put(`/api/trips/${tripId}/travelers`, { travelerUserIds }),

  getApprovals: (params?: { tripId?: string; mine?: boolean; status?: string }) =>
    get<ApprovalDto[]>('/api/trips/approvals', params),
  requestApproval: (tripId: string, body: { purpose?: string; notes?: string }) =>
    post<ApprovalDto>(`/api/trips/${tripId}/approvals`, body),
  reviewApproval: (approvalId: string, status: 'approved' | 'rejected') =>
    patch<ApprovalDto>(`/api/trips/approvals/${approvalId}`, { status }),
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export const expenses = {
  list: (params?: { status?: string; tripId?: string; mine?: boolean }) =>
    get<ExpenseDto[]>('/api/expenses', params),
  getById: (id: string) => get<ExpenseDto>(`/api/expenses/${id}`),
  create: (body: CreateExpenseRequest) => post<ExpenseDto>('/api/expenses', body),
  submit: (id: string) => post<ExpenseDto>(`/api/expenses/${id}/submit`),
  review: (id: string, status: string, notes?: string) =>
    patch<ExpenseDto>(`/api/expenses/${id}/review`, { status, notes }),
  summary: () => get<ExpenseSummaryDto>('/api/expenses/summary'),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const documents = {
  list: (params?: { kind?: string }) => get<DocumentDto[]>('/api/documents', params),
  getById: (id: string) => get<DocumentDto>(`/api/documents/${id}`),
  delete: (id: string) => del(`/api/documents/${id}`),
  create: (input: {
    title: string;
    kind?: string;
    isSensitive?: boolean;
    tripId?: string;
    file?: { uri: string; name: string; type: string };
  }) => createDocument(input),
};

// The .NET create-document endpoint takes multipart/form-data, not JSON —
// it needs its own fetch instead of the shared apiFetch()/post() helpers.
async function createDocument(input: {
  title: string;
  kind?: string;
  isSensitive?: boolean;
  tripId?: string;
  file?: { uri: string; name: string; type: string };
}): Promise<DocumentDto> {
  const session = await getStoredSession();

  const body = new FormData();
  body.append('title', input.title);
  if (input.kind) body.append('kind', input.kind);
  body.append('isSensitive', String(input.isSensitive ?? false));
  if (input.tripId) body.append('tripId', input.tripId);
  if (input.file) body.append('file', input.file as any);

  const res = await fetch(`${API_URL}/api/documents`, {
    method: 'POST',
    headers: {
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data?.error ?? data?.title ?? 'Could not create document');
  }

  return res.json() as Promise<DocumentDto>;
}

// ── Comments ──────────────────────────────────────────────────────────────────

export const comments = {
  listForTrip: (tripId: string) => get<CommentDto[]>('/api/comments', { tripId }),
  create: (expenseId: string, body: string) => post<CommentDto>('/api/comments', { expenseId, body }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analytics = {
  overview: (params?: { year?: number; month?: number }) => get('/api/analytics/overview', params),
  spendByGroup: (params?: { year?: number }) => get('/api/analytics/spend-by-group', params),
};

// ── Misc ──────────────────────────────────────────────────────────────────────

export const search = (q: string) => get('/api/search', { q });
export const notifications = () => get<{ pendingApprovals: number; pendingExpenses: number }>('/api/notifications');
export const myOrgs = () => get<OrgDto[]>('/api/organizations');

// ── File Upload ───────────────────────────────────────────────────────────────

export async function uploadFile(uri: string, fileName: string, mimeType: string, prefix = 'uploads') {
  const session = await getStoredSession();

  const body = new FormData();
  body.append('file', { uri, name: fileName, type: mimeType } as any);

  const res = await fetch(`${API_URL}/api/storage/upload?prefix=${prefix}`, {
    method: 'POST',
    headers: {
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data?.error ?? 'Upload failed');
  }

  return res.json() as Promise<{ key: string; url: string; size: number; mimeType: string }>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: { id: string; name: string; email: string; image?: string; emailVerified: boolean };
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  image?: string;
  activeOrganizationId?: string;
  activeOrganizationName?: string;
  activeOrganizationSlug?: string;
  organizationRole?: string;
}

export interface OrgDto {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  accountType: string;
  plan: string;
  billingStatus: string;
  paidSeats: number;
  createdAt: string;
}

export interface MemberDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  createdAt: string;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface TeamDto {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
}

export interface TeamMemberDto {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  email: string;
}

export interface TripDto {
  id: string;
  organizationId: string;
  teamId?: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripTravelerDto {
  id: string;
  tripId: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ApprovalDto {
  id: string;
  organizationId: string;
  tripId: string;
  tripName: string;
  destination: string;
  userId: string;
  travelerName: string;
  travelerEmail: string;
  status: string;
  purpose?: string;
  notes?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ExpenseDto {
  id: string;
  organizationId: string;
  userId: string;
  tripId?: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string;
  receiptFileUrl?: string;
  status: string;
  notes?: string;
  paymentMethod?: string;
  reimbursable: boolean;
  createdAt: string;
  updatedAt: string;
  tripName?: string;
}

export interface ExpenseSummaryDto {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  reimbursed: number;
  totalAmount: number;
}

export interface DocumentDto {
  id: string;
  organizationId: string;
  userId: string;
  tripId?: string;
  title: string;
  kind: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  issuer?: string;
  holderName?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  isSensitive: boolean;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  expenseId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CreateOrgRequest {
  name: string;
  slug: string;
  accountType?: string;
}

export interface CreateTripRequest {
  teamId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  status?: string;
  travelerUserIds?: string[];
}

export interface CreateExpenseRequest {
  tripId?: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string;
  notes?: string;
  paymentMethod?: string;
  reimbursable?: boolean;
  receiptFileUrl?: string;
}
