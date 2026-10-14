import {
  CustomerStatus,
  CustomerPriority,
  UserRole,
  UserStatus,
  IntegrationCapability,
  CapabilityVerificationStatus,
  ConnectionStatus,
  ActivityType,
  TaskStatus,
  CampaignStatus,
  InviteStatus,
} from '../types/index';

export const InviteStatusLabels: Record<InviteStatus, string> = {
  [InviteStatus.PENDING]: 'Đang chờ quét mã',
  [InviteStatus.SCANNED]: 'Đã quét mã, đang xác nhận',
  [InviteStatus.COMPLETED]: 'Tham gia thành công',
  [InviteStatus.CANCELLED]: 'Đã hủy lời mời',
  [InviteStatus.EXPIRED]: 'Mã QR đã hết hạn',
};

export const InviteStatusColors: Record<InviteStatus, string> = {
  [InviteStatus.PENDING]: 'bg-amber-100 text-amber-800 border-amber-300',
  [InviteStatus.SCANNED]: 'bg-blue-100 text-blue-800 border-blue-300',
  [InviteStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [InviteStatus.CANCELLED]: 'bg-slate-100 text-slate-700 border-slate-300',
  [InviteStatus.EXPIRED]: 'bg-rose-100 text-rose-800 border-rose-300',
};

export const CustomerStatusLabels: Record<CustomerStatus, string> = {
  [CustomerStatus.NEW]: 'Khách mới',
  [CustomerStatus.CONTACTED]: 'Đã liên hệ',
  [CustomerStatus.CONSULTING]: 'Đang tư vấn',
  [CustomerStatus.WAITING_REPLY]: 'Chờ phản hồi',
  [CustomerStatus.FOLLOW_UP]: 'Đang theo dõi',
  [CustomerStatus.CONVERTED]: 'Đã chuyển đổi',
  [CustomerStatus.DROPPED]: 'Không tiếp tục',
};

export const CustomerStatusColors: Record<CustomerStatus, string> = {
  [CustomerStatus.NEW]: 'bg-blue-100 text-blue-800 border-blue-200',
  [CustomerStatus.CONTACTED]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [CustomerStatus.CONSULTING]: 'bg-amber-100 text-amber-800 border-amber-200',
  [CustomerStatus.WAITING_REPLY]: 'bg-orange-100 text-orange-800 border-orange-200',
  [CustomerStatus.FOLLOW_UP]: 'bg-purple-100 text-purple-800 border-purple-200',
  [CustomerStatus.CONVERTED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [CustomerStatus.DROPPED]: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const CustomerPriorityLabels: Record<CustomerPriority, string> = {
  [CustomerPriority.LOW]: 'Thấp',
  [CustomerPriority.MEDIUM]: 'Trung bình',
  [CustomerPriority.HIGH]: 'Cao',
  [CustomerPriority.URGENT]: 'Khẩn cấp',
};

export const RoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Quản trị viên (Admin)',
  [UserRole.MANAGER]: 'Trưởng nhóm (Manager)',
  [UserRole.SALE]: 'Nhân viên (Sale)',
};

export const UserStatusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Đang hoạt động',
  [UserStatus.INACTIVE]: 'Đã vô hiệu hóa',
};

export const CapabilityLabels: Record<IntegrationCapability, { label: string; description: string }> = {
  [IntegrationCapability.READ_CHATS]: {
    label: 'Xem hội thoại Zalo',
    description: 'Khả năng đọc và hiển thị danh sách hội thoại từ tài khoản Zalo cá nhân',
  },
  [IntegrationCapability.SYNC_MESSAGES_FILES]: {
    label: 'Đồng bộ tin nhắn & Tệp',
    description: 'Khả năng thu thập, lưu trữ tin nhắn, ảnh, tài liệu từ hội thoại',
  },
  [IntegrationCapability.BULK_SEND]: {
    label: 'Gửi tin hàng loạt',
    description: 'Khả năng gửi tin nhắn chiến dịch đến nhiều khách hàng cùng lúc',
  },
};

export const VerificationStatusLabels: Record<CapabilityVerificationStatus, string> = {
  [CapabilityVerificationStatus.PENDING]: 'Chưa xem xét',
  [CapabilityVerificationStatus.IN_REVIEW]: 'Đang kiểm tra',
  [CapabilityVerificationStatus.VERIFIED]: 'Đã xác minh',
  [CapabilityVerificationStatus.REJECTED]: 'Không đáp ứng',
  [CapabilityVerificationStatus.NEEDS_VERIFICATION]: 'Cần xác minh',
};

export const VerificationStatusColors: Record<CapabilityVerificationStatus, string> = {
  [CapabilityVerificationStatus.PENDING]: 'bg-slate-100 text-slate-700 border-slate-300',
  [CapabilityVerificationStatus.IN_REVIEW]: 'bg-amber-100 text-amber-800 border-amber-300',
  [CapabilityVerificationStatus.VERIFIED]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [CapabilityVerificationStatus.REJECTED]: 'bg-rose-100 text-rose-800 border-rose-300',
  [CapabilityVerificationStatus.NEEDS_VERIFICATION]: 'bg-sky-100 text-sky-800 border-sky-300',
};

export const ConnectionStatusLabels: Record<ConnectionStatus, string> = {
  [ConnectionStatus.NOT_CONFIGURED]: 'Chưa cấu hình',
  [ConnectionStatus.NOT_CONNECTED]: 'Chưa kết nối',
  [ConnectionStatus.CONNECTING]: 'Đang kết nối',
  [ConnectionStatus.ACTIVE]: 'Đang hoạt động',
  [ConnectionStatus.ERROR]: 'Lỗi kết nối',
  [ConnectionStatus.DISABLED]: 'Bị vô hiệu hóa',
};

export const ConnectionStatusColors: Record<ConnectionStatus, string> = {
  [ConnectionStatus.NOT_CONFIGURED]: 'bg-slate-100 text-slate-700',
  [ConnectionStatus.NOT_CONNECTED]: 'bg-zinc-100 text-zinc-700',
  [ConnectionStatus.CONNECTING]: 'bg-blue-100 text-blue-700',
  [ConnectionStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700',
  [ConnectionStatus.ERROR]: 'bg-red-100 text-red-700',
  [ConnectionStatus.DISABLED]: 'bg-neutral-100 text-neutral-600',
};

export const ActivityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.CALL]: 'Cuộc gọi',
  [ActivityType.MESSAGE]: 'Tin nhắn',
  [ActivityType.MEETING]: 'Gặp mặt',
  [ActivityType.NOTE]: 'Ghi chú',
  [ActivityType.STATUS_CHANGE]: 'Đổi trạng thái',
  [ActivityType.HANDOVER]: 'Bàn giao',
};

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Chờ thực hiện',
  [TaskStatus.IN_PROGRESS]: 'Đang làm',
  [TaskStatus.COMPLETED]: 'Hoàn thành',
  [TaskStatus.CANCELLED]: 'Đã hủy',
};

export const CampaignStatusLabels: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: 'Bản nháp',
  [CampaignStatus.PREVIEWED]: 'Đã xem trước',
  [CampaignStatus.CONFIRMED]: 'Đã xác nhận',
  [CampaignStatus.SENDING]: 'Đang gửi',
  [CampaignStatus.COMPLETED]: 'Hoàn thành',
  [CampaignStatus.CANCELLED]: 'Đã hủy',
  [CampaignStatus.FAILED]: 'Thất bại',
};
