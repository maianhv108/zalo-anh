import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HandoverDto } from './dto/handover.dto';
import { ActivityType, AuditAction } from '@prisma/client';

@Injectable()
export class CustomerAssignmentsService {
  constructor(private prisma: PrismaService) {}

  async handover(dto: HandoverDto, currentUser: any) {
    const toUser = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
    });

    if (!toUser) {
      throw new NotFoundException('Không tìm thấy nhân viên tiếp nhận bàn giao.');
    }

    if (toUser.status === 'INACTIVE') {
      throw new BadRequestException('Không thể bàn giao cho nhân viên đã bị vô hiệu hóa.');
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: dto.customerIds }, deletedAt: null },
      include: { assignedTo: { select: { id: true, name: true, code: true } } },
    });

    if (customers.length === 0) {
      throw new BadRequestException('Không tìm thấy khách hàng hợp lệ để bàn giao.');
    }

    // Thực hiện trong Prisma Transaction đảm bảo tính toàn vẹn
    const results = await this.prisma.$transaction(async (tx) => {
      const updatedCustomers: any[] = [];

      for (const customer of customers) {
        const fromUserId = customer.assignedToId;

        // 1. Cập nhật người phụ trách mới
        const updated = await tx.customer.update({
          where: { id: customer.id },
          data: { assignedToId: toUser.id },
        });
        updatedCustomers.push(updated);

        // 2. Ghi CustomerAssignment (lịch sử phân công bất biến)
        await tx.customerAssignment.create({
          data: {
            customerId: customer.id,
            fromUserId,
            toUserId: toUser.id,
            changedByUserId: currentUser.id,
            reason: dto.reason,
          },
        });

        // 3. Ghi CustomerActivity để hiển thị trong timeline của khách hàng
        const fromName = customer.assignedTo?.name || 'Chưa gán';
        await tx.customerActivity.create({
          data: {
            customerId: customer.id,
            userId: currentUser.id,
            type: ActivityType.HANDOVER,
            title: `Bàn giao khách hàng từ ${fromName} sang ${toUser.name}`,
            description: `Lý do bàn giao: ${dto.reason}`,
          },
        });

        // 4. Ghi AuditLog chi tiết cho từng khách
        await tx.auditLog.create({
          data: {
            userId: currentUser.id,
            action: AuditAction.HANDOVER_CUSTOMER,
            resource: 'CUSTOMER',
            resourceId: customer.id,
            details: JSON.stringify({
              customerCode: customer.code,
              fromUserId,
              fromUserName: fromName,
              toUserId: toUser.id,
              toUserName: toUser.name,
              reason: dto.reason,
            }),
          },
        });
      }

      return updatedCustomers;
    });

    return {
      success: true,
      message: `Đã bàn giao thành công ${results.length} khách hàng cho nhân viên ${toUser.name}.`,
      handedOverCount: results.length,
      toUser: { id: toUser.id, code: toUser.code, name: toUser.name },
    };
  }

  async getCustomerHistory(customerId: string) {
    return this.prisma.customerAssignment.findMany({
      where: { customerId },
      include: {
        fromUser: { select: { id: true, code: true, name: true, email: true } },
        toUser: { select: { id: true, code: true, name: true, email: true } },
        changedByUser: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
