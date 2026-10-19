import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerPriority, CustomerStatus, UserRole, ActivityType, AuditAction } from '@prisma/client';
import { generateCustomerCode } from '../common/utils/customer-code.util';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      pageSize?: number;
      status?: CustomerStatus;
      priority?: CustomerPriority;
      source?: string;
      assignedToId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    currentUser: any,
  ) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };

    // RBAC: Nhân viên SALE chỉ xem khách hàng được phân công cho mình
    if (currentUser.role === UserRole.SALE) {
      where.assignedToId = currentUser.id;
    } else if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.source) where.source = query.source;

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder || 'desc';
    orderBy[sortField] = sortDirection;

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          assignedTo: {
            select: { id: true, code: true, name: true, email: true, phone: true },
          },
          _count: {
            select: {
              activities: true,
              tasks: true,
              conversations: true,
              attachments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((c) => ({
        ...c,
        tags: typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : c.tags,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, currentUser: any) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignedTo: {
          select: { id: true, code: true, name: true, email: true, phone: true, teamId: true },
        },
        assignments: {
          include: {
            fromUser: { select: { id: true, code: true, name: true } },
            toUser: { select: { id: true, code: true, name: true } },
            changedByUser: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: {
            user: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        conversations: {
          include: {
            messages: {
              take: 5,
              orderBy: { sentAt: 'desc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng.');
    }

    // Role check: Nếu là Sale và không phụ trách khách hàng này
    if (currentUser.role === UserRole.SALE && customer.assignedToId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập hồ sơ khách hàng này.');
    }

    return {
      ...customer,
      tags: typeof customer.tags === 'string' ? JSON.parse(customer.tags || '[]') : customer.tags,
    };
  }

  async create(dto: CreateCustomerDto, currentUser: any) {
    // Kiểm tra trùng lặp số điện thoại
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone, deletedAt: null },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    if (existing) {
      throw new BadRequestException(
        `Số điện thoại ${dto.phone} đã tồn tại trong hệ thống (Mã: ${existing.code}, Khách: ${existing.fullName}, Phụ trách: ${existing.assignedTo?.name || 'Chưa gán'}).`,
      );
    }

    const assignedToId = dto.assignedToId || (currentUser.role === UserRole.SALE ? currentUser.id : null);

    let assignedSaleName: string | null = null;
    if (assignedToId) {
      const assignedSale = await this.prisma.user.findUnique({
        where: { id: assignedToId },
        select: { name: true },
      });
      assignedSaleName = assignedSale?.name || null;
    }

    const code = await generateCustomerCode(this.prisma, assignedSaleName);

    const customer = await this.prisma.customer.create({
      data: {
        code,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        source: dto.source,
        status: dto.status || CustomerStatus.NEW,
        priority: dto.priority || CustomerPriority.MEDIUM,
        tags: JSON.stringify(dto.tags || []),
        notes: dto.notes,
        assignedToId,
      },
    });

    // Ghi nhận lịch sử phân công ban đầu
    if (assignedToId) {
      await this.prisma.customerAssignment.create({
        data: {
          customerId: customer.id,
          fromUserId: null,
          toUserId: assignedToId,
          changedByUserId: currentUser.id,
          reason: 'Phân công khi tạo mới khách hàng',
        },
      });
    }

    // Ghi AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: AuditAction.CREATE_CUSTOMER,
        resource: 'CUSTOMER',
        resourceId: customer.id,
        details: JSON.stringify({ code: customer.code, name: customer.fullName, phone: customer.phone }),
      },
    });

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, currentUser: any) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }

    if (currentUser.role === UserRole.SALE && existing.assignedToId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa khách hàng này.');
    }

    const data: any = { ...dto };
    if (dto.tags) {
      data.tags = JSON.stringify(dto.tags);
    }

    // Nếu đổi nhân viên Sale phụ trách, cập nhật lại mã khách hàng theo tiền tố của Sale mới
    if (dto.assignedToId && dto.assignedToId !== existing.assignedToId) {
      const newSale = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
        select: { name: true },
      });
      if (newSale) {
        data.code = await generateCustomerCode(this.prisma, newSale.name);
      }
    }

    // Nếu đổi trạng thái, tự động ghi CustomerActivity
    if (dto.status && dto.status !== existing.status) {
      await this.prisma.customerActivity.create({
        data: {
          customerId: id,
          userId: currentUser.id,
          type: ActivityType.STATUS_CHANGE,
          title: 'Thay đổi trạng thái khách hàng',
          description: `Chuyển trạng thái từ ${existing.status} sang ${dto.status}`,
        },
      });
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: AuditAction.UPDATE_CUSTOMER,
        resource: 'CUSTOMER',
        resourceId: id,
        details: JSON.stringify(dto),
      },
    });

    return updated;
  }

  async checkDuplicates(phone?: string, email?: string) {
    if (!phone && !email) {
      return { duplicates: [] };
    }

    const OR: any[] = [];
    if (phone) OR.push({ phone });
    if (email) OR.push({ email });

    const duplicates = await this.prisma.customer.findMany({
      where: { OR, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, name: true, code: true } },
      },
    });

    return { duplicates };
  }

  async exportCsv(currentUser: any) {
    const where: any = { deletedAt: null };
    if (currentUser.role === UserRole.SALE) {
      where.assignedToId = currentUser.id;
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        assignedTo: { select: { name: true, code: true } },
      },
      orderBy: { code: 'asc' },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: AuditAction.EXPORT_CUSTOMERS,
        resource: 'CUSTOMER',
        details: JSON.stringify({ count: customers.length }),
      },
    });

    const header = ['Mã khách hàng', 'Họ tên', 'Số điện thoại', 'Email', 'Nguồn', 'Trạng thái', 'Mức độ ưu tiên', 'Sale phụ trách', 'Ngày tạo'];
    const rows = customers.map((c) => [
      c.code,
      `"${c.fullName}"`,
      c.phone || '',
      c.email || '',
      `"${c.source}"`,
      c.status,
      c.priority,
      `"${c.assignedTo?.name || 'Chưa gán'}"`,
      c.createdAt.toISOString().split('T')[0],
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csvContent;
  }
}
