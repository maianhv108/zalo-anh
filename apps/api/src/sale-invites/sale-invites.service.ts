import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import {
  InviteStatus,
  UserRole,
  UserStatus,
  ProviderType,
  ConnectionStatus,
  IntegrationCapability,
  CapabilityVerificationStatus,
  AuditAction,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SaleInvitesService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Tạo mã mời QR mới cho nhân viên Sale (Dành cho Admin/Manager)
   */
  async createInvite(dto: CreateInviteDto, currentUserId: string, hostHeader?: string) {
    // 1. Kiểm tra đội nhóm nếu có chỉ định
    let teamName: string | null = null;
    if (dto.teamId) {
      const team = await this.prisma.salesTeam.findUnique({ where: { id: dto.teamId } });
      if (!team) {
        throw new BadRequestException('Đội nhóm kinh doanh được chọn không tồn tại.');
      }
      teamName = team.name;
    }

    // 2. Tạo token ngẫu nhiên bảo mật cao (cryptographically secure)
    const randomHex = crypto.randomBytes(24).toString('hex');
    const token = `inv_${randomHex}`;

    // 3. Thời gian hết hạn (mặc định 15 phút)
    const minutes = dto.expiresInMinutes || 15;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    // 4. Xác định URL lời mời (Trỏ về cổng Frontend Web 3000)
    const defaultHost = hostHeader ? hostHeader.replace(':4000', ':3000') : 'localhost:3000';
    const origin = process.env.FRONTEND_URL || `http://${defaultHost}`;
    const inviteUrl = `${origin}/invite/${token}`;

    // 5. Sinh mã QR Base64 dạng PNG chất lượng cao
    const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
      width: 380,
      margin: 2,
      color: {
        dark: '#0b1b3d', // Mã màu dark navy đồng bộ với theme hệ thống
        light: '#ffffff',
      },
    });

    // 6. Lưu vào cơ sở dữ liệu
    const invite = await this.prisma.saleInvite.create({
      data: {
        token,
        status: InviteStatus.PENDING,
        teamId: dto.teamId || null,
        createdById: currentUserId,
        expiresAt,
        metadata: JSON.stringify({
          createdFromOrigin: origin,
          inviteUrl,
        }),
      },
      include: {
        team: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, code: true } },
      },
    });

    // 7. Ghi nhận Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.INVITE_SALE_CREATED,
        resource: 'INVITATION',
        resourceId: invite.id,
        details: JSON.stringify({
          token: invite.token,
          teamId: dto.teamId || null,
          expiresAt: invite.expiresAt,
        }),
      },
    });

    return {
      id: invite.id,
      token: invite.token,
      status: invite.status,
      teamId: invite.teamId,
      teamName: invite.team?.name || 'Chưa phân đội',
      createdBy: invite.createdBy.name,
      inviteUrl,
      qrCodeDataUrl,
      expiresAt: invite.expiresAt,
      expiresInSeconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    };
  }

  /**
   * Lấy trạng thái thời gian thực của mã mời QR (Dành cho Admin polling)
   */
  async getInviteStatus(token: string) {
    const invite = await this.prisma.saleInvite.findUnique({
      where: { token },
      include: {
        team: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, code: true } },
        usedByUser: { select: { id: true, name: true, code: true, email: true, phone: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException('Mã mời không tồn tại hoặc đã bị xóa.');
    }

    // Kiểm tra hết hạn tự động
    const isExpired = new Date() > invite.expiresAt;
    if (isExpired && (invite.status === InviteStatus.PENDING || invite.status === InviteStatus.SCANNED)) {
      await this.prisma.saleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      invite.status = InviteStatus.EXPIRED;
    }

    return {
      id: invite.id,
      token: invite.token,
      status: invite.status,
      teamId: invite.teamId,
      teamName: invite.team?.name || 'Chưa phân đội',
      createdBy: invite.createdBy.name,
      scannedAt: invite.scannedAt,
      usedAt: invite.usedAt,
      expiresAt: invite.expiresAt,
      isExpired,
      usedByUser: invite.usedByUser,
    };
  }

  /**
   * Ghi nhận nhân viên Sale vừa quét mã QR trên điện thoại
   */
  async markScanned(token: string) {
    const invite = await this.prisma.saleInvite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite) {
      throw new NotFoundException('Mã mời không tồn tại.');
    }

    if (new Date() > invite.expiresAt) {
      await this.prisma.saleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Mã QR mời này đã hết hạn sử dụng.');
    }

    if (invite.status === InviteStatus.COMPLETED) {
      throw new BadRequestException('Mã QR này đã được sử dụng thành công trước đó.');
    }

    if (invite.status === InviteStatus.CANCELLED) {
      throw new BadRequestException('Lời mời này đã bị hủy bỏ bởi Quản trị viên.');
    }

    // Nếu đang PENDING thì chuyển sang SCANNED
    if (invite.status === InviteStatus.PENDING) {
      await this.prisma.saleInvite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.SCANNED,
          scannedAt: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: invite.createdById,
          action: AuditAction.INVITE_SALE_SCANNED,
          resource: 'INVITATION',
          resourceId: invite.id,
          details: JSON.stringify({ token: invite.token }),
        },
      });
    }

    return {
      success: true,
      status: InviteStatus.SCANNED,
      teamName: invite.team?.name || 'Đội Kinh Doanh',
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Xác nhận tham gia: Tạo tài khoản Sale nội bộ và kích hoạt vào CRM
   */
  async acceptInvite(token: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.saleInvite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite) {
      throw new NotFoundException('Mã mời không tồn tại.');
    }

    // Kiểm tra hết hạn
    if (new Date() > invite.expiresAt) {
      await this.prisma.saleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Mã QR mời đã hết hạn. Vui lòng liên hệ Quản trị viên để nhận mã QR mới.');
    }

    // Kiểm tra tính một lần (One-time use)
    if (invite.status === InviteStatus.COMPLETED) {
      throw new BadRequestException('Mã QR này đã được sử dụng để kích hoạt tài khoản. Không thể sử dụng lại.');
    }

    if (invite.status === InviteStatus.CANCELLED) {
      throw new BadRequestException('Lời mời đã bị Quản trị viên hủy bỏ.');
    }

    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanPhone = dto.phone.trim();

    // Kiểm tra trùng lặp email hoặc số điện thoại
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { phone: cleanPhone }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Tài khoản với email hoặc số điện thoại này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc sử dụng thông tin khác.',
      );
    }

    // 1. Tạo mã nhân viên SALE tự động
    const saleCount = await this.prisma.user.count({ where: { role: UserRole.SALE } });
    const code = `SALE${String(saleCount + 1).padStart(2, '0')}`;

    // 2. Băm mật khẩu an toàn
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Thực thi Transaction nguyên tử
    const result = await this.prisma.$transaction(async (tx) => {
      // Tạo User với vai trò SALE (Server-side enforced, không cho phép nâng quyền)
      const newUser = await tx.user.create({
        data: {
          code,
          name: dto.name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password: hashedPassword,
          role: UserRole.SALE,
          status: UserStatus.ACTIVE,
          teamId: invite.teamId || null,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}`,
          zaloAccountName: dto.zaloAccountName?.trim() || dto.name.trim(),
          zaloPhone: cleanPhone,
        },
      });

      // Tạo kết nối Zalo cá nhân mặc định (ở trạng thái Gated)
      await tx.integrationConnection.create({
        data: {
          userId: newUser.id,
          provider: ProviderType.ZALO_PERSONAL,
          accountLabel: `Zalo Cá Nhân - ${newUser.name}`,
          connectionStatus: ConnectionStatus.NOT_CONNECTED,
          isDemo: false,
        },
      });

      // Tạo 3 Capabilities độc lập ở trạng thái NEEDS_VERIFICATION
      const capabilities = [
        IntegrationCapability.READ_CHATS,
        IntegrationCapability.SYNC_MESSAGES_FILES,
        IntegrationCapability.BULK_SEND,
      ];

      for (const cap of capabilities) {
        await tx.integrationCapabilityVerification.create({
          data: {
            userId: newUser.id,
            capability: cap,
            status: CapabilityVerificationStatus.NEEDS_VERIFICATION,
            method: 'Zalo Personal Standard Integration',
            verificationNotes: 'Khởi tạo qua lời mời mã QR.',
          },
        });
      }

      // Cập nhật trạng thái Invite thành COMPLETED
      await tx.saleInvite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.COMPLETED,
          usedAt: new Date(),
          usedByUserId: newUser.id,
        },
      });

      // Ghi nhận Audit Log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: AuditAction.INVITE_SALE_COMPLETED,
          resource: 'USER',
          resourceId: newUser.id,
          details: JSON.stringify({
            code: newUser.code,
            name: newUser.name,
            email: newUser.email,
            teamId: invite.teamId,
            inviteToken: invite.token,
          }),
        },
      });

      return newUser;
    });

    // 4. Ký JWT Auth Token cho người dùng mới đăng ký
    const accessToken = this.jwtService.sign({
      sub: result.id,
      email: result.email,
      role: result.role,
    });

    return {
      success: true,
      message: 'Chúc mừng bạn đã hoàn tất kích hoạt tài khoản nhân viên Sale!',
      user: {
        id: result.id,
        code: result.code,
        name: result.name,
        email: result.email,
        phone: result.phone,
        role: result.role,
        status: result.status,
        teamId: result.teamId,
        teamName: invite.team?.name || null,
      },
      accessToken,
    };
  }

  /**
   * Hủy lời mời mã QR (Dành cho Admin)
   */
  async cancelInvite(token: string, currentUserId: string) {
    const invite = await this.prisma.saleInvite.findUnique({ where: { token } });
    if (!invite) {
      throw new NotFoundException('Mã mời không tồn tại.');
    }

    if (invite.status === InviteStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy lời mời đã được nhân viên hoàn tất tham gia.');
    }

    const updated = await this.prisma.saleInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.CANCELLED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.INVITE_SALE_CANCELLED,
        resource: 'INVITATION',
        resourceId: invite.id,
        details: JSON.stringify({ token: invite.token }),
      },
    });

    return {
      success: true,
      message: 'Đã hủy lời mời thành công.',
      status: updated.status,
    };
  }
}
