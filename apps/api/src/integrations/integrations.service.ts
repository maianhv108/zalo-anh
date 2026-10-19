import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus, ProviderType, AuditAction } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async findAllConnections(query: { userId?: string; provider?: ProviderType }) {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.provider) where.provider = query.provider;

    return this.prisma.integrationConnection.findMany({
      where,
      include: {
        user: { select: { id: true, code: true, name: true, email: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async checkConnection(id: string, currentUserId: string) {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!connection) {
      throw new NotFoundException('Không tìm thấy kết nối tích hợp.');
    }

    let newStatus = connection.connectionStatus;
    let lastErrorCode: string | null = null;

    if (connection.provider === ProviderType.DEMO) {
      newStatus = ConnectionStatus.ACTIVE;
    } else if (connection.provider === ProviderType.ZALO_PERSONAL) {
      // Vì Zalo cá nhân chưa có API hợp lệ được phê duyệt chính thức
      newStatus = ConnectionStatus.ERROR;
      lastErrorCode = 'PERSONAL_ZALO_API_UNAVAILABLE: Chưa có API chính thức từ Zalo cho tài khoản cá nhân';
    } else if (connection.provider === ProviderType.ZALO_OA) {
      newStatus = ConnectionStatus.NOT_CONNECTED;
      lastErrorCode = 'OA_CREDENTIALS_REQUIRED';
    }

    const updated = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        connectionStatus: newStatus,
        lastCheckedAt: new Date(),
        lastErrorCode,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_CONNECTION,
        resource: 'INTEGRATION_CONNECTION',
        resourceId: id,
        details: JSON.stringify({ provider: connection.provider, status: newStatus, errorCode: lastErrorCode }),
      },
    });

    return updated;
  }
}
