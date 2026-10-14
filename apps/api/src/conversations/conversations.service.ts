import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { salesUserId?: string; search?: string; isDemo?: boolean }, currentUser: any) {
    const where: any = {};

    if (currentUser.role === UserRole.SALE) {
      where.salesUserId = currentUser.id;
    } else if (query.salesUserId) {
      where.salesUserId = query.salesUserId;
    }

    if (query.isDemo !== undefined) {
      where.isDemo = String(query.isDemo) === 'true';
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { customer: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: query.search } } },
      ];
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            fullName: true,
            phone: true,
            status: true,
            priority: true,
          },
        },
        salesUser: {
          select: {
            id: true,
            code: true,
            name: true,
            avatarUrl: true,
            zaloAccountName: true,
            zaloPhone: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { sentAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            assignedTo: { select: { id: true, name: true, code: true } },
          },
        },
        salesUser: {
          select: {
            id: true,
            code: true,
            name: true,
            avatarUrl: true,
            zaloAccountName: true,
            zaloPhone: true,
          },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
          include: { attachments: true },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Không tìm thấy hội thoại.');
    }

    return conv;
  }
}
