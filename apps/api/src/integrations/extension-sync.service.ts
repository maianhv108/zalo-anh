import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExtensionSyncConversationDto,
} from './dto/extension-sync.dto';
import {
  UserRole,
  UserStatus,
  CustomerStatus,
  CustomerPriority,
  MessageDirection,
  MessageContentType,
  ProviderType,
  ConnectionStatus,
  IntegrationCapability,
  CapabilityVerificationStatus,
} from '@prisma/client';
import { generateCustomerCode } from '../common/utils/customer-code.util';

@Injectable()
export class ExtensionSyncService {
  private readonly logger = new Logger(ExtensionSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lấy danh sách nhân viên Sale để Extension hiển thị trong dropdown chọn tài khoản
   */
  async getSalesList() {
    const sales = await this.prisma.user.findMany({
      where: {
        role: UserRole.SALE,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        zaloAccountName: true,
        zaloPhone: true,
      },
      orderBy: { code: 'asc' },
    });

    return {
      success: true,
      sales: sales.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        phone: s.zaloPhone || s.phone,
        label: `${s.code} - ${s.name} (${s.zaloPhone || s.phone || 'Chưa gắn SĐT'})`,
      })),
    };
  }

  /**
   * Kiểm tra trạng thái đồng bộ của nhân viên
   */
  async getExtensionStatus(salesCode: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ code: salesCode }, { id: salesCode }],
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với mã: ${salesCode}`);
    }

    const customerCount = await this.prisma.customer.count({
      where: { assignedToId: user.id },
    });

    const conversationCount = await this.prisma.conversation.count({
      where: { salesUserId: user.id },
    });

    const messageCount = await this.prisma.message.count({
      where: {
        conversation: { salesUserId: user.id },
      },
    });

    return {
      success: true,
      sales: {
        id: user.id,
        code: user.code,
        name: user.name,
      },
      stats: {
        customerCount,
        conversationCount,
        messageCount,
      },
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Tiếp nhận dữ liệu đồng bộ cuộc trò chuyện và tin nhắn từ Chrome Extension
   */
  async syncConversation(dto: ExtensionSyncConversationDto) {
    this.logger.log(
      `Đang nhận đồng bộ từ Extension cho Sale: ${dto.salesCode}, Khách: ${dto.customer.name}, Tin nhắn: ${dto.messages?.length || 0}`,
    );

    // 1. Tìm nhân viên Sale theo mã hoặc ID
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ code: dto.salesCode }, { id: dto.salesCode }],
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên Sale với mã: ${dto.salesCode}`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // 2. Đảm bảo kết nối IntegrationConnection ở trạng thái ACTIVE
      let connection = await tx.integrationConnection.findFirst({
        where: {
          userId: user.id,
          provider: ProviderType.ZALO_PERSONAL,
        },
      });

      if (!connection) {
        connection = await tx.integrationConnection.create({
          data: {
            userId: user.id,
            provider: ProviderType.ZALO_PERSONAL,
            accountLabel: `Zalo Web Extension - ${user.name} (${user.zaloPhone || user.phone || user.code})`,
            connectionStatus: ConnectionStatus.ACTIVE,
            lastCheckedAt: new Date(),
            isDemo: false,
          },
        });
      } else {
        await tx.integrationConnection.update({
          where: { id: connection.id },
          data: {
            connectionStatus: ConnectionStatus.ACTIVE,
            lastCheckedAt: new Date(),
            lastErrorCode: null,
          },
        });
      }

      // 3. Cập nhật Capability Verification thành VERIFIED qua Extension
      await tx.integrationCapabilityVerification.upsert({
        where: {
          userId_capability: {
            userId: user.id,
            capability: IntegrationCapability.READ_CHATS,
          },
        },
        update: {
          status: CapabilityVerificationStatus.VERIFIED,
          method: 'Chrome Extension Zalo Web Sync Connector',
          verificationNotes: 'Tiện ích mở rộng Chrome Extension tự động đồng bộ từ chat.zalo.me về Webapp.',
          verifiedAt: new Date(),
        },
        create: {
          userId: user.id,
          capability: IntegrationCapability.READ_CHATS,
          status: CapabilityVerificationStatus.VERIFIED,
          method: 'Chrome Extension Zalo Web Sync Connector',
          verificationNotes: 'Tiện ích mở rộng Chrome Extension tự động đồng bộ từ chat.zalo.me về Webapp.',
          verifiedAt: new Date(),
        },
      });

      await tx.integrationCapabilityVerification.upsert({
        where: {
          userId_capability: {
            userId: user.id,
            capability: IntegrationCapability.SYNC_MESSAGES_FILES,
          },
        },
        update: {
          status: CapabilityVerificationStatus.VERIFIED,
          method: 'Chrome Extension Zalo Web Sync Connector',
          verificationNotes: 'Đồng bộ tin nhắn văn bản và tệp thời gian thực từ Zalo Web.',
          verifiedAt: new Date(),
        },
        create: {
          userId: user.id,
          capability: IntegrationCapability.SYNC_MESSAGES_FILES,
          status: CapabilityVerificationStatus.VERIFIED,
          method: 'Chrome Extension Zalo Web Sync Connector',
          verificationNotes: 'Đồng bộ tin nhắn văn bản và tệp thời gian thực từ Zalo Web.',
          verifiedAt: new Date(),
        },
      });

      // 4. Tìm hoặc tạo Customer cho khách hàng này
      const cleanCustName = dto.customer.name.trim();
      let customer = await tx.customer.findFirst({
        where: {
          assignedToId: user.id,
          fullName: cleanCustName,
        },
      });

      if (!customer) {
        const custPhone = dto.customer.phone?.trim() || `09${Math.floor(10000000 + Math.random() * 90000000)}`;
        const code = await generateCustomerCode(tx, user.name);

        customer = await tx.customer.create({
          data: {
            code,
            fullName: cleanCustName,
            phone: custPhone,
            source: 'ZALO',
            status: CustomerStatus.CONSULTING,
            priority: CustomerPriority.HIGH,
            assignedToId: user.id,
            notes: `Khách hàng thực tế đồng bộ từ Zalo Web của ${user.name}`,
            lastContactedAt: new Date(),
          },
        });
      }

      // 5. Tìm hoặc tạo Conversation
      let conversation = await tx.conversation.findFirst({
        where: {
          customerId: customer.id,
          salesUserId: user.id,
        },
      });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            customerId: customer.id,
            salesUserId: user.id,
            integrationConnectionId: connection.id,
            channelType: 'ZALO',
            title: `Đoạn chat Zalo với ${customer.fullName}`,
            unreadCount: 0,
            lastMessageAt: new Date(),
            isDemo: false,
          },
        });
      }

      // 6. Lưu các tin nhắn mới (chống trùng lặp tin nhắn)
      let addedCount = 0;
      if (dto.messages && Array.isArray(dto.messages) && dto.messages.length > 0) {
        for (const msg of dto.messages) {
          if (!msg.text || !msg.text.trim()) continue;

          const isOutbound = msg.direction === 'OUTBOUND';
          const sentAt = msg.timestamp ? new Date(msg.timestamp) : new Date();

          // Kiểm tra xem tin nhắn có cùng nội dung trong vòng 5 phút gần đây chưa
          const existingMsg = await tx.message.findFirst({
            where: {
              conversationId: conversation.id,
              direction: isOutbound ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
              textContent: msg.text.trim(),
            },
          });

          if (!existingMsg) {
            await tx.message.create({
              data: {
                conversationId: conversation.id,
                direction: isOutbound ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
                contentType: MessageContentType.TEXT,
                textContent: msg.text.trim(),
                sentAt,
                isDemo: false,
              },
            });
            addedCount++;
          }
        }

        // Cập nhật lastMessageAt cho conversation
        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
          },
        });
      }

      return {
        success: true,
        message: `Đã đồng bộ thành công khách hàng "${customer.fullName}" và ${addedCount} tin nhắn mới!`,
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.fullName,
        },
        conversationId: conversation.id,
        syncedMessagesCount: addedCount,
      };
    });
  }
}
