import {
  PrismaClient,
  UserRole,
  UserStatus,
  CustomerStatus,
  CustomerPriority,
  TaskStatus,
  ActivityType,
  IntegrationCapability,
  CapabilityVerificationStatus,
  ConnectionStatus,
  ProviderType,
  DataSource,
  MessageDirection,
  MessageContentType,
  CampaignStatus,
  CampaignRecipientStatus,
  AuditAction,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function getSaleCodePrefix(saleName?: string | null): string {
  if (!saleName || !saleName.trim()) return 'KH';
  const cleanName = saleName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 'KH';
  if (words.length === 1) return words[0].substring(0, Math.min(2, words[0].length)).toUpperCase();
  return words.map((w) => w[0].toUpperCase()).join('');
}

async function main() {
  console.log('--- Bắt đầu dọn dẹp và seed cơ sở dữ liệu mẫu (DEMO DATA) ---');

  // Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.campaignRecipient.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.task.deleteMany();
  await prisma.customerActivity.deleteMany();
  await prisma.customerAssignment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integrationCapabilityVerification.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salesTeam.deleteMany();

  console.log('✓ Đã dọn dẹp bảng cũ.');

  // 1. Tạo 2 SalesTeam
  const teamHN = await prisma.salesTeam.create({
    data: {
      code: 'TEAM_HN',
      name: 'Đội Kinh Doanh Hà Nội',
      description: 'Phụ trách thị trường miền Bắc và khách hàng doanh nghiệp B2B',
    },
  });

  const teamHCM = await prisma.salesTeam.create({
    data: {
      code: 'TEAM_HCM',
      name: 'Đội Kinh Doanh TP.HCM',
      description: 'Phụ trách thị trường miền Nam và khách hàng bán lẻ / thương mại điện tử',
    },
  });

  console.log('✓ Đã tạo 2 SalesTeam.');

  // Mật khẩu mã hóa bcrypt
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@123456', 10);
  const salePasswordHash = await bcrypt.hash('Sale@123456', 10);

  // 2. Tạo 1 Admin
  const admin = await prisma.user.create({
    data: {
      code: 'ADMIN01',
      name: 'Tiểu Miu',
      email: 'admin@saleszalo.local',
      phone: '0901234567',
      password: passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      zaloAccountName: 'Quản Trị Viên Hệ Thống',
      zaloPhone: '0901234567',
    },
  });

  // 3. Tạo 2 Managers
  const mgr1 = await prisma.user.create({
    data: {
      code: 'MGR01',
      name: 'Trần Trưởng Nhóm 1',
      email: 'manager1@saleszalo.local',
      phone: '0902345678',
      password: managerPasswordHash,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      teamId: teamHN.id,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      zaloAccountName: 'Trần Trưởng Nhóm HN',
      zaloPhone: '0902345678',
    },
  });

  const mgr2 = await prisma.user.create({
    data: {
      code: 'MGR02',
      name: 'Lê Trưởng Nhóm 2',
      email: 'manager2@saleszalo.local',
      phone: '0903456789',
      password: managerPasswordHash,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      teamId: teamHCM.id,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      zaloAccountName: 'Lê Trưởng Nhóm HCM',
      zaloPhone: '0903456789',
    },
  });

  // Gán leader cho SalesTeam
  await prisma.salesTeam.update({ where: { id: teamHN.id }, data: { leaderId: mgr1.id } });
  await prisma.salesTeam.update({ where: { id: teamHCM.id }, data: { leaderId: mgr2.id } });

  console.log('✓ Đã tạo Admin và 2 Manager.');

  // 4. Tạo 8 Sale (trong đó có Tiểu Nhã và Mai Anh)
  const salesData = [
    { code: 'SALE01', name: 'Tiểu Nhã', email: 'sale01@saleszalo.local', phone: '0912345601', teamId: teamHN.id, zaloAccountName: 'Tiểu Nhã Zalo', zaloPhone: '0912345601', status: UserStatus.ACTIVE },
    { code: 'SALE02', name: 'Mai Anh', email: 'sale02@saleszalo.local', phone: '0912345602', teamId: teamHN.id, zaloAccountName: 'Mai Anh Zalo', zaloPhone: '0912345602', status: UserStatus.ACTIVE },
    { code: 'SALE03', name: 'Vũ Đình Cường', email: 'sale03@saleszalo.local', phone: '0912345603', teamId: teamHN.id, zaloAccountName: 'Cường Vũ Zalo', zaloPhone: '0912345603', status: UserStatus.ACTIVE },
    { code: 'SALE04', name: 'Đặng Thùy Dung', email: 'sale04@saleszalo.local', phone: '0912345604', teamId: teamHN.id, zaloAccountName: 'Dung Đặng Zalo', zaloPhone: '0912345604', status: UserStatus.ACTIVE },
    { code: 'SALE05', name: 'Bùi Quang Em', email: 'sale05@saleszalo.local', phone: '0912345605', teamId: teamHCM.id, zaloAccountName: 'Em Bùi Zalo', zaloPhone: '0912345605', status: UserStatus.ACTIVE },
    { code: 'SALE06', name: 'Ngô Thị Giang', email: 'sale06@saleszalo.local', phone: '0912345606', teamId: teamHCM.id, zaloAccountName: 'Giang Ngô Zalo', zaloPhone: '0912345606', status: UserStatus.ACTIVE },
    { code: 'SALE07', name: 'Đỗ Mạnh Hùng', email: 'sale07@saleszalo.local', phone: '0912345607', teamId: teamHCM.id, zaloAccountName: 'Hùng Đỗ Zalo', zaloPhone: '0912345607', status: UserStatus.ACTIVE },
    { code: 'SALE08', name: 'Mai Phương Thảo', email: 'sale08@saleszalo.local', phone: '0912345608', teamId: teamHCM.id, zaloAccountName: 'Thảo Mai Zalo', zaloPhone: '0912345608', status: UserStatus.INACTIVE }, // 1 Sale nghỉ việc để test vô hiệu hóa & bàn giao
  ];

  const sales: any[] = [];
  for (const s of salesData) {
    const sale = await prisma.user.create({
      data: {
        code: s.code,
        name: s.name,
        email: s.email,
        phone: s.phone,
        password: salePasswordHash,
        role: UserRole.SALE,
        status: s.status,
        teamId: s.teamId,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.code}`,
        zaloAccountName: s.zaloAccountName,
        zaloPhone: s.zaloPhone,
      },
    });
    sales.push(sale);
  }
  console.log('✓ Đã tạo 8 nhân viên Sale (kèm 1 Sale đã vô hiệu hóa để thử nghiệm bàn giao).');

  // 5. Cài đặt tích hợp & Xác minh (Integration Capability Verification) cho từng Sale
  // Theo quy tắc PRD: Personal Zalo KHÔNG có API công khai, mặc định là NEEDS_VERIFICATION hoặc REJECTED.
  for (const sale of sales) {
    // Tạo IntegrationConnection cho tài khoản Zalo cá nhân của Sale
    const connection = await prisma.integrationConnection.create({
      data: {
        userId: sale.id,
        provider: ProviderType.ZALO_PERSONAL,
        accountLabel: `Zalo Cá Nhân - ${sale.name} (${sale.zaloPhone})`,
        connectionStatus: sale.code === 'SALE01' ? ConnectionStatus.CONNECTING : ConnectionStatus.NOT_CONNECTED,
        isDemo: false,
        lastCheckedAt: new Date(),
        lastErrorCode: sale.code === 'SALE01' ? 'AWAITING_VERIFIED_CONNECTOR' : null,
      },
    });

    // Tạo Demo Connection cho kiểm thử giao diện
    await prisma.integrationConnection.create({
      data: {
        userId: sale.id,
        provider: ProviderType.DEMO,
        accountLabel: `Hộp thư mẫu DEMO - ${sale.name}`,
        connectionStatus: ConnectionStatus.ACTIVE,
        isDemo: true,
        lastCheckedAt: new Date(),
      },
    });

    // 3 Capabilities riêng biệt cho từng Sale:
    // A. READ_CHATS
    await prisma.integrationCapabilityVerification.create({
      data: {
        userId: sale.id,
        capability: IntegrationCapability.READ_CHATS,
        status: sale.code === 'SALE01' ? CapabilityVerificationStatus.IN_REVIEW : CapabilityVerificationStatus.NEEDS_VERIFICATION,
        method: 'Zalo Personal Web/App Connector',
        evidenceUrl: 'https://developers.zalo.me/docs/api/official-account-api',
        evidenceReference: 'REF-OA-DOC-2026',
        scopeNotes: 'Chưa có API chính thức cho tài khoản cá nhân. Đang rà soát giải pháp hợp lệ.',
        verificationNotes: 'Chưa đủ căn cứ kỹ thuật & pháp lý để bật tự động đọc tin nhắn Zalo cá nhân.',
        verifiedByUserId: admin.id,
        verifiedAt: new Date(),
        testResult: 'PENDING_OFFICIAL_API_EVIDENCE',
      },
    });

    // B. SYNC_MESSAGES_FILES
    await prisma.integrationCapabilityVerification.create({
      data: {
        userId: sale.id,
        capability: IntegrationCapability.SYNC_MESSAGES_FILES,
        status: CapabilityVerificationStatus.NEEDS_VERIFICATION,
        method: 'Webhook / Attachment Storage Sync',
        evidenceUrl: '',
        evidenceReference: null,
        scopeNotes: 'Giới hạn lưu trữ tệp tin và ảnh từ hội thoại hợp pháp.',
        verificationNotes: 'Cần xác định thời hạn retention và cơ chế mã hóa lưu trữ trước khi xác minh.',
        verifiedByUserId: null,
        verifiedAt: null,
        testResult: 'NOT_TESTED',
      },
    });

    // C. BULK_SEND
    await prisma.integrationCapabilityVerification.create({
      data: {
        userId: sale.id,
        capability: IntegrationCapability.BULK_SEND,
        status: CapabilityVerificationStatus.REJECTED,
        method: 'Automated Personal Bulk Messaging',
        evidenceUrl: 'https://zalo.me/terms-of-service',
        evidenceReference: 'TOS-SPAM-POLICY-SEC4',
        scopeNotes: 'Tài khoản cá nhân không hỗ trợ API gửi hàng loạt. Vi phạm chính sách chống spam.',
        verificationNotes: 'Bị từ chối do vi phạm điều khoản dịch vụ của Zalo đối với tài khoản cá nhân. Đã khóa chức năng gửi thật.',
        verifiedByUserId: admin.id,
        verifiedAt: new Date(),
        testResult: 'REJECTED_UNAUTHORIZED_CHANNEL',
      },
    });
  }
  console.log('✓ Đã khởi tạo cấu hình kết nối và 3 trạng thái xác minh (Gating) riêng biệt cho từng Sale.');

  // 6. Tạo ~100 Khách hàng (Customers) thực tế kèm lịch sử, trạng thái, phân công
  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
  const middleNames = ['Văn', 'Thị', 'Đình', 'Thùy', 'Quang', 'Hồng', 'Minh', 'Thanh', 'Đức', 'Anh', 'Ngọc', 'Hữu'];
  const lastNames = ['Hải', 'Linh', 'Dũng', 'Trang', 'Sơn', 'Hương', 'Tuấn', 'Mai', 'Nam', 'Yến', 'Long', 'Lan', 'Bình', 'Hà', 'Phúc', 'Phương', 'Tâm', 'Khoa'];
  const sources = ['Facebook Ads', 'Google Ads', 'Giới thiệu', 'Website CRM', 'Zalo cá nhân', 'Sự kiện Hội thảo', 'Tiktok Lead'];
  const statuses = [
    CustomerStatus.NEW,
    CustomerStatus.CONTACTED,
    CustomerStatus.CONSULTING,
    CustomerStatus.WAITING_REPLY,
    CustomerStatus.FOLLOW_UP,
    CustomerStatus.CONVERTED,
    CustomerStatus.DROPPED,
  ];
  const priorities = [CustomerPriority.LOW, CustomerPriority.MEDIUM, CustomerPriority.HIGH, CustomerPriority.URGENT];

  const saleCustomerCounters: Record<string, number> = {};
  const createdCustomers: any[] = [];
  for (let i = 1; i <= 100; i++) {
    const fn = firstNames[i % firstNames.length];
    const mn = middleNames[(i * 3) % middleNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const fullName = `${fn} ${mn} ${ln}`;
    const phone = `09${(80000000 + i * 137).toString().substring(0, 8)}`;
    const email = `khachhang.${i}@example.com`;
    const source = sources[i % sources.length];
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];

    // Gán cho các nhân viên Sale (Sale08 đang inactive, có khoảng 12 khách hàng chờ bàn giao!)
    const assignedSale = i <= 12 ? sales[7] : sales[i % 7];
    const prefix = getSaleCodePrefix(assignedSale.name);
    saleCustomerCounters[prefix] = (saleCustomerCounters[prefix] || 0) + 1;
    const code = `${prefix}${saleCustomerCounters[prefix].toString().padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        code,
        fullName,
        phone,
        email,
        source,
        status,
        priority,
        tags: JSON.stringify(i % 2 === 0 ? ['Khách VIP', 'B2B'] : ['Khách Cá Nhân', 'Quan tâm gói Pro']),
        notes: `Ghi chú CRM cho khách hàng ${fullName}: Nhu cầu tư vấn giải pháp phần mềm cho doanh nghiệp.`,
        assignedToId: assignedSale.id,
        lastContactedAt: new Date(Date.now() - (i % 15) * 86400000),
        nextFollowUpAt: new Date(Date.now() + ((i % 5) + 1) * 86400000),
      },
    });
    createdCustomers.push(customer);

    // Ghi CustomerAssignment ban đầu
    await prisma.customerAssignment.create({
      data: {
        customerId: customer.id,
        fromUserId: null,
        toUserId: assignedSale.id,
        changedByUserId: admin.id,
        reason: 'Phân bổ khách hàng tự động từ nguồn tiếp thị ' + source,
        createdAt: new Date(Date.now() - (i % 30) * 86400000),
      },
    });

    // Tạo hoạt động chăm sóc mẫu (CustomerActivity)
    if (i % 2 === 0) {
      await prisma.customerActivity.create({
        data: {
          customerId: customer.id,
          userId: assignedSale.id,
          type: ActivityType.CALL,
          title: 'Gọi điện trao đổi nhu cầu ban đầu',
          description: `Sale ${assignedSale.name} đã liên hệ với khách hàng ${fullName}. Khách hàng phản hồi tích cực.`,
          createdAt: new Date(Date.now() - (i % 10) * 86400000),
        },
      });
    }

    if (i % 3 === 0) {
      await prisma.customerActivity.create({
        data: {
          customerId: customer.id,
          userId: assignedSale.id,
          type: ActivityType.NOTE,
          title: 'Ghi chú ngân sách dự kiến',
          description: 'Ngân sách dự kiến của khách khoảng 50 - 100 triệu VNĐ.',
          createdAt: new Date(Date.now() - (i % 7) * 86400000),
        },
      });
    }

    // Tạo Task việc cần làm
    if (i % 4 === 0) {
      await prisma.task.create({
        data: {
          title: `Gửi báo giá chi tiết cho ${fullName}`,
          description: 'Soạn thảo bảng báo giá gói Enterprise và gửi file PDF qua Zalo.',
          dueDate: new Date(Date.now() + 86400000 * 2),
          status: i % 8 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
          customerId: customer.id,
          assignedToId: assignedSale.id,
          createdById: assignedSale.id,
        },
      });
    }
  }
  console.log('✓ Đã tạo 100 khách hàng mẫu (kèm 12 khách hàng thuộc Sale 08 đã nghỉ việc để bàn giao).');

  // 7. Tạo một số lịch sử bàn giao mẫu (Customer Handover History)
  const handoverCustomer = createdCustomers[0];
  await prisma.customerAssignment.create({
    data: {
      customerId: handoverCustomer.id,
      fromUserId: sales[1].id,
      toUserId: sales[0].id,
      changedByUserId: mgr1.id,
      reason: 'Điều chuyển khu vực phụ trách Hà Nội - Khách hàng VIP cần Sale kỳ cựu hỗ trợ',
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  });

  await prisma.customerActivity.create({
    data: {
      customerId: handoverCustomer.id,
      userId: mgr1.id,
      type: ActivityType.HANDOVER,
      title: 'Bàn giao khách hàng sang Sale Hoàng Văn An',
      description: 'Lý do: Điều chuyển khu vực phụ trách Hà Nội - Khách hàng VIP cần Sale kỳ cựu hỗ trợ',
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  });

  // 8. Tạo Hội thoại mẫu (DEMO Conversations & Messages) với nhãn DEMO rõ ràng
  const demoCustomers = createdCustomers.slice(0, 10);
  for (let cIdx = 0; cIdx < demoCustomers.length; cIdx++) {
    const cust = demoCustomers[cIdx];
    const assignedSale = sales[cIdx % 4];

    const conversation = await prisma.conversation.create({
      data: {
        customerId: cust.id,
        salesUserId: assignedSale.id,
        channelType: 'ZALO_DEMO',
        title: `Hội thoại Zalo: ${cust.fullName}`,
        isDemo: true, // Nhãn DEMO bắt buộc!
        unreadCount: cIdx % 3 === 0 ? 2 : 0,
        lastMessageAt: new Date(Date.now() - cIdx * 3600000),
      },
    });

    // Tin nhắn đi từ Sale
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        contentType: MessageContentType.TEXT,
        textContent: `Chào anh/chị ${cust.fullName}, em là ${assignedSale.name} từ Sales Zalo Team. Rất vui được hỗ trợ anh/chị ạ!`,
        sentAt: new Date(Date.now() - (cIdx * 3600000 + 1800000)),
        sourceType: DataSource.DEMO,
        isDemo: true,
        deliveryStatus: 'SENT',
      },
    });

    // Tin nhắn đến từ Khách hàng
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        contentType: MessageContentType.TEXT,
        textContent: 'Chào em, bên mình đang cần tư vấn gói phần mềm quản lý bán hàng cho đội ngũ 20 nhân viên Sale. Có thể gửi anh bảng giá được không?',
        sentAt: new Date(Date.now() - (cIdx * 3600000 + 1200000)),
        sourceType: DataSource.DEMO,
        isDemo: true,
        deliveryStatus: 'DELIVERED',
      },
    });

    // Tin nhắn đi kèm file báo giá mẫu
    const fileMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        contentType: MessageContentType.FILE,
        textContent: 'Dạ em gửi anh/chị tài liệu giải pháp và bảng giá chi tiết qua file PDF đính kèm bên dưới nhé ạ!',
        sentAt: new Date(Date.now() - cIdx * 3600000),
        sourceType: DataSource.DEMO,
        isDemo: true,
        deliveryStatus: 'SENT',
      },
    });

    // Tạo Attachment mẫu
    await prisma.attachment.create({
      data: {
        messageId: fileMessage.id,
        customerId: cust.id,
        fileName: `Bao_Gia_CRM_Sales_Zalo_${cust.code}.pdf`,
        fileType: 'PDF',
        mimeType: 'application/pdf',
        fileSize: 1048576, // 1MB
        filePath: `/uploads/demo/Bao_Gia_CRM_Sales_Zalo_${cust.code}.pdf`,
        sourceType: DataSource.DEMO,
        uploadedById: assignedSale.id,
      },
    });
  }
  console.log('✓ Đã tạo các hội thoại và tin nhắn mẫu có nhãn DEMO rõ ràng.');

  // 9. Tạo Chiến dịch gửi tin mẫu (Campaigns)
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Chiến dịch Tri Ân Khách Hàng Q4/2026',
      content: 'Kính gửi Quý khách hàng, Hệ thống gửi tặng Quý khách ưu đãi đặc quyền 20% khi gia hạn gói phần mềm trong tháng này. Trân trọng!',
      status: CampaignStatus.DRAFT, // Mặc định ở trạng thái DRAFT / PREVIEWED, không gửi thật!
      createdById: admin.id,
      targetFilter: JSON.stringify({ status: [CustomerStatus.CONVERTED, CustomerStatus.CONSULTING] }),
      totalRecipients: 15,
      successCount: 0,
      failedCount: 0,
    },
  });

  // Tạo CampaignRecipients mẫu
  for (let r = 0; r < 15; r++) {
    await prisma.campaignRecipient.create({
      data: {
        campaignId: campaign.id,
        customerId: createdCustomers[r].id,
        status: CampaignRecipientStatus.PENDING,
      },
    });
  }
  console.log('✓ Đã tạo chiến dịch gửi tin mẫu ở trạng thái DRAFT an toàn.');

  // 10. Tạo Nhật ký kiểm toán mẫu (AuditLog)
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: AuditAction.LOGIN,
      resource: 'AUTH',
      resourceId: admin.id,
      details: JSON.stringify({ ip: '127.0.0.1', userAgent: 'Chrome/Edge Local' }),
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: AuditAction.UPDATE_VERIFICATION,
      resource: 'CAPABILITY_VERIFICATION',
      resourceId: sales[0].id,
      details: JSON.stringify({ capability: 'BULK_SEND', newStatus: 'REJECTED', reason: 'Personal Zalo spam policy' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✓ Đã tạo dữ liệu AuditLog mẫu.');
  console.log('========================================================');
  console.log('SEED DỮ LIỆU THÀNH CÔNG!');
  console.log('Tài khoản Quản trị: admin@saleszalo.local (Mật khẩu: Admin@123456)');
  console.log('Tài khoản Quản lý:  manager1@saleszalo.local (Mật khẩu: Manager@123456)');
  console.log('Tài khoản Sale:     sale01@saleszalo.local ... sale08 (Mật khẩu: Sale@123456)');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
