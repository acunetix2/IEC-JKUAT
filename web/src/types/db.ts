// IEC JKUAT — database + UI types
// The events table type is named `EventRow` (not `Event`) to avoid the
// clash with the DOM global `Event`.

export interface Member {
  id: string;
  full_name: string;
  reg_number: string;
  college: string;
  course: string;
  year_of_study: number;
  phone: string;
  email: string;
  membership_status: string;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  team_lead?: string;
  status?: string;
  category?: string;
  progress?: number;
  media_urls?: string | string[] | null;
  embed_urls?: string | string[] | null;
  created_at?: string;
}

// media_urls / embed_urls / sizes are JSONB. Rows from seed.sql hold real
// arrays; rows saved by the old admin page hold a JSON *string* of an
// array. Always read them through parseJsonList() (lib/media.ts).
export interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  event_date?: string;
  category?: string | null;
  location?: string | null;
  media_urls?: string | string[] | null;
  embed_urls?: string | string[] | null;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price?: number;
  image_url?: string | null;
  category?: string;
  sizes?: string | string[] | null;
  is_member_exclusive?: boolean;
  created_at?: string;
}

export interface ContactMessage {
  id: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  is_read?: boolean;
  created_at?: string;
}

export interface Payment {
  id: string;
  member_id?: string | null;
  phone?: string;
  amount?: number;
  payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled' | string;
  lipana_ref?: string | null;
  created_at?: string;
  members?: { full_name: string; reg_number: string } | null;
}

export interface Admin {
  id: string;
  email: string;
  created_at?: string;
}

// ── UI types ──
export interface MemberForm {
  fullName: string;
  regNumber: string;
  college: string;
  course: string;
  yearOfStudy: string;
  phone: string;
  email: string;
}

export interface MemberLookup {
  id: string;
  full_name: string;
  reg_number: string;
  membership_status: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  size?: string;
  quantity: number;
}
