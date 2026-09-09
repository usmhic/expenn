/**
 * REST client for the Expenn .NET Web API.
 *
 * Server components: pass `{ cookie }` from `cookies()` for SSR auth.
 * Client components: call without options — the browser sends the cookie automatically.
 *
 * Usage (server):
 *   import { apiClient } from '@/lib/api-client';
 *   const api = apiClient({ cookie: cookieStore.toString() });
 *   const trips = await api.trips.list();
 *
 * Usage (client):
 *   import { api } from '@/lib/api-client';
 *   const trips = await api.trips.list();
 */

const API_BASE =
  typeof window === 'undefined'
    ? (process.env.DOTNET_API_URL ?? process.env.NEXT_PUBLIC_DOTNET_API_URL ?? 'http://localhost:5000')
    : (process.env.NEXT_PUBLIC_DOTNET_API_URL ?? 'http://localhost:5000');

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions {
  cookie?: string;
  token?: string;
}

function createClient(opts: FetchOptions = {}) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    let url = `${API_BASE}${path}`;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (opts.cookie) headers['Cookie'] = opts.cookie;
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data?.error ?? data?.title ?? `HTTP ${res.status}`);
    }

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  const get = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>('GET', path, undefined, params);
  const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
  const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body);
  const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);
  const del = <T>(path: string) => request<T>('DELETE', path);

  /** multipart/form-data POST — for endpoints bound with [FromForm] (file uploads). */
  async function postForm<T>(path: string, form: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (opts.cookie) headers['Cookie'] = opts.cookie;
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: form,
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data?.error ?? data?.title ?? `HTTP ${res.status}`);
    }

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  return {
    auth: {
      sendOtp: (email: string) => post('/api/auth/send-otp', { email }),
      verifyOtp: (email: string, code: string) => post<AuthResponse>('/api/auth/verify-otp', { email, code }),
      login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }),
      adLogin: (username: string, password: string) => post<AuthResponse>('/api/auth/ad/login', { username, password }),
      me: () => get<MeResponse>('/api/auth/me'),
      logout: () => post('/api/auth/logout'),
      switchOrg: (organizationId: string) => post<AuthResponse>('/api/auth/switch-org', { organizationId }),
    },

    organizations: {
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
      myInvitations: () => get<MyInvitationDto[]>('/api/organizations/invitations/mine'),
      acceptInvitation: (orgId: string, invitationId: string) =>
        post<AuthResponse>(`/api/organizations/${orgId}/invitations/${invitationId}/accept`),

      getTeams: (orgId: string) => get<TeamDto[]>(`/api/organizations/${orgId}/teams`),
      createTeam: (orgId: string, name: string) => post<TeamDto>(`/api/organizations/${orgId}/teams`, { name }),
      getTeamMembers: (orgId: string, teamId: string) => get<TeamMemberDto[]>(`/api/organizations/${orgId}/teams/${teamId}/members`),
      addTeamMember: (orgId: string, teamId: string, userId: string) =>
        post(`/api/organizations/${orgId}/teams/${teamId}/members`, { userId }),
      removeTeamMember: (orgId: string, teamId: string, userId: string) =>
        del(`/api/organizations/${orgId}/teams/${teamId}/members/${userId}`),
    },

    trips: {
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
    },

    expenses: {
      list: (params?: { status?: string; tripId?: string; mine?: boolean }) =>
        get<ExpenseDto[]>('/api/expenses', params),
      getById: (id: string) => get<ExpenseDto>(`/api/expenses/${id}`),
      create: (body: CreateExpenseRequest) => post<ExpenseDto>('/api/expenses', body),
      submit: (id: string) => post<ExpenseDto>(`/api/expenses/${id}/submit`),
      review: (id: string, status: string, notes?: string) =>
        patch<ExpenseDto>(`/api/expenses/${id}/review`, { status, notes }),
      summary: () => get<ExpenseSummaryDto>('/api/expenses/summary'),
    },

    documents: {
      list: (params?: { kind?: string }) => get<DocumentDto[]>('/api/documents', params),
      getById: (id: string) => get<DocumentDto>(`/api/documents/${id}`),
      delete: (id: string) => del(`/api/documents/${id}`),
      /** [FromForm] endpoint — pass fields plus an optional `file` (from a <input type="file">). */
      create: (input: CreateDocumentRequest & { file?: File | null }) => {
        const form = new FormData();
        form.append('title', input.title);
        if (input.kind) form.append('kind', input.kind);
        if (input.tripId) form.append('tripId', input.tripId);
        if (input.issuer) form.append('issuer', input.issuer);
        if (input.holderName) form.append('holderName', input.holderName);
        if (input.documentNumber) form.append('documentNumber', input.documentNumber);
        if (input.issueDate) form.append('issueDate', input.issueDate);
        if (input.expiryDate) form.append('expiryDate', input.expiryDate);
        form.append('isSensitive', String(input.isSensitive ?? false));
        if (input.file) form.append('file', input.file);
        return postForm<DocumentDto>('/api/documents', form);
      },
    },

    comments: {
      listForTrip: (tripId: string) => get<CommentDto[]>('/api/comments', { tripId }),
      create: (expenseId: string, body: string) => post<CommentDto>('/api/comments', { expenseId, body }),
    },

    analytics: {
      overview: (params?: { year?: number; month?: number }) => get('/api/analytics/overview', params),
      spendByGroup: (params?: { year?: number }) => get('/api/analytics/spend-by-group', params),
    },

    search: (q: string) => get('/api/search', { q }),
    notifications: () => get<NotificationsDto>('/api/notifications'),

    storage: {
      /** [FromForm] endpoint — uploads a file (e.g. a receipt) to object storage via the .NET API. */
      upload: (file: File, prefix = 'uploads') => {
        const form = new FormData();
        form.append('file', file);
        return postForm<StorageUploadDto>(`/api/storage/upload?prefix=${encodeURIComponent(prefix)}`, form);
      },
    },
  };
}

/** Pre-built client for browser / client components. Token comes from cookie automatically. */
export const api = createClient();

/** Factory for server components — pass the request cookie string. */
export const apiClient = (opts: FetchOptions) => createClient(opts);

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
  travelerName?: string;
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

export interface NotificationsDto {
  pendingApprovals: number;
  pendingExpenses: number;
}

export interface StorageUploadDto {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface CreateOrgRequest { name: string; slug?: string; accountType?: string; creatorRole?: string }
export interface MyInvitationDto {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
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
export interface CreateDocumentRequest {
  title: string;
  kind?: string;
  tripId?: string;
  issuer?: string;
  holderName?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  isSensitive?: boolean;
}
