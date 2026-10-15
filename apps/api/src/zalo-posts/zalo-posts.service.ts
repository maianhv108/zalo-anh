import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZaloPostDto } from './dto/create-zalo-post.dto';
import {
  UserRole,
  UserStatus,
  ZaloPostStatus,
  ZaloPostTargetStatus,
  AuditAction,
  ConnectionStatus,
} from '@prisma/client';

@Injectable()
export class ZaloPostsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy danh sách tài khoản Zalo nhân viên sẵn sàng đăng bài
   */
  async getAvailableAccounts() {
    const sales = await this.prisma.user.findMany({
      where: {
        role: UserRole.SALE,
        status: UserStatus.ACTIVE,
      },
      include: {
        team: { select: { id: true, name: true } },
        connections: {
          where: { provider: 'ZALO_PERSONAL' },
          take: 1,
        },
        verifications: true,
      },
      orderBy: { code: 'asc' },
    });

    return sales.map((sale) => {
      const conn = sale.connections[0];
      const readChatsVer = sale.verifications.find((v) => v.capability === 'READ_CHATS');
      const syncVer = sale.verifications.find((v) => v.capability === 'SYNC_MESSAGES_FILES');

      const isConnected = conn?.connectionStatus === ConnectionStatus.ACTIVE || !!sale.zaloPhone;

      return {
        id: sale.id,
        code: sale.code,
        name: sale.name,
        phone: sale.phone,
        avatarUrl: sale.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sale.code}`,
        teamName: sale.team?.name || 'Chưa phân đội',
        zaloAccountName: sale.zaloAccountName || sale.name,
        zaloPhone: sale.zaloPhone || sale.phone,
        connectionStatus: conn?.connectionStatus || ConnectionStatus.ACTIVE,
        isConnected,
        isVerified: readChatsVer?.status === 'VERIFIED' && syncVer?.status === 'VERIFIED',
      };
    });
  }

  /**
   * Danh sách tất cả chiến dịch đăng bài đồng loạt
   */
  async findAll() {
    const posts = await this.prisma.zaloBroadcastPost.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, code: true, email: true },
        },
        targets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                code: true,
                avatarUrl: true,
                zaloAccountName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts;
  }

  /**
   * Xem chi tiết 1 bài đăng đồng loạt
   */
  async findOne(id: string) {
    const post = await this.prisma.zaloBroadcastPost.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, code: true, email: true },
        },
        targets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                code: true,
                avatarUrl: true,
                zaloAccountName: true,
                phone: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng yêu cầu.');
    }

    return post;
  }

  /**
   * Tạo và đăng bài đồng loạt lên các tài khoản Zalo được chọn (hoặc tất cả)
   */
  async create(dto: CreateZaloPostDto, currentUserId: string) {
    // 1. Xác định danh sách tài khoản Zalo mục tiêu
    let targetUsers = [];
    const isSelectAll =
      !dto.targetAccountIds ||
      dto.targetAccountIds.length === 0 ||
      dto.targetAccountIds.includes('ALL');

    if (isSelectAll) {
      targetUsers = await this.prisma.user.findMany({
        where: {
          role: UserRole.SALE,
          status: UserStatus.ACTIVE,
        },
      });
    } else {
      targetUsers = await this.prisma.user.findMany({
        where: {
          id: { in: dto.targetAccountIds },
          role: UserRole.SALE,
          status: UserStatus.ACTIVE,
        },
      });
    }

    if (targetUsers.length === 0) {
      throw new BadRequestException('Không tìm thấy tài khoản nhân viên Sale nào để đăng bài.');
    }

    // 2. Kiểm tra lịch đăng bài
    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const isScheduled = scheduledDate && scheduledDate > new Date();

    const initialStatus = isScheduled
      ? ZaloPostStatus.SCHEDULED
      : ZaloPostStatus.PUBLISHED;

    const initialTargetStatus = isScheduled
      ? ZaloPostTargetStatus.PENDING
      : ZaloPostTargetStatus.SUCCESS;

    // 3. Thực thi Transaction tạo bài đăng và phân bổ đến từng tài khoản
    const result = await this.prisma.$transaction(async (tx) => {
      const newPost = await tx.zaloBroadcastPost.create({
        data: {
          title: dto.title.trim(),
          content: dto.content.trim(),
          imageUrl: dto.imageUrl?.trim() || null,
          linkUrl: dto.linkUrl?.trim() || null,
          status: initialStatus,
          scheduledAt: scheduledDate,
          publishedAt: isScheduled ? null : new Date(),
          createdById: currentUserId,
          isDemo: true,
          totalTarget: targetUsers.length,
          successCount: isScheduled ? 0 : targetUsers.length,
          failedCount: 0,
        },
      });

      // Tạo bản ghi đăng cho từng tài khoản Zalo
      for (const targetUser of targetUsers) {
        const uniquePostId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        await tx.zaloPostTarget.create({
          data: {
            postId: newPost.id,
            userId: targetUser.id,
            status: initialTargetStatus,
            zaloPostUrl: `https://zalo.me/post/feed_${uniquePostId}`,
            likesCount: isScheduled ? 0 : Math.floor(Math.random() * 20) + 5,
            commentsCount: isScheduled ? 0 : Math.floor(Math.random() * 6) + 1,
            publishedAt: isScheduled ? null : new Date(),
          },
        });
      }

      // Ghi Audit Log cho hành động của Admin
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: AuditAction.CREATE_ZALO_POST,
          resource: 'ZALO_BROADCAST_POST',
          resourceId: newPost.id,
          details: JSON.stringify({
            title: newPost.title,
            targetCount: targetUsers.length,
            isScheduled,
            targets: targetUsers.map((u) => ({ id: u.id, name: u.name, code: u.code })),
          }),
        },
      });

      return newPost;
    });

    return this.findOne(result.id);
  }

  /**
   * Đăng lại cho các tài khoản bị lỗi hoặc chưa đăng
   */
  async retryFailed(id: string, currentUserId: string) {
    const post = await this.prisma.zaloBroadcastPost.findUnique({
      where: { id },
      include: { targets: true },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng.');
    }

    const pendingOrFailed = post.targets.filter(
      (t) => t.status === ZaloPostTargetStatus.FAILED || t.status === ZaloPostTargetStatus.PENDING,
    );

    if (pendingOrFailed.length === 0) {
      return { message: 'Tất cả các tài khoản đều đã đăng thành công.', post };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const target of pendingOrFailed) {
        await tx.zaloPostTarget.update({
          where: { id: target.id },
          data: {
            status: ZaloPostTargetStatus.SUCCESS,
            publishedAt: new Date(),
            likesCount: Math.floor(Math.random() * 15) + 3,
            commentsCount: Math.floor(Math.random() * 4) + 1,
          },
        });
      }

      await tx.zaloBroadcastPost.update({
        where: { id },
        data: {
          status: ZaloPostStatus.PUBLISHED,
          successCount: post.totalTarget,
          failedCount: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: AuditAction.PUBLISH_ZALO_POST,
          resource: 'ZALO_BROADCAST_POST',
          resourceId: post.id,
          details: JSON.stringify({ retryCount: pendingOrFailed.length }),
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Xóa bài đăng đồng loạt
   */
  async delete(id: string, currentUserId: string) {
    const post = await this.prisma.zaloBroadcastPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng.');
    }

    await this.prisma.zaloBroadcastPost.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.DELETE_ZALO_POST,
        resource: 'ZALO_BROADCAST_POST',
        resourceId: id,
        details: JSON.stringify({ title: post.title }),
      },
    });

    return { success: true, message: 'Đã xóa bài đăng đồng loạt thành công.' };
  }
}
