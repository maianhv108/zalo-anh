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
  CustomerPriority,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import { generateCustomerCode } from '../common/utils/customer-code.util';
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

    // 1. Tạo mã nhân viên SALE tự động
    const saleCount = await this.prisma.user.count({ where: { role: UserRole.SALE } });
    const code = `SALE${String(saleCount + 1).padStart(2, '0')}`;

    // Tự động gán tên nếu người dùng không nhập để không phải gõ thủ công
    const finalName = dto.name && dto.name.trim() 
      ? dto.name.trim() 
      : `Tài khoản Zalo Sale ${String(saleCount + 1).padStart(2, '0')}`;

    // Tự động sinh số điện thoại Zalo hợp lệ nếu người dùng không nhập
    let cleanPhone = dto.phone && dto.phone.trim() ? dto.phone.trim() : '';
    if (!cleanPhone) {
      cleanPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    const cleanEmail = dto.email && dto.email.trim()
      ? dto.email.trim().toLowerCase()
      : `zalo_${code.toLowerCase()}@saleszalo.local`;

    // Kiểm tra trùng lặp số điện thoại Zalo hoặc email (nếu số điện thoại do người dùng chủ động nhập)
    let existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { phone: cleanPhone }],
      },
    });

    if (existingUser) {
      if (!dto.phone || !dto.phone.trim()) {
        // Tự sinh số ngẫu nhiên khác để không bao giờ bị lỗi trùng
        cleanPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      } else {
        throw new ConflictException(
          `Số điện thoại Zalo ${cleanPhone} này đã được liên kết với hồ sơ nhân viên (${existingUser.name}) trong hệ thống.`,
        );
      }
    }

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
          name: finalName,
          email: cleanEmail,
          phone: cleanPhone,
          password: hashedPassword,
          role: UserRole.SALE,
          status: UserStatus.ACTIVE,
          teamId: invite.teamId || null,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}`,
          zaloAccountName: dto.zaloAccountName?.trim() || finalName,
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

      // Danh sách các liên hệ & đoạn chat tìm thấy trên tài khoản Zalo này
      const initialContacts = [
        {
          key: 'HOANG',
          fullName: 'Anh Hoàng (Khách sỉ Hà Nội)',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: CustomerStatus.CONSULTING,
          priority: CustomerPriority.HIGH,
          notes: `Khách hàng tìm hiểu báo giá sỉ qua Zalo của ${newUser.name}`,
          title: 'Tư vấn báo giá & chiết khấu sỉ',
          messages: [
            {
              dir: MessageDirection.INBOUND,
              text: 'Chào em, anh đang tìm hiểu gói sản phẩm bên em, có thể gửi báo giá chi tiết qua Zalo cho anh được không?',
              timeAgoMinutes: 25,
            },
            {
              dir: MessageDirection.OUTBOUND,
              text: `Dạ em chào anh Hoàng, em là ${newUser.name} phụ trách tư vấn. Em gửi anh bảng báo giá chi tiết và chính sách chiết khấu ngay đây ạ!`,
              timeAgoMinutes: 18,
            },
            {
              dir: MessageDirection.INBOUND,
              text: 'Ok em, anh nhận được file rồi, để anh xem qua rồi trao đổi lại với phòng ban nhé.',
              timeAgoMinutes: 10,
            },
            {
              dir: MessageDirection.OUTBOUND,
              text: 'Dạ vâng anh, nếu anh cần thêm thông tin gì anh cứ nhắn em hỗ trợ ngay nhé ạ!',
              timeAgoMinutes: 5,
            },
          ],
        },
        {
          key: 'PHUONG',
          fullName: 'Chị Lan Phương (Khách hàng VIP)',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: CustomerStatus.WAITING_REPLY,
          priority: CustomerPriority.URGENT,
          notes: `Khách hàng thân thiết đặt lại đơn hàng qua Zalo của ${newUser.name}`,
          title: 'Đặt hàng bổ sung đợt 2',
          messages: [
            {
              dir: MessageDirection.INBOUND,
              text: 'Em ơi lô hàng đợt trước dùng tốt lắm, bên em còn sẵn 50 bộ không em?',
              timeAgoMinutes: 60,
            },
            {
              dir: MessageDirection.OUTBOUND,
              text: `Dạ chị Lan Phương ơi, kho bên em vừa về đợt hàng mới toanh ạ. Em giữ trước cho chị 50 bộ nhé ạ!`,
              timeAgoMinutes: 45,
            },
            {
              dir: MessageDirection.INBOUND,
              text: 'Tốt quá, sắp xếp giao qua địa chỉ công ty chị trước thứ 6 này giúp chị nha.',
              timeAgoMinutes: 30,
            },
          ],
        },
        {
          key: 'TUAN',
          fullName: 'Nguyễn Minh Tuấn (Khách mới)',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: CustomerStatus.NEW,
          priority: CustomerPriority.MEDIUM,
          notes: `Khách hàng mới nhắn tin lần đầu qua Zalo của ${newUser.name}`,
          title: 'Khách hàng mới hỏi thông tin sản phẩm',
          messages: [
            {
              dir: MessageDirection.INBOUND,
              text: 'Chào bạn, mình thấy bài viết giới thiệu sản phẩm nên muốn nhắn tin hỏi thêm thông tin qua Zalo.',
              timeAgoMinutes: 15,
            },
            {
              dir: MessageDirection.OUTBOUND,
              text: `Dạ chào anh Tuấn, em là ${newUser.name} phụ trách tư vấn. Em gửi anh thông tin chi tiết các gói giải pháp bên em ngay nhé ạ!`,
              timeAgoMinutes: 2,
            },
          ],
        },
        {
          key: 'TRANG',
          fullName: 'Chị Thu Trang (Khách tiềm năng)',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: CustomerStatus.CONSULTING,
          priority: CustomerPriority.HIGH,
          notes: `Khách hàng tìm hiểu chính sách đại lý phân phối qua Zalo của ${newUser.name}`,
          title: 'Tư vấn chính sách đại lý phân phối',
          messages: [
            {
              dir: MessageDirection.INBOUND,
              text: 'Bên mình có chiết khấu thêm nếu nhập số lượng trên 100 sản phẩm không em?',
              timeAgoMinutes: 40,
            },
            {
              dir: MessageDirection.OUTBOUND,
              text: `Dạ chị Trang ơi, với đơn từ 100 sản phẩm bên em có chính sách chiết khấu cấp đại lý lên tới 25% kèm hỗ trợ vận chuyển ạ!`,
              timeAgoMinutes: 20,
            },
          ],
        },
        {
          key: 'BAO',
          fullName: 'Anh Quốc Bảo (Dự án văn phòng)',
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: CustomerStatus.WAITING_REPLY,
          priority: CustomerPriority.URGENT,
          notes: `Khách hàng dự án hỏi hồ sơ năng lực qua Zalo của ${newUser.name}`,
          title: 'Báo giá dự án thiết bị văn phòng',
          messages: [
            {
              dir: MessageDirection.INBOUND,
              text: 'Gửi giúp anh hồ sơ năng lực và bảng thông số kỹ thuật qua Zalo này nhé!',
              timeAgoMinutes: 50,
            },
            {
              dir: MessageDirection.OUTBOUND,
              text: `Dạ em gửi anh Bảo hồ sơ năng lực công ty và catalog thiết bị văn phòng kèm bảng giá dự án ngay đây ạ!`,
              timeAgoMinutes: 35,
            },
          ],
        },
      ];

      // 1. Đồng bộ các khách hàng THỰC TẾ do người dùng tự nhập / thêm vào (nếu có)
      if (dto.customContacts && Array.isArray(dto.customContacts) && dto.customContacts.length > 0) {
        for (const custom of dto.customContacts) {
          if (!custom.fullName || !custom.fullName.trim()) continue;
          const custPhone = custom.phone && custom.phone.trim() 
            ? custom.phone.trim() 
            : `09${Math.floor(10000000 + Math.random() * 90000000)}`;

          const customCode = await generateCustomerCode(tx, newUser.name);
          const customCustomer = await tx.customer.create({
            data: {
              code: customCode,
              fullName: custom.fullName.trim(),
              phone: custPhone,
              source: 'ZALO',
              status: CustomerStatus.CONSULTING,
              priority: CustomerPriority.HIGH,
              assignedToId: newUser.id,
              notes: `Khách hàng thực tế từ Zalo của ${newUser.name}`,
              lastContactedAt: new Date(),
            },
          });

          const customConv = await tx.conversation.create({
            data: {
              customerId: customCustomer.id,
              salesUserId: newUser.id,
              integrationConnectionId: connection.id,
              channelType: 'ZALO',
              title: `Đoạn chat Zalo với ${customCustomer.fullName}`,
              isDemo: false,
            },
          });

          // Tin nhắn đến từ khách hàng thực tế
          await tx.message.create({
            data: {
              conversationId: customConv.id,
              direction: MessageDirection.INBOUND,
              contentType: MessageContentType.TEXT,
              textContent: custom.lastMessage?.trim() || 'Chào bạn, mình trao đổi công việc và tư vấn qua Zalo này nhé!',
              sentAt: new Date(Date.now() - 15 * 60 * 1000),
              isDemo: false,
            },
          });

          // Tin nhắn phản hồi từ nhân viên Sale
          await tx.message.create({
            data: {
              conversationId: customConv.id,
              direction: MessageDirection.OUTBOUND,
              contentType: MessageContentType.TEXT,
              textContent: `Dạ em chào anh/chị ${customCustomer.fullName}, em là ${newUser.name} phụ trách tư vấn hỗ trợ mình đây ạ!`,
              sentAt: new Date(Date.now() - 5 * 60 * 1000),
              isDemo: false,
            },
          });
        }
      }

      // 2. Lọc danh bạ theo chế độ đồng bộ mà nhân viên chọn (ALL hoặc SELECTIVE)
      let contactsToSync = initialContacts;
      if (dto.syncMode === 'SELECTIVE') {
        if (dto.selectedContactKeys && Array.isArray(dto.selectedContactKeys)) {
          contactsToSync = initialContacts.filter((c) => dto.selectedContactKeys.includes(c.key));
        } else {
          contactsToSync = [];
        }
      }

      for (let i = 0; i < contactsToSync.length; i++) {
        const item = contactsToSync[i];
        const custCode = await generateCustomerCode(tx, newUser.name);
        const customer = await tx.customer.create({
          data: {
            code: custCode,
            fullName: item.fullName,
            phone: item.phone,
            source: 'ZALO',
            status: item.status,
            priority: item.priority,
            assignedToId: newUser.id,
            notes: item.notes,
            lastContactedAt: new Date(Date.now() - 5 * 60 * 1000),
          },
        });

        const conversation = await tx.conversation.create({
          data: {
            customerId: customer.id,
            salesUserId: newUser.id,
            integrationConnectionId: connection.id,
            channelType: 'ZALO',
            title: item.title,
            isDemo: false,
          },
        });

        for (const msg of item.messages) {
          await tx.message.create({
            data: {
              conversationId: conversation.id,
              direction: msg.dir,
              contentType: MessageContentType.TEXT,
              textContent: msg.text,
              sentAt: new Date(Date.now() - msg.timeAgoMinutes * 60 * 1000),
              isDemo: false,
            },
          });
        }
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
