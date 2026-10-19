import { z } from 'zod';
import {
  CustomerStatus,
  CustomerPriority,
  UserRole,
  IntegrationCapability,
  CapabilityVerificationStatus,
  TaskStatus,
  ActivityType,
} from '../types/index';

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.nativeEnum(UserRole),
  teamId: z.string().optional().nullable(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  teamId: z.string().optional().nullable(),
});

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ').regex(/^[0-9+() -]+$/, 'Định dạng số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  source: z.string().min(1, 'Vui lòng chọn nguồn khách hàng'),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.NEW),
  priority: z.nativeEnum(CustomerPriority).default(CustomerPriority.MEDIUM),
  assignedToId: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export const HandoverCustomerSchema = z.object({
  customerIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 khách hàng'),
  toUserId: z.string().min(1, 'Vui lòng chọn nhân viên tiếp nhận'),
  reason: z.string().min(5, 'Vui lòng nhập lý do bàn giao (tối thiểu 5 ký tự)'),
});

export const CreateActivitySchema = z.object({
  type: z.nativeEnum(ActivityType),
  title: z.string().min(2, 'Tiêu đề tối thiểu 2 ký tự'),
  description: z.string().optional().nullable(),
  customerId: z.string().min(1, 'Thiếu customerId'),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(2, 'Tiêu đề tối thiểu 2 ký tự'),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.PENDING),
});

export const UpdateVerificationSchema = z.object({
  capability: z.nativeEnum(IntegrationCapability),
  status: z.nativeEnum(CapabilityVerificationStatus),
  method: z.string().min(1, 'Phương thức tích hợp là bắt buộc'),
  evidenceUrl: z.string().url('URL tài liệu không hợp lệ').optional().or(z.literal('')),
  evidenceReference: z.string().optional().nullable(),
  scopeNotes: z.string().optional().nullable(),
  verificationNotes: z.string().min(5, 'Ghi chú xác minh tối thiểu 5 ký tự'),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(3, 'Tên chiến dịch tối thiểu 3 ký tự'),
  content: z.string().min(10, 'Nội dung tin nhắn tối thiểu 10 ký tự'),
  targetFilter: z.object({
    status: z.array(z.nativeEnum(CustomerStatus)).optional(),
    assignedToId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  customerIds: z.array(z.string()).optional(),
});
