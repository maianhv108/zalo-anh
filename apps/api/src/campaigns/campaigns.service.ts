import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignStatus, CampaignRecipientStatus, AuditAction, CapabilityVerificationStatus, ConnectionStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.campaign.findMany({
      include: {
        createdBy: { select: { id: true, code: true, name: true } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, code: true, name: true } },
        recipients: {
          include: {
            customer: { select: { id: true, code: true, fullName: true, phone: true } },
          },
          take: 50,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch.');
    }

    return campaign;
  }

  async preview(dto: CreateCampaignDto) {
    const where: any = { deletedAt: null };

    if (dto.customerIds && dto.customerIds.length > 0) {
      where.id = { in: dto.customerIds };
    } else if (dto.targetFilter) {
      if (dto.targetFilter.status && dto.targetFilter.status.length > 0) {
        where.status = { in: dto.targetFilter.status };
      }
      if (dto.targetFilter.assignedToId) {
        where.assignedToId = dto.targetFilter.assignedToId;
      }
      if (dto.targetFilter.source) {
        where.source = dto.targetFilter.source;
      }
    }

    const customers = await this.prisma.customer.findMany({
      where,
      select: { id: true, code: true, fullName: true, phone: true, status: true, source: true },
      take: 100,
    });

    // Phát hiện số điện thoại trùng lặp
    const seenPhones = new Set<string>();
    const uniqueRecipients: any[] = [];
    const duplicateRecipients: any[] = [];

    for (const c of customers) {
      if (c.phone && seenPhones.has(c.phone)) {
        duplicateRecipients.push(c);
      } else {
        if (c.phone) seenPhones.add(c.phone);
        uniqueRecipients.push(c);
      }
    }

    return {
      totalFound: customers.length,
      uniqueCount: uniqueRecipients.length,
      duplicateCount: duplicateRecipients.length,
      sampleRecipients: uniqueRecipients.slice(0, 10),
      duplicates: duplicateRecipients,
      gatingStatus: {
        canSendReal: false,
        reason: 'Khả năng BULK_SEND trên tài khoản Zalo cá nhân chưa được xác minh hoặc không hỗ trợ trong tài liệu Zalo chính thức.',
      },
    };
  }

  async create(dto: CreateCampaignDto, currentUserId: string) {
    const previewData = await this.preview(dto);

    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        content: dto.content,
        status: CampaignStatus.DRAFT,
        createdById: currentUserId,
        targetFilter: JSON.stringify(dto.targetFilter || {}),
        totalRecipients: previewData.uniqueCount,
      },
    });

    // Thêm recipients vào bảng CampaignRecipient
    const customers = previewData.sampleRecipients;
    for (const c of customers) {
      await this.prisma.campaignRecipient.create({
        data: {
          campaignId: campaign.id,
          customerId: c.id,
          status: CampaignRecipientStatus.PENDING,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.CREATE_CAMPAIGN,
        resource: 'CAMPAIGN',
        resourceId: campaign.id,
        details: JSON.stringify({ name: campaign.name, recipients: previewData.uniqueCount }),
      },
    });

    return campaign;
  }

  async dryRun(id: string, currentUserId: string) {
    const campaign = await this.findOne(id);

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PREVIEWED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.PREVIEW_CAMPAIGN,
        resource: 'CAMPAIGN',
        resourceId: id,
        details: JSON.stringify({ dryRun: true, status: 'PREVIEWED' }),
      },
    });

    return {
      success: true,
      message: 'Chạy thử nghiệm (Dry-run) hoàn tất. Không có tin nhắn thực tế nào được gửi đi.',
      campaign: updated,
    };
  }

  async confirmSend(id: string, currentUserId: string) {
    const campaign = await this.findOne(id);

    // KIỂM TRA QUY TẮC GATING NGHIỆP VỤ BẮT BUỘC:
    // Vì Zalo cá nhân không có API gửi hàng loạt hợp lệ và chưa được xác minh, backend PHẢI CHẶN thao tác gửi thật!
    throw new BadRequestException(
      'THAO TÁC BỊ CHẶN (GATING VIOLATION): Khả năng gửi tin hàng loạt (BULK_SEND) qua Zalo cá nhân chưa được xác minh hợp lệ (Trạng thái: REJECTED/NEEDS_VERIFICATION). Hệ thống từ chối tự động gửi spam để bảo vệ an toàn cho tài khoản nhân viên theo quy định chính sách Zalo.',
    );
  }

  async cancel(id: string, currentUserId: string) {
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.CANCEL_CAMPAIGN,
        resource: 'CAMPAIGN',
        resourceId: id,
      },
    });

    return campaign;
  }
}
