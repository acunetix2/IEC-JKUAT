export type AdminView =
  | 'overview' | 'members' | 'applications' | 'payments' | 'projects' | 'executives' | 'leadership'
  | 'events' | 'products' | 'orders' | 'messages' | 'notifications' | 'reports' | 'content' | 'settings' | 'roles';

export type AdminRole =
  | 'chairperson'
  | 'vice_chairperson_membership'
  | 'vice_chairperson_projects'
  | 'vice_chairperson_education'
  | 'deputy_vice_chairperson_projects'
  | 'secretary_general'
  | 'treasurer'
  | 'pr_communications'
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'editor';

export const ADMIN_ROLE_OPTIONS: Array<{ value: AdminRole; label: string; scope: string; level: number }> = [
  { value: 'chairperson', label: 'Chairperson', scope: 'Full executive authority and strategic leadership', level: 100 },
  { value: 'vice_chairperson_membership', label: 'Vice Chairperson Membership', scope: 'Membership growth, applicant review, and member operations', level: 92 },
  { value: 'vice_chairperson_projects', label: 'Vice Chairperson Projects', scope: 'Project execution, delivery planning, and implementation oversight', level: 92 },
  { value: 'vice_chairperson_education', label: 'Vice Chairperson Education', scope: 'Learning programs, trainings, and knowledge development', level: 90 },
  { value: 'deputy_vice_chairperson_projects', label: 'Deputy Vice Chairperson Projects', scope: 'Operational support for project planning and execution', level: 86 },
  { value: 'secretary_general', label: 'Secretary General', scope: 'Administrative coordination, records, and governance workflow', level: 82 },
  { value: 'treasurer', label: 'Treasurer', scope: 'Finance, payment review, and budget oversight', level: 78 },
  { value: 'pr_communications', label: 'PR & Communications', scope: 'Publicity, communication, and club messaging', level: 74 },
  { value: 'super_admin', label: 'Super Admin', scope: 'Primary administrative owner for the club portal', level: 100 },
  { value: 'owner', label: 'Super Admin', scope: 'Compatibility alias for the primary admin owner', level: 100 },
  { value: 'manager', label: 'Manager', scope: 'Compatibility alias for Secretary General', level: 82 },
  { value: 'editor', label: 'Editor', scope: 'Compatibility alias for committee-related updates', level: 68 },
];

export const ADMIN_ROLE_METADATA: Record<AdminRole, { label: string; level: number; scope: string }> = Object.fromEntries(
  ADMIN_ROLE_OPTIONS.map((role) => [role.value, { label: role.label, level: role.level, scope: role.scope }]),
) as Record<AdminRole, { label: string; level: number; scope: string }>;

export function normalizeAdminRole(role?: string | null): AdminRole {
  const value = (role ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  switch (value) {
    case 'chairperson':
      return 'chairperson';
    case 'super_admin':
    case 'owner':
      return 'super_admin';
    case 'vice_chairperson_membership':
    case 'vice_chairperson-membership':
    case 'vc_membership':
    case 'membership':
    case 'vice_chairperson':
      return 'vice_chairperson_membership';
    case 'vice_chairperson_projects':
    case 'vice_chairperson-projects':
    case 'vc_projects':
    case 'projects':
      return 'vice_chairperson_projects';
    case 'vice_chairperson_education':
    case 'vice_chairperson-education':
    case 'vc_education':
    case 'education':
      return 'vice_chairperson_education';
    case 'deputy_vice_chairperson_projects':
    case 'deputy_vice_chairperson-projects':
    case 'deputy_vice_chairperson':
    case 'deputy_vc_projects':
      return 'deputy_vice_chairperson_projects';
    case 'secretary_general':
    case 'secretary-general':
    case 'manager':
      return 'secretary_general';
    case 'treasurer':
      return 'treasurer';
    case 'pr_communications':
    case 'pr-communications':
    case 'pr_&_communications':
    case 'public_relations':
      return 'pr_communications';
    case 'editor':
      return 'vice_chairperson_membership';
    default:
      return 'vice_chairperson_membership';
  }
}

export function getAdminRoleLabel(role?: string | null): string {
  const normalized = normalizeAdminRole(role);
  return ADMIN_ROLE_METADATA[normalized]?.label ?? 'VC Membership';
}

export function canAccessAdminView(role: AdminRole | string | null | undefined, _view: AdminView): boolean {
  const normalized = normalizeAdminRole(role);
  const fullAccessRoles: AdminRole[] = [
    'chairperson',
    'vice_chairperson_membership',
    'vice_chairperson_projects',
    'vice_chairperson_education',
    'deputy_vice_chairperson_projects',
    'secretary_general',
    'treasurer',
    'pr_communications',
    'super_admin',
    'owner',
    'manager',
    'editor',
  ];
  return fullAccessRoles.includes(normalized);
}

export function canManageAdminRoles(role: AdminRole | string | null | undefined): boolean {
  const normalized = normalizeAdminRole(role);
  return ['chairperson', 'super_admin', 'owner', 'manager', 'secretary_general'].includes(normalized);
}

export interface AdminProfile {
  user_id: string;
  email: string;
  role: AdminRole;
  full_name?: string;
  title?: string;
  phone?: string;
  department?: string;
  timezone?: string;
  bio?: string;
  last_login?: string;
}

export interface AdminAccount extends AdminProfile {
  created_at: string;
}

export interface AdminAuditLog {
  id: number;
  actor_user_id: string | null;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DashboardData {
  members: number;
  activeMembers: number;
  completedPayments: number;
  projects: number;
  publishedProjects: number;
  collectedLastSixMonths: number;
  monthly: Array<{ month: string; period?: string; members: number; payments: number; collected: number }>;
}

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
  latest_payment: { status: string; created_at: string } | null;
  has_completed_payment?: boolean;
}

export interface PaginatedMembers {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Payment {
  id: string;
  member_id: string | null;
  amount: number;
  phone: string;
  payment_status: string;
  lipana_ref: string | null;
  created_at: string;
  members: { full_name: string; reg_number: string; email: string } | null;
}

export interface Project {
  id: string;
  name: string;
  team_lead: string;
  status: string;
  progress: number;
  category: string | null;
  description: string | null;
  media_urls: string[] | string | null;
  is_published: boolean;
  created_at?: string;
}

export interface Executive {
  id: string;
  name: string;
  role: string;
  description: string;
  responsibilities: string;
  level: 'advisor' | 'executive' | 'lead';
  photo_path: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UploadTicket {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  category: string | null;
  location: string | null;
  media_urls: string[] | string | null;
  embed_urls: string[] | string | null;
  created_at?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  sizes: string[] | string | null;
  colors: string[] | string | null;
  is_member_exclusive: boolean;
  created_at?: string;
}

export type MerchOrderStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';

export interface MerchOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

export interface MerchOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: MerchOrderStatus;
  created_at: string;
  items: MerchOrderItem[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function stringList(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [value];
  } catch {
    return [value];
  }
}

export function mediaUrls(value: Project['media_urls'] | undefined): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return value.trim() ? [value.trim()] : [];
  }
}
