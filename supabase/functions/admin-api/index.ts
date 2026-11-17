import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const OWNER_ONLY_ACTIONS = new Set(['list-admins', 'list-audit-log', 'update-admin-role']);
const ORDER_ACTIONS = new Set(['list-merch-orders', 'update-merch-order-status']);
const CONTENT_ACTIONS = new Set([
  'list-projects', 'save-project', 'delete-project',
  'list-events', 'save-event', 'delete-event',
  'list-products', 'save-product', 'delete-product',
  'list-executives', 'save-executive', 'delete-executive',
]);
const KNOWN_ACTIONS = new Set([
  'current-admin', 'dashboard', 'list-members', 'list-payments', 'update-member', 'delete-member',
  ...CONTENT_ACTIONS, 'list-messages', 'update-message', 'delete-message', 'create-upload',
  ...ORDER_ACTIONS,
  ...OWNER_ONLY_ACTIONS,
]);
const AUDITED_ACTIONS = new Set([
  'update-member', 'delete-member', 'save-event', 'delete-event', 'save-product', 'delete-product',
  'update-message', 'delete-message', 'save-project', 'delete-project', 'save-executive', 'delete-executive',
  'update-merch-order-status',
]);

const ALLOWED_ORIGINS = new Set([
  'https://iecjkuat.com',
  'https://www.iecjkuat.com',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  ...(Deno.env.get('EXTRA_CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

function headersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function respond(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Unexpected admin service error.';
}

function text(value: unknown, label: string, maxLength: number, required = false): string {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${label} is required.`);
    return '';
  }
  const result = value.trim();
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return result;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new Error(`Invalid ${label}.`);
  return value;
}

function safeSearch(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9@.+\- ]/g, '').trim().slice(0, 80);
}

async function dashboard(db: ReturnType<typeof createClient>) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 5, 1);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffDate = cutoff.toISOString();

  const [members, activeMembers, projects, payments, recentMembers, recentPayments] = await Promise.all([
    db.from('members').select('id', { count: 'exact', head: true }),
    db.from('members').select('id', { count: 'exact', head: true }).eq('membership_status', 'active'),
    db.from('projects').select('id', { count: 'exact', head: true }),
    db.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'completed'),
    db.from('members').select('created_at').gte('created_at', cutoffDate).order('created_at').limit(10000),
    db.from('payments').select('created_at, amount, payment_status').gte('created_at', cutoffDate).order('created_at').limit(10000),
  ]);
  for (const result of [members, activeMembers, projects, payments, recentMembers, recentPayments]) {
    if (result.error) throw result.error;
  }

  const monthly = new Map<string, { month: string; period: string; members: number; payments: number; collected: number }>();
  const cursor = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
  for (let i = 0; i < 6; i += 1) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    monthly.set(key, {
      month: cursor.toLocaleString('en', { month: 'short' }),
      period: key,
      members: 0,
      payments: 0,
      collected: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const member of recentMembers.data || []) {
    const key = String(member.created_at || '').slice(0, 7);
    const month = monthly.get(key);
    if (month) month.members += 1;
  }
  for (const payment of recentPayments.data || []) {
    const key = String(payment.created_at || '').slice(0, 7);
    const month = monthly.get(key);
    if (month && payment.payment_status === 'completed') {
      month.payments += 1;
      month.collected += Number(payment.amount) || 0;
    }
  }

  const publishedProjects = await db.from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  if (publishedProjects.error) throw publishedProjects.error;

  return {
    members: members.count || 0,
    activeMembers: activeMembers.count || 0,
    completedPayments: payments.count || 0,
    projects: projects.count || 0,
    publishedProjects: publishedProjects.count || 0,
    collectedLastSixMonths: [...monthly.values()].reduce((total, item) => total + item.collected, 0),
    monthly: [...monthly.values()],
  };
}

async function handleAction(
  db: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  admin: { user_id: string; email: string; role: string },
) {
  switch (body.action) {
    case 'current-admin':
      return admin;

    case 'dashboard':
      return dashboard(db);

    case 'list-admins': {
      const { data, error } = await db.from('admins')
        .select('user_id, email, role, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'list-audit-log': {
      const { data, error } = await db.from('admin_audit_logs')
        .select('id, actor_user_id, actor_email, action, resource_type, resource_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    }

    case 'update-admin-role': {
      const targetUserId = uuid(body.user_id, 'administrator id');
      const role = text(body.role, 'Administrator role', 20, true);
      if (!['super_admin', 'owner', 'manager', 'editor'].includes(role)) {
        throw new Error('Choose a valid administrator role.');
      }
      const { data, error } = await db.rpc('update_admin_role_and_audit', {
        p_actor_user_id: admin.user_id,
        p_actor_email: admin.email,
        p_target_user_id: targetUserId,
        p_target_role: role,
      });
      if (error) throw error;
      return data;
    }

    case 'list-members': {
      const page = Math.max(0, Math.min(10000, Number(body.page) || 0));
      const pageSize = 25;
      const search = safeSearch(body.search);
      let query = db.from('members')
        .select('id, full_name, reg_number, college, course, year_of_study, phone, email, membership_status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,reg_number.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
        );
      }
      if (body.status === 'active' || body.status === 'registered') {
        query = query.eq('membership_status', body.status);
      }
      const { data, error, count } = await query;
      if (error) throw error;

      const memberIds = (data || []).map((member) => member.id);
      const paymentByMember = new Map<string, { status: string; created_at: string }>();
      const completedMemberIds = new Set<string>();
      if (memberIds.length) {
        const { data: paymentRows, error: paymentError } = await db.from('payments')
          .select('member_id, payment_status, created_at')
          .in('member_id', memberIds)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (paymentError) throw paymentError;
        for (const payment of paymentRows || []) {
          if (payment.member_id && payment.payment_status === 'completed') {
            completedMemberIds.add(payment.member_id);
          }
          if (payment.member_id && !paymentByMember.has(payment.member_id)) {
            paymentByMember.set(payment.member_id, {
              status: payment.payment_status,
              created_at: payment.created_at,
            });
          }
        }

      }
      return {
        items: (data || []).map((member) => ({
          ...member,
          latest_payment: paymentByMember.get(member.id) || null,
          has_completed_payment: completedMemberIds.has(member.id),
        })),
        total: count || 0,
        page,
        pageSize,
      };
    }

    case 'list-payments': {
      const { data, error } = await db.from('payments')
        .select('id, member_id, amount, phone, payment_status, lipana_ref, created_at, members(full_name, reg_number, email)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    }

    case 'update-member': {
      const id = uuid(body.id, 'member id');
      const input = (body.updates && typeof body.updates === 'object')
        ? body.updates as Record<string, unknown>
        : {};
      const updates: Record<string, unknown> = {};
      for (const field of ['full_name', 'college', 'course', 'phone', 'email'] as const) {
        if (field in input) updates[field] = text(input[field], field.replace('_', ' '), 200, true);
      }
      if ('year_of_study' in input) {
        const year = Number(input.year_of_study);
        if (!Number.isInteger(year) || year < 1 || year > 6) throw new Error('Year of study must be between 1 and 6.');
        updates.year_of_study = year;
      }
      if ('membership_status' in input) {
        const status = text(input.membership_status, 'Membership status', 20, true);
        if (status !== 'active' && status !== 'registered') {
          throw new Error('Choose a valid membership status.');
        }
        if (status === 'active') {
          const { count, error: paymentError } = await db.from('payments')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', id)
            .eq('payment_status', 'completed');
          if (paymentError) throw paymentError;
          if (!count) throw new Error('A member can only be activated after a confirmed payment.');
        }
        updates.membership_status = status;
      }
      if ('email' in updates && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(updates.email))) {
        throw new Error('Enter a valid email address.');
      }
      if (!Object.keys(updates).length) throw new Error('No member changes were provided.');
      const { data, error } = await db.from('members').update(updates).eq('id', id)
        .select('id, full_name, reg_number, college, course, year_of_study, phone, email, membership_status, created_at')
        .single();
      if (error) throw error;
      return data;
    }

    case 'delete-member': {
      const id = uuid(body.id, 'member id');
      const { error } = await db.from('members').delete().eq('id', id);
      if (error) throw error;
      return { id };
    }

    case 'list-events': {
      const { data, error } = await db.from('events').select('*').order('event_date', { ascending: true }).limit(300);
      if (error) throw error;
      return data || [];
    }

    case 'save-event': {
      const input = (body.event && typeof body.event === 'object')
        ? body.event as Record<string, unknown>
        : {};
      const eventId = input.id ? uuid(input.id, 'event id') : crypto.randomUUID();
      const eventDate = text(input.event_date, 'Event date', 10, true);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}T00:00:00Z`))) {
        throw new Error('Enter a valid event date.');
      }
      const media = Array.isArray(input.media_urls)
        ? input.media_urls.filter((item): item is string => typeof item === 'string').slice(0, 10)
        : [];
      const embeds = Array.isArray(input.embed_urls)
        ? input.embed_urls.filter((item): item is string => typeof item === 'string').slice(0, 10)
        : [];
      const event = {
        id: eventId,
        title: text(input.title, 'Event title', 160, true),
        description: text(input.description, 'Description', 5000),
        event_date: eventDate,
        category: text(input.category, 'Category', 60),
        location: text(input.location, 'Location', 180),
        media_urls: media,
        embed_urls: embeds,
      };
      const { data, error } = await db.from('events').upsert(event).select('*').single();
      if (error) throw error;
      return data;
    }

    case 'delete-event': {
      const id = uuid(body.id, 'event id');
      const { error } = await db.from('events').delete().eq('id', id);
      if (error) throw error;
      return { id };
    }

    case 'list-products': {
      const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return data || [];
    }

    case 'save-product': {
      const input = (body.product && typeof body.product === 'object')
        ? body.product as Record<string, unknown>
        : {};
      const productId = input.id ? uuid(input.id, 'product id') : crypto.randomUUID();
      const price = Number(input.price);
      if (!Number.isInteger(price) || price < 1 || price > 10000000) {
        throw new Error('Enter a valid product price.');
      }
      const imageUrl = input.image_url === null || input.image_url === ''
        ? null
        : text(input.image_url, 'Product image URL', 1000);
      const sizes = Array.isArray(input.sizes)
        ? input.sizes.filter((item): item is string => typeof item === 'string').slice(0, 20)
        : [];
      const product = {
        id: productId,
        name: text(input.name, 'Product name', 120, true),
        description: text(input.description, 'Description', 2000),
        price,
        category: text(input.category || 'Apparel', 'Category', 60, true),
        image_url: imageUrl,
        sizes,
        is_member_exclusive: input.is_member_exclusive === true,
      };
      const { data, error } = await db.from('products').upsert(product).select('*').single();
      if (error) throw error;
      return data;
    }

    case 'delete-product': {
      const id = uuid(body.id, 'product id');
      const { error } = await db.from('products').delete().eq('id', id);
      if (error) throw error;
      return { id };
    }

    case 'list-merch-orders': {
      const { data, error } = await db.from('merch_orders')
        .select('*, items:merch_order_items(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    }

    case 'update-merch-order-status': {
      const id = uuid(body.id, 'order id');
      const status = text(body.status, 'Order status', 20, true);
      if (!['pending', 'confirmed', 'fulfilled', 'cancelled'].includes(status)) {
        throw new Error('Choose a valid order status.');
      }
      const { data, error } = await db.from('merch_orders')
        .update({ status })
        .eq('id', id)
        .select('*, items:merch_order_items(*)')
        .single();
      if (error) throw error;
      return data;
    }

    case 'list-messages': {
      const { data, error } = await db.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return data || [];
    }

    case 'update-message': {
      const id = uuid(body.id, 'message id');
      if (typeof body.isRead !== 'boolean') throw new Error('Choose whether the message is read.');
      const { data, error } = await db.from('contact_messages').update({ is_read: body.isRead }).eq('id', id).select('*').single();
      if (error) throw error;
      return data;
    }

    case 'delete-message': {
      const id = uuid(body.id, 'message id');
      const { error } = await db.from('contact_messages').delete().eq('id', id);
      if (error) throw error;
      return { id };
    }

    case 'list-projects': {
      const { data, error } = await db.from('projects').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    }

    case 'save-project': {
      const input = (body.project && typeof body.project === 'object')
        ? body.project as Record<string, unknown>
        : {};
      const projectId = input.id ? uuid(input.id, 'project id') : crypto.randomUUID();
      const progress = Number(input.progress ?? 0);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100.');
      const media = Array.isArray(input.media_urls)
        ? input.media_urls.filter((item): item is string => typeof item === 'string').slice(0, 10)
        : [];
      const project = {
        id: projectId,
        name: text(input.name, 'Project name', 120, true),
        team_lead: text(input.team_lead, 'Team lead', 120, true),
        status: text(input.status || 'Ideation', 'Status', 40, true),
        progress,
        category: text(input.category, 'Category', 60),
        description: text(input.description, 'Description', 5000),
        media_urls: media,
        is_published: input.is_published === true,
      };
      const { data, error } = await db.from('projects').upsert(project).select('*').single();
      if (error) throw error;
      return data;
    }

    case 'delete-project': {
      const id = uuid(body.id, 'project id');
      const { error } = await db.from('projects').delete().eq('id', id);
      if (error) throw error;
      return { id };
    }

    case 'list-executives': {
      const { data, error } = await db.from('executives').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'save-executive': {
      const input = (body.executive && typeof body.executive === 'object')
        ? body.executive as Record<string, unknown>
        : {};
      const executiveId = input.id ? uuid(input.id, 'executive id') : crypto.randomUUID();
      const level = input.level;
      if (level !== 'advisor' && level !== 'executive' && level !== 'lead') {
        throw new Error('Choose a valid leadership level.');
      }
      const order = Number(input.display_order ?? 0);
      if (!Number.isInteger(order) || order < 0 || order > 999) throw new Error('Display order must be between 0 and 999.');
      const photoPath = input.photo_path === null || input.photo_path === ''
        ? null
        : text(input.photo_path, 'Profile image path', 300);
      if (photoPath && !photoPath.startsWith(`executives/${executiveId}/`)) {
        throw new Error('The profile image path is invalid.');
      }
      const executive = {
        id: executiveId,
        name: text(input.name, 'Name', 120, true),
        role: text(input.role, 'Position', 120, true),
        level,
        description: text(input.description, 'Description', 500, true),
        responsibilities: text(input.responsibilities, 'What they do', 1000, true),
        display_order: order,
        is_active: input.is_active !== false,
        photo_path: photoPath,
      };
      const { data, error } = await db.from('executives').upsert(executive).select('*').single();
      if (error) throw error;
      return data;
    }

    case 'delete-executive': {
      const id = uuid(body.id, 'executive id');
      const { error } = await db.from('executives').delete().eq('id', id);
      if (error) throw error;
      return { id };
    }

    case 'create-upload': {
      const kind = body.kind;
      const entityId = uuid(body.entityId, 'entity id');
      const mimeType = typeof body.contentType === 'string' ? body.contentType : '';
      const extension = ALLOWED_IMAGE_TYPES[mimeType];
      const sizeBytes = Number(body.sizeBytes);
      if (!extension) throw new Error('Choose a JPG, PNG or WebP image.');
      if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_IMAGE_BYTES) {
        throw new Error('Images must be smaller than 5 MB.');
      }
      if (kind !== 'executive' && kind !== 'project' && kind !== 'product' && kind !== 'event') {
        throw new Error('Invalid image destination.');
      }
      const bucket = kind === 'executive' ? 'iec-executive-profiles'
        : kind === 'product' ? 'product-images'
        : kind === 'event' ? 'event-media'
        : 'project-media';
      const folder = kind === 'executive' ? 'executives'
        : kind === 'product' ? 'products'
        : kind === 'event' ? 'events'
        : 'projects';
      const path = `${folder}/${entityId}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
      if (error) throw error;
      const { data: publicUrl } = db.storage.from(bucket).getPublicUrl(path);
      return { bucket, path, token: data.token, publicUrl: publicUrl.publicUrl };
    }

    default:
      throw new Error('Unknown admin action.');
  }
}

function canAccessAction(role: string, body: Record<string, unknown>): boolean {
  const action = typeof body.action === 'string' ? body.action : '';
  if (!KNOWN_ACTIONS.has(action)) return false;
  if (ORDER_ACTIONS.has(action)) return true;
  if (role === 'super_admin' || role === 'owner') return true;
  if (OWNER_ONLY_ACTIONS.has(action)) return false;
  if (role === 'manager') return true;
  if (role !== 'editor') return false;
  if (CONTENT_ACTIONS.has(action)) return true;
  return action === 'create-upload'
    && ['executive', 'project', 'product', 'event'].includes(String(body.kind));
}

async function recordAdminAction(
  db: ReturnType<typeof createClient>,
  admin: { user_id: string; email: string },
  body: Record<string, unknown>,
  result: unknown,
) {
  const action = String(body.action);
  const resultId = result && typeof result === 'object' && 'id' in result
    ? String((result as { id: unknown }).id)
    : null;
  const entity = ['member', 'event', 'product', 'project', 'executive', 'message']
    .find((name) => action.endsWith(`-${name}`) || action.startsWith(`${name}-`));
  const payload = entity ? body[entity] : null;
  const payloadId = payload && typeof payload === 'object' && 'id' in payload
    ? String((payload as { id: unknown }).id)
    : null;
  const details = action === 'update-member' && body.updates && typeof body.updates === 'object'
    ? { fields: Object.keys(body.updates as Record<string, unknown>).sort() }
    : action === 'update-message' ? { is_read: body.isRead === true }
    : action === 'update-merch-order-status' ? { status: String(body.status) } : {};
  const { error } = await db.from('admin_audit_logs').insert({
    actor_user_id: admin.user_id,
    actor_email: admin.email,
    action,
    resource_type: action === 'update-merch-order-status' ? 'merch_order' : entity || action.split('-').slice(1).join('-'),
    resource_id: resultId || payloadId || (typeof body.id === 'string' ? body.id : null),
    details,
  });
  if (error) {
    console.error('Admin change was saved but its audit record could not be written:', error.message);
    throw new Error('The change succeeded, but its audit record could not be saved. Verify the record before retrying.');
  }
}

serve(async (req) => {
  const headers = headersFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405, headers);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error('Admin API Supabase environment is incomplete.');
    return respond({ error: 'The admin service is not configured.' }, 500, headers);
  }

  try {
    const authorization = req.headers.get('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return respond({ error: 'Sign in to continue.' }, 401, headers);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return respond({ error: 'Your session has expired. Sign in again.' }, 401, headers);

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: admin, error: adminError } = await db.from('admins')
      .select('user_id, email, role')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!admin) return respond({ error: 'This account does not have admin access.' }, 403, headers);

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respond({ error: 'Request body must be an object.' }, 400, headers);
    }
    const actionBody = body as Record<string, unknown>;
    if (!canAccessAction(admin.role, actionBody)) {
      return respond({ error: 'Your administrator role cannot access this action.' }, 403, headers);
    }
    const result = await handleAction(db, actionBody, admin);
    if (typeof actionBody.action === 'string' && AUDITED_ACTIONS.has(actionBody.action)) {
      await recordAdminAction(db, admin, actionBody, result);
    }
    return respond({ data: result }, 200, headers);
  } catch (error) {
    const message = errorMessage(error);
    console.error('Admin API request failed:', message);
    return respond({ error: message }, message.startsWith('The change succeeded') ? 500 : 400, headers);
  }
});
