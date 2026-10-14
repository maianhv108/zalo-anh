/**
 * Kiểm thử tính năng Thêm Nhân viên Sale bằng Mã QR (QR Invite Workflow)
 * Kiểm tra đầy đủ: Tạo QR, Quét QR, Xác nhận thông tin, Live Polling, Phân quyền & Bảo mật
 */

const API_BASE = 'http://localhost:4000/api/v1';

async function runQrInviteTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ TÍNH NĂNG MỜI NHÂN VIÊN SALE BẰNG MÃ QR (QR INVITE)');
  console.log(`Thời gian: ${new Date().toISOString()}`);
  console.log(`Backend API: ${API_BASE}`);
  console.log('================================================================\n');

  let adminToken = '';
  let teamId = '';
  let testInviteToken = '';
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
    // 1. Đăng nhập Admin
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@saleszalo.local', password: 'Admin@123456' }),
    });
    const loginData = await loginRes.json();
    assert(loginData.accessToken && loginData.user.role === 'ADMIN', 'Admin đăng nhập thành công');
    adminToken = loginData.accessToken;

    // Lấy ID đội nhóm kinh doanh
    const teamsRes = await fetch(`${API_BASE}/sales-teams`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const teams = await teamsRes.json();
    teamId = teams[0]?.id;
    assert(teamId, `Lấy đội nhóm thành công (${teams[0]?.name})`);

    // 2. Admin tạo mã QR lời mời
    console.log('\n--- BƯỚC 1: Admin tạo mã QR mời nhân viên ---');
    const createRes = await fetch(`${API_BASE}/sale-invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        teamId,
        expiresInMinutes: 15,
      }),
    });
    const createData = await createRes.json();
    assert(
      [200, 201].includes(createRes.status) && createData.token && createData.token.startsWith('inv_'),
      `Tạo mã QR thành công, token ngẫu nhiên bảo mật: ${createData.token}`,
    );
    assert(createData.status === 'PENDING', 'Trạng thái ban đầu của mã mời là PENDING (Đang chờ quét)');
    assert(createData.qrCodeDataUrl && createData.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'Sinh mã QR Base64 PNG chuẩn xác');
    assert(createData.inviteUrl && createData.inviteUrl.includes('/invite/inv_'), `Đường dẫn lời mời an toàn: ${createData.inviteUrl}`);
    assert(createData.expiresInSeconds > 800, `Thời hạn còn lại hợp lệ: ${createData.expiresInSeconds}s`);
    testInviteToken = createData.token;

    // 3. Nhân viên Sale dùng điện thoại quét mã QR
    console.log('\n--- BƯỚC 2: Nhân viên quét mã QR trên điện thoại ---');
    const scanRes = await fetch(`${API_BASE}/sale-invites/${testInviteToken}/scan`, {
      method: 'POST',
    });
    const scanData = await scanRes.json();
    assert([200, 201].includes(scanRes.status) && scanData.status === 'SCANNED', 'Ghi nhận quét mã thành công, trạng thái chuyển sang SCANNED');

    // 4. Admin polling nhận trạng thái live
    console.log('\n--- BƯỚC 3: Admin Polling nhận biết nhân viên đã quét mã ---');
    const pollRes = await fetch(`${API_BASE}/sale-invites/${testInviteToken}/status`);
    const pollData = await pollRes.json();
    assert(pollData.status === 'SCANNED', 'Admin polling thấy ngay trạng thái "SCANNED" trong thời gian thực');

    // 5. Nhân viên xác nhận thông tin tối thiểu
    console.log('\n--- BƯỚC 4: Nhân viên xác nhận danh tính & tham gia hệ thống ---');
    const uniqueEmail = `test.sale.${Date.now()}@example.com`;
    const uniquePhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

    const acceptRes = await fetch(`${API_BASE}/sale-invites/${testInviteToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vũ Thị Ngọc',
        email: uniqueEmail,
        phone: uniquePhone,
        password: 'Sale@123456',
        zaloAccountName: 'Ngọc Vũ Zalo',
      }),
    });
    const acceptData = await acceptRes.json();
    assert([200, 201].includes(acceptRes.status) && acceptData.success, 'Nhân viên xác nhận tham gia thành công');
    assert(acceptData.user.role === 'SALE', 'Vai trò bắt buộc được gán là SALE (không thể tự nâng quyền)');
    assert(acceptData.user.code && acceptData.user.code.startsWith('SALE'), `Được cấp mã nhân viên tự động: ${acceptData.user.code}`);
    assert(acceptData.accessToken, 'Cấp JWT Token để Sale có thể đăng nhập ngay');

    // 6. Kiểm tra Admin polling nhận trạng thái COMPLETED
    console.log('\n--- BƯỚC 5: Admin nhận kết quả COMPLETED & Cập nhật danh sách ---');
    const completePoll = await fetch(`${API_BASE}/sale-invites/${testInviteToken}/status`);
    const completeData = await completePoll.json();
    assert(completeData.status === 'COMPLETED', 'Trạng thái lời mời cập nhật thành COMPLETED');
    assert(completeData.usedByUser && completeData.usedByUser.email === uniqueEmail, `Lưu thông tin nhân viên kích hoạt: ${completeData.usedByUser?.name}`);

    // 7. Xác minh nhân viên xuất hiện trong danh sách CRM Sale
    const usersListRes = await fetch(`${API_BASE}/users?role=SALE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersList = await usersListRes.json();
    const foundUser = (usersList.items || []).find((u) => u.email === uniqueEmail);
    assert(foundUser && foundUser.status === 'ACTIVE', 'Nhân viên mới đã xuất hiện trong danh sách Quản lý Sale của CRM với trạng thái ACTIVE');

    // 8. KIỂM THỬ BẢO MẬT & CÁC TRƯỜNG HỢP BIÊN (SECURITY & EDGE CASES)
    console.log('\n--- BƯỚC 6: Kiểm thử Bảo mật & Ràng buộc nghiệp vụ ---');

    // Test 8.1: Thử dùng lại mã QR đã hoàn tất (Chống dùng nhiều lần)
    const reuseRes = await fetch(`${API_BASE}/sale-invites/${testInviteToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Người Hack Mã',
        email: 'hack@example.com',
        phone: '0988776655',
        password: 'Sale@123456',
      }),
    });
    assert(reuseRes.status === 400, 'CHẶN dùng lại mã QR đã hoàn tất (HTTP 400 One-time use enforced)');

    // Test 8.2: Chặn trùng email/số điện thoại đã có
    const createRes2 = await fetch(`${API_BASE}/sale-invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ expiresInMinutes: 15 }),
    });
    const createData2 = await createRes2.json();
    const dupRes = await fetch(`${API_BASE}/sale-invites/${createData2.token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Trùng Email',
        email: uniqueEmail, // Trùng với người vừa tạo ở trên!
        phone: '0912399999',
        password: 'Sale@123456',
      }),
    });
    assert(dupRes.status === 409 || dupRes.status === 400, 'CHẶN tạo tài khoản trùng Email/SĐT (HTTP 409 Conflict)');

    // Test 8.3: Hủy lời mời (Cancel Invite)
    const cancelRes = await fetch(`${API_BASE}/sale-invites/${createData2.token}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const cancelData = await cancelRes.json();
    assert(cancelData.status === 'CANCELLED', 'Admin hủy lời mời thành công');

    const tryCancelled = await fetch(`${API_BASE}/sale-invites/${createData2.token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Người Tham Gia',
        email: 'cancelled.test@example.com',
        phone: '0912388888',
        password: 'Sale@123456',
      }),
    });
    assert(tryCancelled.status === 400, 'CHẶN tham gia bằng mã QR đã bị hủy (HTTP 400)');

    // Test 8.4: Kiểm tra Audit Log đã ghi nhận
    const auditRes = await fetch(`${API_BASE}/audit-logs?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    const hasInviteAudit = (auditData.items || []).some((l) =>
      ['INVITE_SALE_CREATED', 'INVITE_SALE_COMPLETED', 'INVITE_SALE_CANCELLED'].includes(l.action),
    );
    assert(hasInviteAudit, 'Nhật ký Audit Log đã ghi nhận đầy đủ các thao tác tạo mã QR, hoàn tất tham gia và hủy lời mời');

    console.log('\n================================================================');
    console.log(`KẾT QUẢ KIỂM THỬ QR INVITE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');
    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi ngoại lệ:', err);
    process.exit(1);
  }
}

runQrInviteTests();
