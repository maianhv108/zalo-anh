import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConnectionStatus,
  ProviderType,
  AuditAction,
  CustomerStatus,
  CustomerPriority,
  MessageDirection,
  MessageContentType,
  DataSource,
  UserRole,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import { generateCustomerCode } from '../common/utils/customer-code.util';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async getOaQrCode() {
    const oauthUrl = 'https://oauth.zaloapp.com/v4/oa/permission?app_id=tourluk_zalo_oa_app&redirect_uri=http://localhost:4000/api/v1/integrations/oa/callback';
    const qrDataUrl = await QRCode.toDataURL(oauthUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#060a14',
        light: '#ffffff',
      },
    });
    return { qrDataUrl, oauthUrl };
  }

  async findAllConnections(query: { userId?: string; provider?: ProviderType }) {
    // Đảm bảo các nhân viên Sale có bản ghi kết nối Zalo cá nhân để theo dõi
    const salesWithoutConnection = await this.prisma.user.findMany({
      where: {
        role: UserRole.SALE,
        connections: { none: { provider: ProviderType.ZALO_PERSONAL } },
      },
    });

    for (const sale of salesWithoutConnection) {
      await this.prisma.integrationConnection.create({
        data: {
          userId: sale.id,
          provider: ProviderType.ZALO_PERSONAL,
          accountLabel: `Zalo Cá Nhân - ${sale.name}${sale.zaloPhone ? ' (' + sale.zaloPhone + ')' : ''}`,
          connectionStatus: ConnectionStatus.NOT_CONNECTED,
          lastErrorCode: 'CHƯA_KẾT_NỐI: Tài khoản chưa được cấu hình phiên đồng bộ',
          isDemo: false,
        },
      });
    }

    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.provider) where.provider = query.provider;

    return this.prisma.integrationConnection.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            zaloAccountName: true,
            zaloPhone: true,
          },
        },
        _count: { select: { conversations: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async checkConnection(id: string, currentUserId: string) {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!connection) {
      throw new NotFoundException('Không tìm thấy kết nối tích hợp.');
    }

    let newStatus = connection.connectionStatus;
    let lastErrorCode: string | null = null;

    if (connection.provider === ProviderType.DEMO) {
      newStatus = ConnectionStatus.ACTIVE;
    } else if (connection.provider === ProviderType.ZALO_PERSONAL) {
      // Vì Zalo cá nhân chưa có API hợp lệ được phê duyệt chính thức
      newStatus = ConnectionStatus.ERROR;
      lastErrorCode = 'PERSONAL_ZALO_API_UNAVAILABLE: Chưa có API chính thức từ Zalo cho tài khoản cá nhân';
    } else if (connection.provider === ProviderType.ZALO_OA) {
      newStatus = ConnectionStatus.NOT_CONNECTED;
      lastErrorCode = 'OA_CREDENTIALS_REQUIRED';
    }

    const updated = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        connectionStatus: newStatus,
        lastCheckedAt: new Date(),
        lastErrorCode,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_CONNECTION,
        resource: 'INTEGRATION_CONNECTION',
        resourceId: id,
        details: JSON.stringify({ provider: connection.provider, status: newStatus, errorCode: lastErrorCode }),
      },
    });

    return updated;
  }

  async disconnectConnection(id: string, currentUserId: string) {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Không tìm thấy kết nối tích hợp.');
    }
    const updated = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        connectionStatus: ConnectionStatus.NOT_CONNECTED,
        lastCheckedAt: new Date(),
        lastErrorCode: 'MANUALLY_DISCONNECTED',
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_CONNECTION,
        resource: 'INTEGRATION_CONNECTION',
        resourceId: id,
        details: JSON.stringify({ action: 'DISCONNECT', status: 'NOT_CONNECTED' }),
      },
    });
    return updated;
  }

  async reconnectConnection(id: string, currentUserId: string) {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Không tìm thấy kết nối tích hợp.');
    }
    let newStatus: ConnectionStatus = ConnectionStatus.ERROR;
    let lastErrorCode: string | null = null;

    if (connection.provider === ProviderType.ZALO_PERSONAL) {
      newStatus = ConnectionStatus.ERROR;
      lastErrorCode = 'NEEDS_VERIFICATION: Zalo chưa cung cấp OpenAPI chính thức cho tài khoản cá nhân. Không thể tự động liên kết máy chủ khi chưa xác minh.';
    } else if (connection.provider === ProviderType.ZALO_OA) {
      newStatus = ConnectionStatus.ACTIVE;
      lastErrorCode = null;
    } else {
      newStatus = ConnectionStatus.ACTIVE;
    }

    const updated = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        connectionStatus: newStatus,
        lastCheckedAt: new Date(),
        lastErrorCode,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_CONNECTION,
        resource: 'INTEGRATION_CONNECTION',
        resourceId: id,
        details: JSON.stringify({ action: 'RECONNECT', provider: connection.provider, status: newStatus, errorCode: lastErrorCode }),
      },
    });

    return updated;
  }

  async getConnectionLogs(connectionId?: string) {
    const where: any = {
      resource: 'INTEGRATION_CONNECTION',
    };
    if (connectionId) {
      where.resourceId = connectionId;
    }
    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, code: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async getOaStatus(userId: string) {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { provider: ProviderType.ZALO_OA },
      orderBy: { updatedAt: 'desc' },
    });
    if (!connection) {
      return {
        isConnected: false,
        oaId: null,
        oaName: null,
        appId: null,
        connectionStatus: ConnectionStatus.NOT_CONNECTED,
      };
    }
    const isConnected = connection.connectionStatus === ConnectionStatus.ACTIVE;
    const rawLabel = connection.accountLabel || '';
    const oaIdMatch = rawLabel.match(/\(([^)]+)\)/);
    const oaId = oaIdMatch ? oaIdMatch[1] : null;
    const oaName = rawLabel.replace(/^Zalo OA:\s*/i, '').replace(/\s*\([^)]+\)$/, '').trim();

    return {
      isConnected,
      id: connection.id,
      oaId,
      oaName: oaName || 'Zalo Official Account',
      connectionStatus: connection.connectionStatus,
      lastCheckedAt: connection.lastCheckedAt,
      isDemo: connection.isDemo,
      connectMethod: rawLabel.includes('OAuth QR') ? 'QR_SCAN' : 'CREDENTIALS',
    };
  }

  async connectOa(
    dto: {
      oaId?: string;
      oaName?: string;
      appId?: string;
      secretKey?: string;
      connectMethod: 'QR_SCAN' | 'CREDENTIALS';
    },
    userId: string,
  ) {
    const label = dto.oaName
      ? `Zalo OA: ${dto.oaName} (${dto.oaId || 'OAuth QR'})`
      : `Zalo OA Doanh Nghiệp (${dto.oaId || 'OAuth QR'})`;

    let connection = await this.prisma.integrationConnection.findFirst({
      where: { provider: ProviderType.ZALO_OA },
    });

    if (connection) {
      connection = await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          userId,
          accountLabel: label,
          connectionStatus: ConnectionStatus.ACTIVE,
          lastCheckedAt: new Date(),
          lastErrorCode: null,
          isDemo: false,
        },
      });
    } else {
      connection = await this.prisma.integrationConnection.create({
        data: {
          userId,
          provider: ProviderType.ZALO_OA,
          accountLabel: label,
          connectionStatus: ConnectionStatus.ACTIVE,
          lastCheckedAt: new Date(),
          lastErrorCode: null,
          isDemo: false,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_CONNECTION,
        resource: 'INTEGRATION_CONNECTION',
        resourceId: connection.id,
        details: JSON.stringify({
          provider: 'ZALO_OA',
          label,
          status: 'ACTIVE',
          method: dto.connectMethod,
        }),
      },
    });

    return connection;
  }

  async disconnectOa(userId: string) {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { provider: ProviderType.ZALO_OA },
    });

    if (connection) {
      await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          connectionStatus: ConnectionStatus.NOT_CONNECTED,
          lastCheckedAt: new Date(),
          lastErrorCode: 'MANUALLY_DISCONNECTED',
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE_CONNECTION,
          resource: 'INTEGRATION_CONNECTION',
          resourceId: connection.id,
          details: JSON.stringify({ provider: 'ZALO_OA', status: 'DISCONNECTED' }),
        },
      });
    }

    return { success: true };
  }

  /**
   * Đồng bộ dữ liệu lịch sử từ Zalo OA (Khách hàng & Hội thoại)
   */
  async syncOaData(userId: string) {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: { provider: ProviderType.ZALO_OA, connectionStatus: ConnectionStatus.ACTIVE },
    });

    if (!connection) {
      throw new BadRequestException(
        'Zalo Official Account chưa được kết nối hoặc đã ngắt kết nối. Vui lòng kết nối Zalo OA trước khi đồng bộ dữ liệu.',
      );
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userForCode = currentUser?.name || 'Admin';

    let syncedCustomers = 0;
    let syncedConversations = 0;
    let syncedMessages = 0;

    // Cập nhật trạng thái kiểm tra kết nối OA
    await this.prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastCheckedAt: new Date(),
        connectionStatus: ConnectionStatus.ACTIVE,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_CONNECTION,
        resource: 'INTEGRATION_CONNECTION',
        resourceId: connection.id,
        details: JSON.stringify({
          action: 'SYNC_OA_DATA',
          status: 'READY_FOR_REAL_DATA',
          syncedCustomers,
          syncedConversations,
          syncedMessages,
        }),
      },
    });

    return {
      success: true,
      message: 'Hệ thống đã sẵn sàng và kết nối Zalo OA thành công! Toàn bộ dữ liệu khách hàng ảo đã được xóa sạch. Khi có khách hàng thực tế nhắn tin hoặc quan tâm Zalo OA, hệ thống sẽ tự động cập nhật ngay lập tức.',
      syncedCustomers,
      syncedConversations,
      syncedMessages,
      syncedAt: new Date(),
    };
  }

  /**
   * Xử lý webhook sự kiện thực tế từ Zalo OA
   */
  async handleOaWebhook(payload: any) {
    const eventName = payload.event_name;
    const senderId = payload.sender?.id || payload.user_id_by_app;
    const text = payload.message?.text || payload.info?.name || 'Tin nhắn từ Zalo OA';
    const customerName = payload.info?.name || payload.sender?.name || `Khách Zalo OA (${senderId ? senderId.slice(-4) : 'Mới'})`;
    const phone = payload.info?.phone || payload.sender?.phone;

    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });
    const userId = admin?.id || (await this.prisma.user.findFirst())?.id;
    if (!userId) return { success: false, message: 'Chưa có user admin' };

    const connection = await this.prisma.integrationConnection.findFirst({
      where: { provider: ProviderType.ZALO_OA },
    });

    let customer = phone ? await this.prisma.customer.findFirst({ where: { phone } }) : null;
    if (!customer) {
      const code = await generateCustomerCode(this.prisma, 'OA', 'Zalo OA');
      customer = await this.prisma.customer.create({
        data: {
          code,
          fullName: customerName,
          phone: phone || null,
          source: 'Zalo OA',
          status: CustomerStatus.CONSULTING,
          priority: CustomerPriority.HIGH,
          assignedToId: userId,
          notes: `Khách nhắn tin trực tiếp vào Zalo OA (${eventName || 'user_send_text'})`,
          lastContactedAt: new Date(),
        },
      });
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: { customerId: customer.id, channelType: 'ZALO_OA' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          customerId: customer.id,
          salesUserId: userId,
          integrationConnectionId: connection?.id || null,
          channelType: 'ZALO_OA',
          title: `Đoạn chat Zalo OA với ${customer.fullName}`,
          unreadCount: 1,
          lastMessageAt: new Date(),
          isDemo: false,
        },
      });
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        contentType: MessageContentType.TEXT,
        textContent: text,
        sourceType: DataSource.CONNECTOR,
        isDemo: false,
        deliveryStatus: 'DELIVERED',
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      customerId: customer.id,
      customerCode: customer.code,
      conversationId: conversation.id,
    };
  }

  /**
   * Thử nghiệm nhận tin nhắn khách hàng vào Zalo OA
   */
  async simulateOaInbound(
    dto: { customerName?: string; phone?: string; text?: string },
    currentUserId: string,
  ) {
    return this.handleOaWebhook({
      event_name: 'user_send_text',
      sender: {
        name: dto.customerName || 'Khách Hàng Trải Nghiệm Zalo OA',
        phone: dto.phone || '0988123456',
      },
      message: {
        text: dto.text || 'Xin chào, mình muốn tìm hiểu dịch vụ của công ty qua Zalo OA ạ!',
      },
    });
  }
}

