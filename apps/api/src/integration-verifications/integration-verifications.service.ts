import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { CapabilityVerificationStatus, ConnectionStatus, IntegrationCapability, AuditAction } from '@prisma/client';

@Injectable()
export class IntegrationVerificationsService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, code: true, name: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên.');
    }

    const [verifications, connection] = await Promise.all([
      this.prisma.integrationCapabilityVerification.findMany({
        where: { userId },
        include: {
          verifiedByUser: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.integrationConnection.findFirst({
        where: { userId, provider: 'ZALO_PERSONAL' },
      }),
    ]);

    return {
      user,
      connection,
      verifications,
    };
  }

  async updateVerification(userId: string, dto: UpdateVerificationDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên.');
    }

    // Tiêu chí bắt buộc: Khi đánh dấu VERIFIED, phải có bằng chứng tài liệu hoặc mã tham chiếu rõ ràng
    if (dto.status === CapabilityVerificationStatus.VERIFIED) {
      if (!dto.evidenceUrl && !dto.evidenceReference) {
        throw new BadRequestException(
          'Không thể chuyển sang trạng thái "Đã xác minh (VERIFIED)" nếu không cung cấp URL tài liệu chính thức hoặc Mã tham chiếu bằng chứng kiểm thử.',
        );
      }
    }

    const existing = await this.prisma.integrationCapabilityVerification.findUnique({
      where: {
        userId_capability: {
          userId,
          capability: dto.capability,
        },
      },
    });

    const oldStatus = existing?.status || 'NONE';

    const verification = await this.prisma.integrationCapabilityVerification.upsert({
      where: {
        userId_capability: {
          userId,
          capability: dto.capability,
        },
      },
      update: {
        status: dto.status,
        method: dto.method,
        evidenceUrl: dto.evidenceUrl,
        evidenceReference: dto.evidenceReference,
        scopeNotes: dto.scopeNotes,
        verificationNotes: dto.verificationNotes,
        verifiedByUserId: currentUserId,
        verifiedAt: new Date(),
        testResult: dto.testResult,
      },
      create: {
        userId,
        capability: dto.capability,
        status: dto.status,
        method: dto.method,
        evidenceUrl: dto.evidenceUrl,
        evidenceReference: dto.evidenceReference,
        scopeNotes: dto.scopeNotes,
        verificationNotes: dto.verificationNotes,
        verifiedByUserId: currentUserId,
        verifiedAt: new Date(),
        testResult: dto.testResult,
      },
      include: {
        verifiedByUser: { select: { id: true, name: true } },
      },
    });

    // Ghi AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_VERIFICATION,
        resource: 'INTEGRATION_CAPABILITY_VERIFICATION',
        resourceId: verification.id,
        details: JSON.stringify({
          userId,
          userCode: user.code,
          capability: dto.capability,
          oldStatus,
          newStatus: dto.status,
          method: dto.method,
          evidenceReference: dto.evidenceReference,
          notes: dto.verificationNotes,
        }),
      },
    });

    return verification;
  }

  /**
   * Quy tắc gating: Chức năng chỉ thực sự khả dụng khi:
   * 1. Capability đã được đánh dấu VERIFIED
   * 2. Connector đã được cấu hình và đang ở trạng thái ACTIVE
   */
  async checkCapabilityUsable(userId: string, capability: IntegrationCapability): Promise<{
    usable: boolean;
    reason?: string;
  }> {
    const [verification, connection] = await Promise.all([
      this.prisma.integrationCapabilityVerification.findUnique({
        where: { userId_capability: { userId, capability } },
      }),
      this.prisma.integrationConnection.findFirst({
        where: { userId, provider: 'ZALO_PERSONAL' },
      }),
    ]);

    if (!verification || verification.status !== CapabilityVerificationStatus.VERIFIED) {
      return {
        usable: false,
        reason: `Quyền ${capability} chưa được xác minh (Trạng thái hiện tại: ${verification?.status || 'Chưa kiểm tra'}).`,
      };
    }

    if (!connection || connection.connectionStatus !== ConnectionStatus.ACTIVE) {
      return {
        usable: false,
        reason: `Kết nối tài khoản chưa kích hoạt thành công (Trạng thái kết nối: ${connection?.connectionStatus || 'Chưa cấu hình'}).`,
      };
    }

    return { usable: true };
  }
}
