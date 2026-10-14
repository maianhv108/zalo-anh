import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class CustomerActivitiesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { customerId: string; type: ActivityType; title: string; description?: string }, userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }

    const activity = await this.prisma.customerActivity.create({
      data: {
        customerId: data.customerId,
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
      },
      include: {
        user: { select: { id: true, code: true, name: true } },
      },
    });

    // Cập nhật lastContactedAt cho customer
    await this.prisma.customer.update({
      where: { id: data.customerId },
      data: { lastContactedAt: new Date() },
    });

    return activity;
  }

  async findByCustomer(customerId: string) {
    return this.prisma.customerActivity.findMany({
      where: { customerId },
      include: {
        user: { select: { id: true, code: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
