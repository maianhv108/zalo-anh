export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALE = 'SALE',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CustomerStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CONSULTING = 'CONSULTING',
  WAITING_REPLY = 'WAITING_REPLY',
  FOLLOW_UP = 'FOLLOW_UP',
  CONVERTED = 'CONVERTED',
  DROPPED = 'DROPPED',
}

export enum CustomerPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ActivityType {
  CALL = 'CALL',
  MESSAGE = 'MESSAGE',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  HANDOVER = 'HANDOVER',
}

export enum IntegrationCapability {
  READ_CHATS = 'READ_CHATS',
  SYNC_MESSAGES_FILES = 'SYNC_MESSAGES_FILES',
  BULK_SEND = 'BULK_SEND',
}

export enum CapabilityVerificationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NEEDS_VERIFICATION = 'NEEDS_VERIFICATION',
}

export enum ConnectionStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
}

export enum ProviderType {
  DEMO = 'DEMO',
  ZALO_PERSONAL = 'ZALO_PERSONAL',
  ZALO_OA = 'ZALO_OA',
}

export enum DataSource {
  MANUAL = 'MANUAL',
  DEMO = 'DEMO',
  CONNECTOR = 'CONNECTOR',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  PREVIEWED = 'PREVIEWED',
  CONFIRMED = 'CONFIRMED',
  SENDING = 'SENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum CampaignRecipientStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum InviteStatus {
  PENDING = 'PENDING',
  SCANNED = 'SCANNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DISABLE_USER = 'DISABLE_USER',
  CREATE_CUSTOMER = 'CREATE_CUSTOMER',
  UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
  ASSIGN_CUSTOMER = 'ASSIGN_CUSTOMER',
  HANDOVER_CUSTOMER = 'HANDOVER_CUSTOMER',
  EXPORT_CUSTOMERS = 'EXPORT_CUSTOMERS',
  UPDATE_VERIFICATION = 'UPDATE_VERIFICATION',
  UPDATE_CONNECTION = 'UPDATE_CONNECTION',
  CREATE_CAMPAIGN = 'CREATE_CAMPAIGN',
  PREVIEW_CAMPAIGN = 'PREVIEW_CAMPAIGN',
  CONFIRM_CAMPAIGN = 'CONFIRM_CAMPAIGN',
  CANCEL_CAMPAIGN = 'CANCEL_CAMPAIGN',
  DELETE_ATTACHMENT = 'DELETE_ATTACHMENT',
  INVITE_SALE_CREATED = 'INVITE_SALE_CREATED',
  INVITE_SALE_SCANNED = 'INVITE_SALE_SCANNED',
  INVITE_SALE_COMPLETED = 'INVITE_SALE_COMPLETED',
  INVITE_SALE_CANCELLED = 'INVITE_SALE_CANCELLED',
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSession {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  teamId?: string | null;
  teamName?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSession;
}
