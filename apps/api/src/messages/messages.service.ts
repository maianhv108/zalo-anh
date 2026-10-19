import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageDirection, MessageContentType, DataSource, CapabilityVerificationStatus } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(
    conversationId: string,
    data: { textContent: string; contentType?: MessageContentType },
    currentUser: any,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true, salesUser: true },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy hội thoại.');
    }

    // Nếu là hội thoại thật (không phải DEMO) -> bắt buộc kiểm tra Gating!
    if (!conversation.isDemo) {
      const verification = await this.prisma.integrationCapabilityVerification.findUnique({
        where: {
          userId_capability: {
            userId: conversation.salesUserId,
            capability: 'BULK_SEND' as any,
          },
        },
      });

      if (!verification || verification.status !== CapabilityVerificationStatus.VERIFIED) {
        throw new BadRequestException(
          'Chức năng gửi tin ra ngoài bị khóa: Tài khoản Zalo cá nhân chưa có phương thức tích hợp hợp lệ và chưa được xác minh (Trạng thái: ' +
            (verification?.status || 'Chưa cấu hình') +
            ').',
        );
      }
    }

    // Lưu tin nhắn đi từ Sale
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.OUTBOUND,
        contentType: data.contentType || MessageContentType.TEXT,
        textContent: data.textContent,
        sentAt: new Date(),
        sourceType: conversation.isDemo ? DataSource.DEMO : DataSource.CONNECTOR,
        isDemo: conversation.isDemo,
        deliveryStatus: 'SENT',
      },
    });

    // Cập nhật lastMessageAt cho conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Nếu là chế độ DEMO: tự động sinh phản hồi giả lập từ Khách hàng để trải nghiệm CRM sinh động
    if (conversation.isDemo) {
      const sampleReplies = [
        'Dạ cảm ơn bạn nhé, mình đã nhận được thông tin rồi.',
        'Ok bạn, để mình xem qua tài liệu rồi phản hồi lại sau nhé!',
        'Cho mình hỏi thêm về chính sách bảo hành và hỗ trợ kỹ thuật bên bạn như thế nào?',
        'Bên bạn có hỗ trợ xuất hóa đơn VAT điện tử không?',
      ];
      const randomReply = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

      setTimeout(async () => {
        try {
          await this.prisma.message.create({
            data: {
              conversationId,
              direction: MessageDirection.INBOUND,
              contentType: MessageContentType.TEXT,
              textContent: randomReply,
              sentAt: new Date(),
              sourceType: DataSource.DEMO,
              isDemo: true,
              deliveryStatus: 'DELIVERED',
            },
          });
          await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
          });
        } catch (err) {
          // ignore async demo background reply error
        }
      }, 1500);
    }

    return message;
  }

  /**
   * Mô phỏng tin nhắn mới phát sinh từ khách hàng gửi vào Zalo
   * Phục vụ kiểm thử luồng cập nhật tin nhắn liên tục thời gian thực lên Webapp của Admin
   */
  async simulateInboundMessage(conversationId: string, customText?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true, salesUser: true },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy hội thoại.');
    }

    const sampleInbounds = [
      'Dạ bạn ơi, mẫu này có sẵn để giao trong hôm nay không ạ?',
      'Mình vừa chuyển khoản đặt cọc rồi nhé, bạn check tài khoản giúp mình nha!',
      'Gửi giúp mình catalogue và bảng màu thực tế qua Zalo này với!',
      'Cho mình xin địa chỉ cửa hàng gần nhất để mình qua xem trực tiếp nhé.',
      'Sản phẩm bên mình có được hỗ trợ bảo hành chính hãng tận nơi không bạn?',
      'Ok chốt lấy thêm 2 đơn nhé em, vẫn giao về địa chỉ cũ giúp chị!',
    ];

    const content = customText || sampleInbounds[Math.floor(Math.random() * sampleInbounds.length)];

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.INBOUND,
        contentType: MessageContentType.TEXT,
        textContent: content,
        sentAt: new Date(),
        sourceType: DataSource.CONNECTOR,
        isDemo: conversation.isDemo,
        deliveryStatus: 'DELIVERED',
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    return message;
  }
}
