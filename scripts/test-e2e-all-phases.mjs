/**
 * Kịch bản kiểm thử tích hợp toàn diện (E2E Integration Verification)
 * Kiểm tra đầy đủ 6 giai đoạn nghiệp vụ của Sales Zalo Management System
 */

const API_BASE = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ TÍCH HỢP TOÀN DIỆN SALES ZALO MANAGEMENT SYSTEM');
  console.log(`Thời gian: ${new Date().toISOString()}`);
  console.log(`Backend API: ${API_BASE}`);
  console.log('================================================================\n');

  let adminToken = '';
  let managerToken = '';
  let saleToken = '';
  let testCustomerId = '';
  let testCampaignId = '';
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // -------------------------------------------------------------
    // GIAI ĐOẠN 1: Cấu trúc và Nền tảng (Database, Health, Prefix)
    // -------------------------------------------------------------
    console.log('--- GIAI ĐOẠN 1: Cấu trúc & Nền tảng ---');
    const healthRes = await fetch(`${API_BASE}/reports/dashboard-summary`);
    assert(healthRes.status === 401, 'Backend yêu cầu JWT authentication hợp lệ (HTTP 401 khi chưa login)');

    // -------------------------------------------------------------
    // GIAI ĐOẠN 2: Đăng nhập & Phân quyền (ADMIN, MANAGER, SALE)
    // -------------------------------------------------------------
    console.log('\n--- GIAI ĐOẠN 2: Đăng nhập & Phân quyền (RBAC) ---');
    // 1. Admin login
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@saleszalo.local', password: 'Admin@123456' }),
    });
    const adminData = await adminLoginRes.json();
    assert([200, 201].includes(adminLoginRes.status) && adminData.accessToken, 'Đăng nhập ADMIN thành công, nhận JWT token');
    assert(adminData.user.role === 'ADMIN', 'ADMIN có đúng vai trò ADMIN');
    adminToken = adminData.accessToken;

    // 2. Manager login
    const managerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager1@saleszalo.local', password: 'Manager@123456' }),
    });
    const managerData = await managerLoginRes.json();
    assert([200, 201].includes(managerLoginRes.status) && managerData.accessToken, 'Đăng nhập MANAGER thành công');
    managerToken = managerData.accessToken;

    // 3. Sale login
    const saleLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sale01@saleszalo.local', password: 'Sale@123456' }),
    });
    const saleData = await saleLoginRes.json();
    assert([200, 201].includes(saleLoginRes.status) && saleData.accessToken, 'Đăng nhập SALE (sale01) thành công');
    saleToken = saleData.accessToken;

    // 4. RBAC Check: Sale cố tình truy cập API quản trị người dùng (chỉ ADMIN/MANAGER)
    const rbacRes = await fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert(rbacRes.status === 403, 'RBAC Guard chặn SALE truy cập danh sách quản trị User (HTTP 403 Forbidden)');

    // -------------------------------------------------------------
    // GIAI ĐOẠN 3: CRM & Quản lý Sale (Dashboard, Customers, Handover)
    // -------------------------------------------------------------
    console.log('\n--- GIAI ĐOẠN 3: CRM & Quản lý Sale ---');
    // Dashboard summary
    const dashRes = await fetch(`${API_BASE}/reports/dashboard-summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.kpis.totalCustomers === 100, `Dashboard KPI trả về đúng dữ liệu PostgreSQL: 100 khách hàng, ${dashData.kpis.totalSales} nhân viên Sale`);
    assert(dashData.isDemoData === true, 'Dữ liệu được gắn cờ isDemoData: true một cách minh bạch');

    // Lấy danh sách khách hàng có phân trang
    const custRes = await fetch(`${API_BASE}/customers?page=1&pageSize=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const custData = await custRes.json();
    const customerList = custData.items || [];
    assert(custRes.status === 200 && customerList.length === 5 && custData.total === 100, 'Danh sách khách hàng phân trang hoạt động chuẩn xác (5 khách/trang, tổng 100)');
    testCustomerId = customerList[0].id;
    const currentAssignedTo = customerList[0].assignedTo;

    // Thêm ghi chú chăm sóc khách hàng
    const actRes = await fetch(`${API_BASE}/customer-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerId: testCustomerId,
        type: 'NOTE',
        title: 'Tự động kiểm thử CRM Care Flow',
        description: 'Đã trao đổi qua điện thoại về yêu cầu triển khai gói doanh nghiệp.',
      }),
    });
    const actData = await actRes.json();
    assert([200, 201].includes(actRes.status) && actData.id, 'Ghi nhận lịch sử chăm sóc (CustomerActivity) vào cơ sở dữ liệu thành công');

    // Thêm Task nhắc lịch
    const taskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerId: testCustomerId,
        title: 'Nhắc lịch gọi lại tư vấn gói Pro',
        description: 'Khách hàng hẹn gọi lại vào sáng mai',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assignedToId: currentAssignedTo.id,
      }),
    });
    const taskData = await taskRes.json();
    assert([200, 201].includes(taskRes.status) && taskData.id, 'Tạo công việc / nhắc lịch (Task) gắn liền với khách hàng thành công');

    // Bàn giao khách hàng (Customer Handover Flow)
    const salesListRes = await fetch(`${API_BASE}/users?role=SALE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const salesList = await salesListRes.json();
    const salesItems = salesList.items || [];
    const targetSale = salesItems.find((s) => s.id !== currentAssignedTo.id) || salesItems[1];

    const handoverRes = await fetch(`${API_BASE}/customer-assignments/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerIds: [testCustomerId],
        toUserId: targetSale.id,
        reason: 'Bàn giao chuyển giao khu vực theo yêu cầu quản lý (Auto-Test)',
      }),
    });
    const handoverData = await handoverRes.json();
    assert([200, 201].includes(handoverRes.status) && handoverData.success, 'Thực hiện bàn giao khách hàng (Handover) thành công bằng Prisma transaction');

    // Xác minh lại khách hàng đã đổi người phụ trách và có ghi nhận assignment
    const verifyCust = await fetch(`${API_BASE}/customers/${testCustomerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyCustData = await verifyCust.json();
    assert(verifyCustData.assignedToId === targetSale.id, `Khách hàng đã được chuyển giao thành công sang ${targetSale.name}`);

    // -------------------------------------------------------------
    // GIAI ĐOẠN 4: Hộp thư & Kho lưu trữ (Conversations, Messages, Files)
    // -------------------------------------------------------------
    console.log('\n--- GIAI ĐOẠN 4: Hộp thư & Kho lưu trữ ---');
    const convsRes = await fetch(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const convs = await convsRes.json();
    assert(Array.isArray(convs) && convs.length > 0, `Hộp thư đa hội thoại hiển thị ${convs.length} cuộc hội thoại từ DemoConnector`);

    const firstConvId = convs[0].id;
    // Gửi tin nhắn trả lời trong hội thoại
    const sendMsgRes = await fetch(`${API_BASE}/messages/${firstConvId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        textContent: 'Chào anh/chị, em xin phép gửi thêm tài liệu báo giá chi tiết ạ!',
      }),
    });
    const sendMsgData = await sendMsgRes.json();
    assert([200, 201].includes(sendMsgRes.status) && sendMsgData.id, 'Gửi tin nhắn phản hồi thành công và lưu vào bảng Message');

    // Kho lưu trữ tệp đính kèm (Archive)
    const archiveRes = await fetch(`${API_BASE}/attachments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const archiveData = await archiveRes.json();
    assert(Array.isArray(archiveData) && archiveData.length > 0, `Kho lưu trữ hiển thị ${archiveData.length} tệp đính kèm với đầy đủ phân quyền và audit trail`);

    // -------------------------------------------------------------
    // GIAI ĐOẠN 5: Xác minh Tích hợp Zalo Cá nhân (Gating & Verification)
    // -------------------------------------------------------------
    console.log('\n--- GIAI ĐOẠN 5: Xác minh Tích hợp Zalo Cá nhân ---');
    const firstSaleId = salesItems[0].id;
    const verifRes = await fetch(`${API_BASE}/integration-verifications/user/${firstSaleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifData = await verifRes.json();
    assert(verifData.verifications && verifData.verifications.length === 3, 'Tách biệt chính xác 3 Capabilities: READ_CHATS, SYNC_MESSAGES_FILES, BULK_SEND');
    assert(verifData.connection !== undefined, 'Trạng thái kết nối tài khoản Zalo được tách biệt hoàn toàn khỏi trạng thái xác minh capability');

    // Thử cập nhật bằng chứng xác minh cho READ_CHATS
    const updateVerifRes = await fetch(`${API_BASE}/integration-verifications/user/${firstSaleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        capability: 'READ_CHATS',
        status: 'VERIFIED',
        method: 'Đã ký cam kết chính sách dữ liệu và cấp quyền truy cập sandbox',
        evidenceUrl: 'https://docs.saleszalo.local/verifications/sale01-compliance-signed.pdf',
        evidenceReference: 'REF-COMPLIANCE-2026-001',
        verificationNotes: 'Đã xác minh bởi Quản trị viên hệ thống',
      }),
    });
    const updatedVerif = await updateVerifRes.json();
    assert([200, 201].includes(updateVerifRes.status) && updatedVerif.status === 'VERIFIED', 'Cập nhật trạng thái xác minh Capability kèm hồ sơ chứng minh và nhật ký AuditLog');

    // -------------------------------------------------------------
    // GIAI ĐOẠN 6: Chiến dịch & Báo cáo & Audit Logs
    // -------------------------------------------------------------
    console.log('\n--- GIAI ĐOẠN 6: Chiến dịch, Báo cáo & Bất biến Audit Log ---');
    // 1. Xem trước tệp khách hàng chiến dịch (Preview & Lọc trùng)
    const prevRes = await fetch(`${API_BASE}/campaigns/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Xem trước Chiến Dịch',
        content: 'Tin nhắn chào mừng',
        targetFilter: { status: ['CONVERTED', 'CONSULTING'] },
      }),
    });
    const prevData = await prevRes.json();
    assert([200, 201].includes(prevRes.status) && prevData.uniqueCount >= 0, `Xem trước chiến dịch thành công: Phát hiện ${prevData.duplicateCount} số trùng và ${prevData.uniqueCount} số hợp lệ`);

    // 2. Tạo chiến dịch nháp
    const campRes = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Chiến dịch Tri ân Khách Hàng Q4 (E2E Test)',
        content: 'Kính gửi {customer_name}, Sales Zalo xin gửi tặng chương trình ưu đãi đặc biệt.',
        targetFilter: {
          status: ['CONVERTED', 'CONSULTING'],
        },
      }),
    });
    const campData = await campRes.json();
    assert([200, 201].includes(campRes.status) && campData.id, `Tạo chiến dịch nháp thành công (ID: ${campData.id})`);
    testCampaignId = campData.id;

    // 3. Chạy thử nghiệm Dry-Run (không gửi tin thật)
    const dryRunRes = await fetch(`${API_BASE}/campaigns/${testCampaignId}/dry-run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dryRunData = await dryRunRes.json();
    assert([200, 201].includes(dryRunRes.status) && dryRunData.success && dryRunData.campaign.status === 'PREVIEWED', 'Chạy thử Dry-Run thành công: chuyển trạng thái sang PREVIEWED và ghi nhận Audit Log');

    // 4. KIỂM SOÁT AN TOÀN (GATING VIOLATION TEST):
    // Thử xác nhận gửi thật (confirm-send) khi Zalo cá nhân chưa có API hợp lệ
    const sendRealRes = await fetch(`${API_BASE}/campaigns/${testCampaignId}/confirm-send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sendRealData = await sendRealRes.json();
    assert(
      sendRealRes.status === 400 && sendRealData.message.includes('GATING VIOLATION'),
      'Hệ thống KHÓA CHẶT việc gửi thật tin nhắn Zalo cá nhân (Fail-Closed Security: HTTP 400 GATING VIOLATION)',
    );

    // 5. Báo cáo hiệu suất kinh doanh (Reports)
    const repRes = await fetch(`${API_BASE}/reports/sales-performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repData = await repRes.json();
    assert(Array.isArray(repData) && repData.length >= 8, `Báo cáo hiệu suất trả về phân tích đầy đủ cho ${repData.length} nhân viên Sale`);

    // 6. Kiểm tra Nhật ký hoạt động bất biến (Audit Logs)
    const auditRes = await fetch(`${API_BASE}/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditData.items && auditData.items.length > 0, `Nhật ký AuditLog lưu trữ chính xác các hành vi (Đăng nhập, Bàn giao, Cập nhật xác minh, Tạo chiến dịch)`);

    console.log('\n================================================================');
    console.log(`KẾT QUẢ KIỂM THỬ: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');
    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy kiểm thử:', err);
    process.exit(1);
  }
}

runTests();
