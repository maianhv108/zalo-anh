import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataSource, UserRole, AuditAction } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    fileType?: string;
    customerId?: string;
    sourceType?: DataSource;
    search?: string;
  }, currentUser: any) {
    const where: any = {};

    if (query.fileType) where.fileType = query.fileType;
    if (query.customerId) where.customerId = query.customerId;
    if (query.sourceType) where.sourceType = query.sourceType;

    if (query.search) {
      where.fileName = { contains: query.search, mode: 'insensitive' };
    }

    // Role check: Nếu là Sale thì chỉ xem các file liên quan tới khách hàng của mình
    if (currentUser.role === UserRole.SALE) {
      where.customer = { assignedToId: currentUser.id };
    }

    return this.prisma.attachment.findMany({
      where,
      include: {
        customer: { select: { id: true, code: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: any) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, code: true, fullName: true, assignedToId: true } },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm.');
    }

    // Kiểm tra quyền download
    if (currentUser.role === UserRole.SALE && attachment.customer?.assignedToId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền tải xuống tệp này.');
    }

    return attachment;
  }

  async delete(id: string, currentUser: any) {
    const attachment = await this.findOne(id, currentUser);

    await this.prisma.attachment.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: AuditAction.DELETE_ATTACHMENT,
        resource: 'ATTACHMENT',
        resourceId: id,
        details: JSON.stringify({ fileName: attachment.fileName, customerCode: attachment.customer?.code }),
      },
    });

    return { success: true, message: 'Đã xóa tệp lưu trữ thành công.' };
  }
}
