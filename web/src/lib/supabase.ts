// IEC JKUAT — Supabase client + data layer
// Module-level singleton client (no lazy init, no (!sb) guards).

import { createClient } from '@supabase/supabase-js';
import type {
  Member,
  Project,
  EventRow,
  Product,
  ContactMessage,
  MemberForm,
  MemberLookup,
  MerchOrder,
  MerchOrderStatus,
} from '../types/db';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the website.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Form Utilities =====

// Submit member registration to Supabase.
// NOTE: no `.select()` after insert — anon has INSERT but not SELECT on
// members (PII). The new row's id is fetched via the non-PII lookup RPC.
export async function submitMemberRegistration(formData: MemberForm): Promise<MemberLookup[]> {
  const { error } = await supabase.from('members').insert([
    {
      full_name: formData.fullName,
      reg_number: formData.regNumber,
      college: formData.college,
      course: formData.course,
      year_of_study: parseInt(formData.yearOfStudy),
      phone: formData.phone,
      email: formData.email,
      membership_status: 'registered',
    },
  ]);

  if (error) {
    if (error.code === '23505')
      throw new Error('This registration number is already registered. Continue to Activation instead.');
    throw error;
  }

  const found = await lookupMemberByReg(formData.regNumber);
  if (!found) throw new Error('Registered, but we could not load your record. Use Find on the Activation step.');
  return [found];
}

// Non-PII member lookup for public flows (registration return + pay-step
// Find). Returns { id, full_name, reg_number, membership_status } or null.
export async function lookupMemberByReg(regNumber: string): Promise<MemberLookup | null> {
  const { data, error } = await supabase.rpc('find_member_lookup', { p_reg: regNumber });
  if (error) throw error;
  return (data && (data as MemberLookup[])[0]) || null;
}

// Submit newsletter signup. No `.select()`: RETURNING needs SELECT, which
// the public role does not have on newsletter, so it would always fail.
export async function submitNewsletter(email: string): Promise<void> {
  const { error } = await supabase.from('newsletter').insert([{ email: email }]);
  if (error) throw error;
}

// Initiate M-Pesa payment via lipana.dev Edge Function
export async function initiatePayment(phone: string, amount: number, memberId: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('stk-push', {
    body: {
      phone: phone.startsWith('0') ? '+254' + phone.slice(1) : phone,
      amount: amount,
      member_id: memberId,
    },
  });

  // On a non-2xx response the JS client gives a FunctionsHttpError whose
  // message is the generic "Edge Function returned a non-2xx status code".
  // The real reason (e.g. "Payments are temporarily unavailable",
  // "Member not found") is in error.context — the Response object. Read
  // its JSON body and surface that instead of the useless generic text.
  if (error) {
    let detail = '';
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      const body = await ctx?.json?.();
      detail = body?.error || '';
    } catch {
      /* body wasn't JSON — fall back to the generic message */
    }
    throw new Error(detail || error.message || 'Payment could not be started. Please try again.');
  }

  // The function can also return 200 with { success: false } in some paths.
  if (data && (data as { success?: boolean }).success === false) {
    throw new Error((data as { error?: string }).error || 'Payment could not be started. Please try again.');
  }
  return data;
}

// ===== Admin CRUD Operations =====

// Strip PostgREST filter-DSL metacharacters so search terms can't alter
// query structure (commas split OR-clauses; % _ are LIKE wildcards).
export function sanitizeSearchTerm(term: string): string {
  return String(term || '').replace(/[%_,()\\]/g, '').slice(0, 80);
}

// Fetch all members
export async function getMembers(search = ''): Promise<Member[]> {
  let query = supabase.from('members').select('*').order('created_at', { ascending: false });
  search = sanitizeSearchTerm(search);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,reg_number.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data ?? []) as Member[];
}

// Update a member (admin)
export async function updateMember(id: string, updates: Partial<Member>): Promise<boolean> {
  const { error } = await supabase.from('members').update(updates).eq('id', id);
  if (error) throw error;
  return true;
}

// Delete a member
export async function deleteMember(id: string): Promise<boolean> {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Fetch all projects
export async function getProjects(search = ''): Promise<Project[]> {
  let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
  search = sanitizeSearchTerm(search);
  if (search) {
    query = query.or(`name.ilike.%${search}%,team_lead.ilike.%${search}%`);
  }
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data ?? []) as Project[];
}

// Add a project
export async function addProject(project: Partial<Project>): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').insert([project]).select();
  if (error) throw error;
  return (data ?? []) as Project[];
}

// Update a project
export async function updateProject(id: string, updates: Partial<Project>): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select();
  if (error) throw error;
  return (data ?? []) as Project[];
}

// Delete a project
export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Fetch all events
export async function getEvents(search = ''): Promise<EventRow[]> {
  let query = supabase.from('events').select('*').order('event_date', { ascending: true });
  search = sanitizeSearchTerm(search);
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

// Add an event
export async function addEvent(event: Partial<EventRow>): Promise<EventRow[]> {
  const { data, error } = await supabase.from('events').insert([event]).select();
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

// Delete an event
export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ===== Product CRUD =====

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function addProduct(product: Partial<Product>): Promise<Product[]> {
  const { data, error } = await supabase.from('products').insert([product]).select();
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product[]> {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ===== Contact Messages =====

export async function getContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ContactMessage[];
}

export async function markMessageRead(id: string): Promise<boolean> {
  const { error } = await supabase.from('contact_messages').update({ is_read: true }).eq('id', id);
  if (error) throw error;
  return true;
}

export async function deleteContactMessage(id: string): Promise<boolean> {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ===== Payments (admin, read-only) =====

export async function getPayments(): Promise<import('../types/db').Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, members(full_name, reg_number)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as import('../types/db').Payment[];
}

// Create the order through a database function so prices are read from the
// catalogue, not trusted from the visitor's local cart.
export async function createMerchOrder(
  customerName: string,
  customerPhone: string,
  items: { product_id: string; quantity: number; size?: string }[]
): Promise<{ id: string; totalAmount: number }> {
  const { data, error } = await supabase.rpc('create_merch_order', {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_items: items,
  });
  if (error) throw error;

  const row: unknown = Array.isArray(data) ? data[0] : null;
  if (
    !row ||
    typeof row !== 'object' ||
    !('order_id' in row) ||
    typeof row.order_id !== 'string' ||
    !('total_amount' in row) ||
    (typeof row.total_amount !== 'number' && typeof row.total_amount !== 'string')
  ) {
    throw new Error('The order was saved, but its confirmation details could not be loaded.');
  }

  const totalAmount = Number(row.total_amount);
  if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
    throw new Error('The order was saved, but its total could not be verified.');
  }
  return { id: row.order_id, totalAmount };
}

export async function getMerchOrders(): Promise<MerchOrder[]> {
  const { data, error } = await supabase
    .from('merch_orders')
    .select('*, items:merch_order_items(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MerchOrder[];
}

export async function updateMerchOrderStatus(id: string, status: MerchOrderStatus): Promise<void> {
  const { error } = await supabase.from('merch_orders').update({ status }).eq('id', id);
  if (error) throw error;
}

// ===== Admin auth =====

export async function signInAdmin(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Invalid email or password.');
}

export async function signOutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

// Returns the signed-in admin's email if the current session belongs to an
// admin (present in the admins table), else null. Signs out non-admins.
export async function verifyAdminSession(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase.from('admins').select('user_id').limit(1);
  if (error || !data || data.length === 0) {
    await signOutAdmin();
    return null;
  }
  return session.user.email ?? '';
}
