import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus, UserRole, UserStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const [
      totalSales,
      activeSales,
      inactiveSales,
      totalCustomers,
      newCustomers,
      consultingCustomers,
      waitingReplyCustomers,
      convertedCustomers,
      droppedCustomers,
      totalConversations,
      demoConversations,
      overdueTasks,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.SALE } }),
      this.prisma.user.count({ where: { role: UserRole.SALE, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { role: UserRole.SALE, status: UserStatus.INACTIVE } }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.NEW, deletedAt: null } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.CONSULTING, deletedAt: null } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.WAITING_REPLY, deletedAt: null } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.CONVERTED, deletedAt: null } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.DROPPED, deletedAt: null } }),
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { isDemo: true } }),
      this.prisma.task.count({
        where: {
          status: TaskStatus.PENDING,
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const conversionRate = totalCustomers > 0 ? ((convertedCustomers / totalCustomers) * 100).toFixed(1) : '0';

    return {
      kpis: {
        totalSales,
        activeSales,
        inactiveSales,
        totalCustomers,
        newCustomers,
        consultingCustomers,
        waitingReplyCustomers,
        convertedCustomers,
        droppedCustomers,
        conversionRate: `${conversionRate}%`,
        totalConversations,
        demoConversations,
        overdueTasks,
      },
      isDemoData: demoConversations > 0, // Nhãn DEMO DATA khi phát hiện hội thoại demo
    };
  }

  async getCustomerStatusDistribution() {
    const counts = await this.prisma.customer.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    return counts.map((c) => ({
      status: c.status,
      count: c._count.id,
    }));
  }

  async getCustomerSourceDistribution() {
    const counts = await this.prisma.customer.groupBy({
      by: ['source'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    return counts.map((c) => ({
      source: c.source,
      count: c._count.id,
    }));
  }

  async getSalesPerformance() {
    const sales = await this.prisma.user.findMany({
      where: { role: UserRole.SALE },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        team: { select: { name: true } },
        _count: {
          select: {
            assignedCustomers: true,
            activities: true,
          },
        },
        assignedCustomers: {
          select: { status: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return sales.map((s) => {
      const converted = s.assignedCustomers.filter((c) => c.status === CustomerStatus.CONVERTED).length;
      const total = s._count.assignedCustomers;
      const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        teamName: s.team?.name || 'Chưa gán',
        assignedCount: total,
        convertedCount: converted,
        conversionRate: `${rate}%`,
        activitiesCount: s._count.activities,
      };
    });
  }

  async getActivityTimeline() {
    const activities = await this.prisma.customerActivity.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, code: true, fullName: true } },
      },
    });

    return activities;
  }
}
