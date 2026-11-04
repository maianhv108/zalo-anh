import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
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
  DataSource,
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
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        zaloAccountName: true,
        zaloPhone: true,
      },
      orderBy: { code: 'asc' },
    });

    const oaConnection = await this.prisma.integrationConnection.findFirst({
      where: { provider: ProviderType.ZALO_OA },
    });

    return {
      success: true,
      sales: [
        {
          id: 'OA',
          code: 'OA',
          name: 'Zalo OA Doanh Nghiệp (TourLuk Travel Official)',
          phone: oaConnection?.accountLabel || '4585991630126061653',
          label: '🏢 [Zalo OA] TourLuk Travel Official (Kênh Doanh Nghiệp)',
        },
        ...sales.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          phone: s.zaloPhone || s.phone,
          label: `👤 ${s.code} - ${s.name} (${s.role === 'ADMIN' ? 'Quản trị' : 'Sale'})`,
        })),
      ],
    };
  }

  /**
   * Kiểm tra trạng thái đồng bộ của nhân viên hoặc Zalo OA
   */
  async getExtensionStatus(salesCode: string) {
    if (salesCode === 'OA') {
      const customerCount = await this.prisma.customer.count({
        where: { source: 'Zalo OA' },
      });
      const conversationCount = await this.prisma.conversation.count({
        where: { channelType: 'ZALO_OA' },
      });
      const messageCount = await this.prisma.message.count({
        where: {
          conversation: { channelType: 'ZALO_OA' },
        },
      });

      return {
        success: true,
        sales: {
          id: 'OA',
          code: 'OA',
          name: 'Zalo OA Doanh Nghiệp (TourLuk Travel Official)',
        },
        stats: {
          customerCount,
          conversationCount,
          messageCount,
        },
        serverTime: new Date().toISOString(),
      };
    }

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
    const isOa = dto.salesCode === 'OA' || dto.channelType === 'ZALO_OA' || dto.isOa === true;

    this.logger.log(
      `Đang nhận đồng bộ từ Extension cho ${isOa ? 'Zalo OA' : 'Sale: ' + dto.salesCode}, Khách: ${dto.customer.name}, Tin nhắn: ${dto.messages?.length || 0}`,
    );

    let user;
    if (isOa) {
      user = await this.prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
      });
      if (!user) user = await this.prisma.user.findFirst();
      if (!user) {
        throw new NotFoundException('Không tìm thấy tài khoản quản trị hệ thống');
      }
    } else {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [{ code: dto.salesCode }, { id: dto.salesCode }],
        },
      });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy nhân viên Sale với mã: ${dto.salesCode}`);
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // 2. Đảm bảo kết nối IntegrationConnection ở trạng thái ACTIVE
      let connection;
      if (isOa) {
        connection = await tx.integrationConnection.findFirst({
          where: { provider: ProviderType.ZALO_OA },
        });
        if (!connection) {
          connection = await tx.integrationConnection.create({
            data: {
              userId: user.id,
              provider: ProviderType.ZALO_OA,
              accountLabel: 'Zalo OA: TourLuk Travel Official (4585991630126061653)',
              connectionStatus: ConnectionStatus.ACTIVE,
              lastCheckedAt: new Date(),
              isDemo: false,
            },
          });
        }
      } else {
        connection = await tx.integrationConnection.findFirst({
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
        }
      }

      // 3. Cập nhật Capability Verification thành VERIFIED
      await tx.integrationCapabilityVerification.upsert({
        where: {
          userId_capability: {
            userId: user.id,
            capability: IntegrationCapability.READ_CHATS,
          },
        },
        update: {
          status: CapabilityVerificationStatus.VERIFIED,
          method: isOa ? 'Chrome Extension Zalo OA Sync Connector' : 'Chrome Extension Zalo Web Sync Connector',
          verificationNotes: isOa
            ? 'Tiện ích mở rộng Chrome Extension tự động đồng bộ từ Zalo OA về Webapp.'
            : 'Tiện ích mở rộng Chrome Extension tự động đồng bộ từ chat.zalo.me về Webapp.',
          verifiedAt: new Date(),
        },
        create: {
          userId: user.id,
          capability: IntegrationCapability.READ_CHATS,
          status: CapabilityVerificationStatus.VERIFIED,
          method: isOa ? 'Chrome Extension Zalo OA Sync Connector' : 'Chrome Extension Zalo Web Sync Connector',
          verificationNotes: isOa
            ? 'Tiện ích mở rộng Chrome Extension tự động đồng bộ từ Zalo OA về Webapp.'
            : 'Tiện ích mở rộng Chrome Extension tự động đồng bộ từ chat.zalo.me về Webapp.',
          verifiedAt: new Date(),
        },
      });

      // 4. Tìm hoặc tạo Customer cho khách hàng này
      const cleanCustName = dto.customer.name.trim();
      let customer = await tx.customer.findFirst({
        where: isOa
          ? { fullName: cleanCustName, source: 'Zalo OA' }
          : { assignedToId: user.id, fullName: cleanCustName },
      });

      if (!customer) {
        const custPhone = dto.customer.phone?.trim() || null;
        const code = isOa
          ? await generateCustomerCode(tx, 'OA', 'Zalo OA')
          : await generateCustomerCode(tx, user.name);

        customer = await tx.customer.create({
          data: {
            code,
            fullName: cleanCustName,
            phone: custPhone,
            source: isOa ? 'Zalo OA' : 'ZALO',
            status: CustomerStatus.CONSULTING,
            priority: CustomerPriority.HIGH,
            assignedToId: user.id,
            notes: isOa
              ? 'Khách hàng thực tế đồng bộ từ Zalo OA qua Extension'
              : `Khách hàng thực tế đồng bộ từ Zalo Web của ${user.name}`,
            lastContactedAt: new Date(),
          },
        });
      }

      // 5. Tìm hoặc tạo Conversation
      const channelType = isOa ? 'ZALO_OA' : 'ZALO';
      let conversation = await tx.conversation.findFirst({
        where: {
          customerId: customer.id,
          channelType,
        },
      });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            customerId: customer.id,
            salesUserId: user.id,
            integrationConnectionId: connection?.id || null,
            channelType,
            title: isOa
              ? `Đoạn chat Zalo OA với ${customer.fullName}`
              : `Đoạn chat Zalo với ${customer.fullName}`,
            unreadCount: 0,
            lastMessageAt: new Date(),
            isDemo: false,
          },
        });
      }

      // 6. Lưu các tin nhắn mới (chống trùng lặp thông minh theo luồng hội thoại)
      let addedCount = 0;
      if (dto.messages && Array.isArray(dto.messages) && dto.messages.length > 0) {
        // Lấy danh sách tin nhắn gần nhất đã lưu trong DB của hội thoại này (tối đa 50 tin)
        const recentDbMessages = await tx.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { sentAt: 'desc' },
          take: 50,
        });

        let newMessagesToInsert: typeof dto.messages = [];

        if (recentDbMessages.length === 0) {
          // Trường hợp 1: Hội thoại hoàn toàn mới trong DB -> Thêm toàn bộ danh sách
          newMessagesToInsert = dto.messages;
        } else {
          // Trường hợp 2: DB đã có tin nhắn.
          // Tìm xem tin nhắn cuối cùng trong DB khớp với vị trí nào trong dto.messages (tìm từ cuối danh sách lùi lại)
          const lastDbMsg = recentDbMessages[0];
          const lastDbText = lastDbMsg.textContent?.trim();
          const lastDbDirection = lastDbMsg.direction;

          let matchIdx = -1;
          for (let i = dto.messages.length - 1; i >= 0; i--) {
            const m = dto.messages[i];
            const mText = m.text?.trim();
            const mDir = m.direction === 'OUTBOUND' ? MessageDirection.OUTBOUND : MessageDirection.INBOUND;
            if (mText === lastDbText && mDir === lastDbDirection) {
              matchIdx = i;
              break;
            }
          }

          if (matchIdx !== -1) {
            // Đã tìm thấy điểm neo (tin cuối cùng đã có trong DB).
            // Tất cả tin nhắn nằm sau matchIdx CHẮC CHẮN là tin nhắn mới phát sinh!
            newMessagesToInsert = dto.messages.slice(matchIdx + 1);
          } else {
            // Nếu không tìm thấy chính xác tin cuối (ví dụ người dùng cuộn lên cuộn xuống):
            // Kiểm tra các tin gần đây để lọc trùng
            const recentLookup = new Set(
              recentDbMessages.map((m) => `${m.direction}::${m.textContent?.trim()}`),
            );

            newMessagesToInsert = dto.messages.filter((m) => {
              const mDir = m.direction === 'OUTBOUND' ? MessageDirection.OUTBOUND : MessageDirection.INBOUND;
              const key = `${mDir}::${m.text?.trim()}`;
              return !recentLookup.has(key);
            });
          }
        }

        // Tạo thư mục lưu trữ cô lập riêng cho từng nhân viên Sale (bảo toàn vĩnh viễn hình ảnh & tin nhắn)
        const salesStorageDir = path.resolve(process.cwd(), 'data', 'sales-storage', user.code);
        const imagesDir = path.join(salesStorageDir, 'images');
        const convsDir = path.join(salesStorageDir, 'conversations');
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
        if (!fs.existsSync(convsDir)) fs.mkdirSync(convsDir, { recursive: true });

        // Kiểm tra và cập nhật ảnh thật cho các tin nhắn [Hình ảnh] trong DB còn thiếu attachment
        const existingMessages = await tx.message.findMany({
          where: { conversationId: conversation.id },
          include: { attachments: true },
          orderBy: { sentAt: 'asc' },
        });

        for (let i = 0; i < dto.messages.length; i++) {
          const m = dto.messages[i];
          if (m.imageBase64 || m.imageUrl) {
            const mDir = m.direction === 'OUTBOUND' ? MessageDirection.OUTBOUND : MessageDirection.INBOUND;
            const targetDbMsg = existingMessages.find(
              (dbM) =>
                dbM.direction === mDir &&
                (dbM.textContent === '[Hình ảnh]' || dbM.textContent === 'Hình ảnh' || dbM.contentType === MessageContentType.IMAGE) &&
                (!dbM.attachments || dbM.attachments.length === 0)
            );

            if (targetDbMsg) {
              let imageFileName = '';
              let imageRelPath = '';
              let imageFileSize = 0;

              if (m.imageBase64 && m.imageBase64.startsWith('data:image')) {
                try {
                  const base64Data = m.imageBase64.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');
                  imageFileName = `img_${customer.code}_${Date.now()}_upd_${i}.jpg`;
                  fs.writeFileSync(path.join(imagesDir, imageFileName), buffer);
                  imageRelPath = `/sales-storage/${user.code}/images/${imageFileName}`;
                  imageFileSize = buffer.length;
                } catch (e) {}
              } else if (m.imageUrl && (m.imageUrl.startsWith('http://') || m.imageUrl.startsWith('https://'))) {
                try {
                  const controller = new AbortController();
                  const timeout = setTimeout(() => controller.abort(), 8000);
                  const imgRes = await fetch(m.imageUrl, { signal: controller.signal });
                  clearTimeout(timeout);
                  if (imgRes.ok) {
                    const ab = await imgRes.arrayBuffer();
                    const buf = Buffer.from(ab);
                    imageFileName = `img_${customer.code}_${Date.now()}_upd_${i}.jpg`;
                    fs.writeFileSync(path.join(imagesDir, imageFileName), buf);
                    imageRelPath = `/sales-storage/${user.code}/images/${imageFileName}`;
                    imageFileSize = buf.length;
                  }
                } catch (e) {
                  imageRelPath = m.imageUrl;
                  imageFileName = `img_${customer.code}_${Date.now()}.jpg`;
                }
              }

              if (imageRelPath) {
                await tx.attachment.create({
                  data: {
                    messageId: targetDbMsg.id,
                    customerId: customer.id,
                    fileName: imageFileName || 'image.jpg',
                    fileType: 'image/jpeg',
                    mimeType: 'image/jpeg',
                    fileSize: imageFileSize,
                    filePath: imageRelPath,
                    sourceType: DataSource.CONNECTOR,
                  },
                });
                await tx.message.update({
                  where: { id: targetDbMsg.id },
                  data: { contentType: MessageContentType.IMAGE },
                });
                this.logger.log(`[Sync] Đã cập nhật ảnh thật cho tin nhắn ID: ${targetDbMsg.id}`);
                targetDbMsg.attachments = [{ id: 'updated' } as any];
              }
            }
          }
        }

        // Chèn các tin nhắn mới vào DB theo đúng thứ tự thời gian tăng dần
        const insertBaseTime = Date.now();
        const totalNew = newMessagesToInsert.length;

        for (let idx = 0; idx < totalNew; idx++) {
          const msg = newMessagesToInsert[idx];
          if (!msg.text || !msg.text.trim()) continue;

          const isOutbound = msg.direction === 'OUTBOUND';
          // Đảm bảo tin nhắn mới luôn có sentAt tăng dần và cách nhau 1s, tin cuối cùng là mới nhất
          const sentAt = new Date(insertBaseTime - (totalNew - 1 - idx) * 1000);

          // Xử lý lưu trữ hình ảnh thực tế nếu có (Hỗ trợ cả base64 và URL trực tiếp từ Zalo CDN zadn.vn)
          let hasImage = false;
          let imageFileName = '';
          let imageRelPath = '';
          let imageFileSize = 0;

          if (msg.imageBase64 && msg.imageBase64.startsWith('data:image')) {
            try {
              const base64Data = msg.imageBase64.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              imageFileName = `img_${customer.code}_${Date.now()}_${idx}.jpg`;
              const imageFullPath = path.join(imagesDir, imageFileName);
              fs.writeFileSync(imageFullPath, buffer);
              imageRelPath = `/sales-storage/${user.code}/images/${imageFileName}`;
              imageFileSize = buffer.length;
              hasImage = true;
            } catch (err: any) {
              this.logger.warn(`Lỗi lưu hình ảnh tin nhắn cho ${user.code}: ${err.message}`);
            }
          }

          if (!hasImage && msg.imageUrl && (msg.imageUrl.startsWith('http://') || msg.imageUrl.startsWith('https://'))) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8000);
              const imgRes = await fetch(msg.imageUrl, { signal: controller.signal });
              clearTimeout(timeout);

              if (imgRes.ok) {
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                imageFileName = `img_${customer.code}_${Date.now()}_${idx}.jpg`;
                const imageFullPath = path.join(imagesDir, imageFileName);
                fs.writeFileSync(imageFullPath, buffer);
                imageRelPath = `/sales-storage/${user.code}/images/${imageFileName}`;
                imageFileSize = buffer.length;
                hasImage = true;
              } else {
                imageRelPath = msg.imageUrl;
                imageFileName = `img_${customer.code}_${Date.now()}_${idx}.jpg`;
                hasImage = true;
              }
            } catch (err: any) {
              this.logger.warn(`Lỗi tải hình ảnh từ URL ${msg.imageUrl}: ${err.message}`);
              imageRelPath = msg.imageUrl;
              imageFileName = `img_${customer.code}_${Date.now()}_${idx}.jpg`;
              hasImage = true;
            }
          }

          const createdMsg = await tx.message.create({
            data: {
              conversationId: conversation.id,
              direction: isOutbound ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
              contentType: hasImage ? MessageContentType.IMAGE : MessageContentType.TEXT,
              textContent: msg.text.trim(),
              sentAt,
              isDemo: false,
            },
          });

          if (hasImage) {
            await tx.attachment.create({
              data: {
                messageId: createdMsg.id,
                customerId: customer.id,
                fileName: imageFileName,
                fileType: 'image/jpeg',
                mimeType: 'image/jpeg',
                fileSize: imageFileSize,
                filePath: imageRelPath,
                sourceType: DataSource.CONNECTOR,
              },
            });
          }

          addedCount++;
        }

        // Lưu trữ bản sao lưu JSON độc lập cho nhân viên Sale để bảo toàn vĩnh viễn dữ liệu
        try {
          const allMsgs = await tx.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { sentAt: 'asc' },
            select: { id: true, direction: true, contentType: true, textContent: true, sentAt: true },
          });
          const safeName = customer.fullName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
          const backupFile = path.join(convsDir, `${customer.code}_${safeName}.json`);
          fs.writeFileSync(
            backupFile,
            JSON.stringify(
              {
                saleCode: user.code,
                saleName: user.name,
                customerCode: customer.code,
                customerName: customer.fullName,
                conversationId: conversation.id,
                updatedAt: new Date().toISOString(),
                totalMessages: allMsgs.length,
                messages: allMsgs,
              },
              null,
              2,
            ),
          );
        } catch (backupErr: any) {
          this.logger.warn(`Lỗi ghi backup hội thoại cho ${user.code}: ${backupErr.message}`);
        }

        if (addedCount > 0) {
          await tx.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(),
            },
          });
        }
      }

      return {
        success: true,
        message: `Đã đồng bộ thành công ${isOa ? 'Zalo OA' : 'Zalo cá nhân'}: khách hàng "${customer.fullName}" (${customer.code}) và ${addedCount} tin nhắn!`,
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.fullName,
        },
        conversationId: conversation.id,
        channelType,
        syncedMessagesCount: addedCount,
      };
    });
  }
}
