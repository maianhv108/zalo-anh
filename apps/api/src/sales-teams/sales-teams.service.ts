import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesTeamsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.salesTeam.findMany({
      include: {
        members: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            role: true,
            status: true,
            avatarUrl: true,
            _count: { select: { assignedCustomers: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.salesTeam.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            avatarUrl: true,
            _count: { select: { assignedCustomers: true } },
          },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Không tìm thấy đội kinh doanh.');
    }
    return team;
  }

  async create(data: { name: string; code: string; description?: string }) {
    return this.prisma.salesTeam.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string; leaderId?: string }) {
    return this.prisma.salesTeam.update({
      where: { id },
      data,
    });
  }
}
