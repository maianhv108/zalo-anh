import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, UserRole } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { status?: TaskStatus; customerId?: string; assignedToId?: string }, currentUser: any) {
    const where: any = {};
    if (currentUser.role === UserRole.SALE) {
      where.assignedToId = currentUser.id;
    } else if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;

    return this.prisma.task.findMany({
      where,
      include: {
        customer: { select: { id: true, code: true, fullName: true, phone: true } },
        assignedTo: { select: { id: true, code: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async create(data: { title: string; description?: string; dueDate?: Date; customerId?: string; assignedToId?: string }, currentUserId: string) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        customerId: data.customerId,
        assignedToId: data.assignedToId || currentUserId,
        createdById: currentUserId,
      },
      include: {
        customer: { select: { id: true, code: true, fullName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, data: { title?: string; description?: string; dueDate?: Date; status?: TaskStatus }) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy nhiệm vụ.');
    }
    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async complete(id: string) {
    return this.update(id, { status: TaskStatus.COMPLETED });
  }
}
