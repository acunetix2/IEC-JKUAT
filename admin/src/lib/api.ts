import { getSupabase } from './supabase';
import type {
  AdminAccount, AdminAuditLog, AdminProfile, AdminRole, ContactMessage, DashboardData, EventRecord, Executive, Member, PaginatedMembers,
  MerchOrder, MerchOrderStatus, Payment, ProductRecord, Project, UploadTicket,
} from '../types';

async function request<T>(action: string, values: Record<string, unknown> = {}): Promise<T> {
  const client = getSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData.session;
  if (!session) throw new Error('Your session has expired. Sign in again.');

  const { data, error } = await client.functions.invoke('admin-api', {
    body: { action, ...values },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    let detail = '';
    const context = error.context;
    if (context instanceof Response) {
      try {
        const responseBody = await context.clone().json() as { error?: string };
        detail = responseBody.error || '';
      } catch {
        detail = '';
      }
    }
    throw new Error(detail || error.message || 'The admin request failed.');
  }
  if (data?.error) throw new Error(String(data.error));
  return data?.data as T;
}

export const adminApi = {
  currentAdmin: () => request<AdminProfile>('current-admin'),
  dashboard: () => request<DashboardData>('dashboard'),
  admins: () => request<AdminAccount[]>('list-admins'),
  auditLog: () => request<AdminAuditLog[]>('list-audit-log'),
  updateAdminRole: (userId: string, role: AdminRole) =>
    request<AdminAccount>('update-admin-role', { user_id: userId, role }),
  members: (page = 0, search = '', status = 'all') =>
    request<PaginatedMembers>('list-members', { page, search, status }),
  payments: () => request<Payment[]>('list-payments'),
  updateMember: (id: string, updates: Partial<Member>) =>
    request<Member>('update-member', { id, updates }),
  deleteMember: (id: string) => request<{ id: string }>('delete-member', { id }),
  projects: () => request<Project[]>('list-projects'),
  saveProject: (project: Omit<Project, 'created_at'>) =>
    request<Project>('save-project', { project }),
  deleteProject: (id: string) => request<{ id: string }>('delete-project', { id }),
  events: () => request<EventRecord[]>('list-events'),
  saveEvent: (event: Omit<EventRecord, 'created_at'>) => request<EventRecord>('save-event', { event }),
  deleteEvent: (id: string) => request<{ id: string }>('delete-event', { id }),
  products: () => request<ProductRecord[]>('list-products'),
  merchOrders: () => request<MerchOrder[]>('list-merch-orders'),
  updateMerchOrderStatus: (id: string, status: MerchOrderStatus) =>
    request<MerchOrder>('update-merch-order-status', { id, status }),
  saveProduct: (product: Omit<ProductRecord, 'created_at'>) => request<ProductRecord>('save-product', { product }),
  deleteProduct: (id: string) => request<{ id: string }>('delete-product', { id }),
  messages: () => request<ContactMessage[]>('list-messages'),
  updateMessage: (id: string, isRead: boolean) =>
    request<ContactMessage>('update-message', { id, isRead }),
  deleteMessage: (id: string) => request<{ id: string }>('delete-message', { id }),
  executives: () => request<Executive[]>('list-executives'),
  saveExecutive: (executive: Omit<Executive, 'created_at' | 'updated_at'>) =>
    request<Executive>('save-executive', { executive }),
  deleteExecutive: (id: string) => request<{ id: string }>('delete-executive', { id }),
  createUpload: (kind: 'executive' | 'project' | 'product' | 'event', entityId: string, file: File) =>
    request<UploadTicket>('create-upload', {
      kind,
      entityId,
      contentType: file.type,
      sizeBytes: file.size,
    }),
};

export async function uploadImage(ticket: UploadTicket, file: File): Promise<void> {
  const { error } = await getSupabase().storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
}

export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = getSupabase().storage
    .from(path.startsWith('executives/') ? 'iec-executive-profiles' : 'project-media')
    .getPublicUrl(path);
  return data.publicUrl;
}
