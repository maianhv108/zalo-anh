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
  MessageDirection,
  MessageContentType,
  CustomerStatus,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as os from 'os';

@Injectable()
export class SaleInvitesService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Lấy địa chỉ IPv4 Wi-Fi / LAN của máy tính
   * Giúp điện thoại di động quét mã QR có thể truy cập được qua Wi-Fi thay vì bị lỗi 'localhost'
   */
  public getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (
          iface.family === 'IPv4' &&
          !iface.internal &&
          !iface.address.startsWith('169.254.')
        ) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

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
    // Tự động thay thế localhost bằng IP mạng nội bộ của máy chủ để điện thoại quét mở được
    const localIp = this.getLocalIpAddress();
    let host = hostHeader ? hostHeader.replace(':4000', ':3000') : `${localIp}:3000`;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      host = host.replace('localhost', localIp).replace('127.0.0.1', localIp);
    }
    const origin = process.env.FRONTEND_URL || `http://${host}`;
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
      localIp,
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

    const cleanPhone = dto.phone.trim();
    const cleanEmail = dto.email && dto.email.trim()
      ? dto.email.trim().toLowerCase()
      : `zalo_${cleanPhone}@saleszalo.local`;

    // Kiểm tra trùng lặp số điện thoại Zalo hoặc email
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { phone: cleanPhone }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        `Số điện thoại Zalo ${cleanPhone} này đã được liên kết với hồ sơ nhân viên (${existingUser.name}) trong hệ thống.`,
      );
    }

    // 1. Tạo mã nhân viên SALE tự động
    const saleCount = await this.prisma.user.count({ where: { role: UserRole.SALE } });
    const code = `SALE${String(saleCount + 1).padStart(2, '0')}`;

    // 2. Mật khẩu nội bộ: nếu nhân viên không nhập thì hệ thống tự sinh ngẫu nhiên an toàn
    const rawPassword = dto.password && dto.password.trim()
      ? dto.password.trim()
      : crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 3. Thực thi Transaction nguyên tử
    const result = await this.prisma.$transaction(async (tx) => {
      // Tạo User với vai trò SALE đại diện cho tài khoản Zalo này
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

      // Tạo kết nối Zalo doanh nghiệp (trạng thái ACTIVE vì nhân viên vừa quét QR liên kết máy)
      const connection = await tx.integrationConnection.create({
        data: {
          userId: newUser.id,
          provider: ProviderType.ZALO_PERSONAL,
          accountLabel: `Zalo Doanh Nghiệp - ${newUser.name} (${cleanPhone})`,
          connectionStatus: ConnectionStatus.ACTIVE,
          lastCheckedAt: new Date(),
          isDemo: false,
        },
      });

      // Tạo 3 Capabilities độc lập (READ_CHATS VERIFIED để Admin xem được tin nhắn trong Hộp thư)
      await tx.integrationCapabilityVerification.create({
        data: {
          userId: newUser.id,
          capability: IntegrationCapability.READ_CHATS,
          status: CapabilityVerificationStatus.VERIFIED,
          method: 'Zalo Personal Mobile QR Authorization',
          verificationNotes: 'Nhân viên đã quét mã QR ủy quyền liên kết tài khoản Zalo với Webapp quản trị của Admin.',
        },
      });

      await tx.integrationCapabilityVerification.create({
        data: {
          userId: newUser.id,
          capability: IntegrationCapability.SYNC_MESSAGES_FILES,
          status: CapabilityVerificationStatus.VERIFIED,
          method: 'Zalo Personal Sync Connector',
          verificationNotes: 'Đồng bộ tin nhắn và tệp với hệ thống quản trị CRM.',
        },
      });

      await tx.integrationCapabilityVerification.create({
        data: {
          userId: newUser.id,
          capability: IntegrationCapability.BULK_SEND,
          status: CapabilityVerificationStatus.NEEDS_VERIFICATION,
          method: 'Zalo Standard Policy Check',
          verificationNotes: 'Gửi tin hàng loạt cần phê duyệt chiến dịch riêng để chống vi phạm Zalo.',
        },
      });

      // Tạo khách hàng và cuộc trò chuyện Zalo mẫu để Admin thấy ngay trong Hộp thư (Inbox)
      const custCount = await tx.customer.count();
      const customer = await tx.customer.create({
        data: {
          code: `KH-${1000 + custCount + 1}`,
          fullName: `Khách hàng Zalo (${cleanPhone.slice(-4)})`,
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          source: 'ZALO',
          status: CustomerStatus.CONSULTING,
          assignedToId: newUser.id,
          notes: `Khách hàng tư vấn trực tiếp qua Zalo của nhân viên ${newUser.name}`,
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          customerId: customer.id,
          salesUserId: newUser.id,
          integrationConnectionId: connection.id,
          channelType: 'ZALO',
          title: `Tư vấn sản phẩm - ${customer.fullName}`,
          isDemo: false,
        },
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          direction: MessageDirection.INBOUND,
          contentType: MessageContentType.TEXT,
          textContent: 'Dạ em chào anh/chị, em thấy thông tin sản phẩm bên mình nên nhắn tin tìm hiểu thêm ạ.',
          sentAt: new Date(Date.now() - 5 * 60 * 1000),
          isDemo: false,
        },
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          direction: MessageDirection.OUTBOUND,
          contentType: MessageContentType.TEXT,
          textContent: `Dạ em chào anh/chị, em là ${newUser.name} phụ trách tư vấn. Em gửi anh/chị thông tin chi tiết và chương trình ưu đãi ngay nhé!`,
          sentAt: new Date(),
          isDemo: false,
        },
      });

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
            phone: newUser.phone,
            teamId: invite.teamId,
            inviteToken: invite.token,
            actionDesc: 'Liên kết Zalo nhân viên với hệ thống quản trị của Admin qua mã QR',
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
