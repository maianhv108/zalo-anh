import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, UserStatus, AuditAction, IntegrationCapability, CapabilityVerificationStatus, ConnectionStatus, ProviderType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    role?: UserRole;
    status?: UserStatus;
    teamId?: string;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.teamId) where.teamId = query.teamId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          teamId: true,
          team: { select: { id: true, name: true, code: true } },
          avatarUrl: true,
          zaloAccountName: true,
          zaloPhone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedCustomers: true,
              activities: true,
              tasks: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((u) => ({
        ...u,
        assignedCustomersCount: u._count.assignedCustomers,
        activitiesCount: u._count.activities,
        tasksCount: u._count.tasks,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        team: true,
        verifications: {
          include: {
            verifiedByUser: { select: { id: true, name: true } },
          },
        },
        connections: true,
        _count: {
          select: {
            assignedCustomers: true,
            activities: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async create(dto: CreateUserDto, currentUserId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng trong hệ thống.');
    }

    const count = await this.prisma.user.count();
    const prefix = dto.role === UserRole.ADMIN ? 'ADMIN' : dto.role === UserRole.MANAGER ? 'MGR' : 'SALE';
    const code = `${prefix}${String(count + 1).padStart(2, '0')}`;

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        code,
        name: dto.name,
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone,
        password: hashedPassword,
        role: dto.role,
        teamId: dto.teamId ? dto.teamId : null,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}`,
        zaloAccountName: dto.zaloAccountName,
        zaloPhone: dto.zaloPhone,
      },
    });

    // Tạo cấu hình kết nối & 3 capabilities mặc định cho nhân viên Sale
    if (dto.role === UserRole.SALE) {
      await this.prisma.integrationConnection.create({
        data: {
          userId: user.id,
          provider: ProviderType.ZALO_PERSONAL,
          accountLabel: `Zalo Cá Nhân - ${user.name}`,
          connectionStatus: ConnectionStatus.NOT_CONNECTED,
          isDemo: false,
        },
      });

      const capabilities = [
        IntegrationCapability.READ_CHATS,
        IntegrationCapability.SYNC_MESSAGES_FILES,
        IntegrationCapability.BULK_SEND,
      ];

      for (const cap of capabilities) {
        await this.prisma.integrationCapabilityVerification.create({
          data: {
            userId: user.id,
            capability: cap,
            status: CapabilityVerificationStatus.NEEDS_VERIFICATION,
            method: 'Zalo Personal Standard Integration',
            verificationNotes: 'Chưa xác minh phương thức tích hợp.',
          },
        });
      }
    }

    // Ghi AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.CREATE_USER,
        resource: 'USER',
        resourceId: user.id,
        details: JSON.stringify({ code: user.code, email: user.email, role: user.role }),
      },
    });

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_USER,
        resource: 'USER',
        resourceId: id,
        details: JSON.stringify(dto),
      },
    });

    const { password, ...safeUser } = updated;
    return safeUser;
  }

  async disable(id: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assignedCustomers: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.DISABLE_USER,
        resource: 'USER',
        resourceId: id,
        details: JSON.stringify({
          activeCustomersRemaining: user._count.assignedCustomers,
          warning: user._count.assignedCustomers > 0 ? 'Nhân viên còn khách hàng chưa bàn giao' : null,
        }),
      },
    });

    return {
      success: true,
      user: { id: updated.id, name: updated.name, status: updated.status },
      activeCustomersRemaining: user._count.assignedCustomers,
      warning: user._count.assignedCustomers > 0
        ? `Nhân viên này hiện đang phụ trách ${user._count.assignedCustomers} khách hàng. Vui lòng thực hiện Bàn Giao Khách Hàng sang nhân viên khác!`
        : null,
    };
  }

  async getAssignedCustomers(userId: string) {
    return this.prisma.customer.findMany({
      where: { assignedToId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
