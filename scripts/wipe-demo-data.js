const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../apps/api/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  console.log('--- Bắt đầu dọn dẹp sạch sẽ toàn bộ dữ liệu ảo & Sale ảo ---');

  // 1. Xóa toàn bộ tin nhắn & tệp đính kèm
  const delMsg = await prisma.message.deleteMany({});
  console.log(`Đã xóa ${delMsg.count} tin nhắn mẫu.`);

  const delAtt = await prisma.attachment.deleteMany({});
  console.log(`Đã xóa ${delAtt.count} tệp đính kèm.`);

  // 2. Xóa toàn bộ hội thoại
  const delConv = await prisma.conversation.deleteMany({});
  console.log(`Đã xóa ${delConv.count} cuộc hội thoại mẫu.`);

  // 3. Xóa các hoạt động, công việc, bàn giao khách hàng
  const delAct = await prisma.customerActivity.deleteMany({});
  console.log(`Đã xóa ${delAct.count} hoạt động chăm sóc khách.`);

  const delTask = await prisma.task.deleteMany({});
  console.log(`Đã xóa ${delTask.count} công việc/nhắc việc.`);

  const delAssign = await prisma.customerAssignment.deleteMany({});
  console.log(`Đã xóa ${delAssign.count} lịch sử bàn giao khách.`);

  // 4. Xóa chiến dịch gửi tin & bài đăng Zalo hàng loạt
  const delCampRec = await prisma.campaignRecipient.deleteMany({});
  console.log(`Đã xóa ${delCampRec.count} mục tiêu người nhận chiến dịch.`);

  const delCamp = await prisma.campaign.deleteMany({});
  console.log(`Đã xóa ${delCamp.count} chiến dịch gửi tin.`);

  const delPostTarget = await prisma.zaloPostTarget.deleteMany({});
  console.log(`Đã xóa ${delPostTarget.count} mục tiêu bài đăng.`);

  const delPost = await prisma.zaloBroadcastPost.deleteMany({});
  console.log(`Đã xóa ${delPost.count} bài đăng Zalo.`);

  // 5. Xóa toàn bộ khách hàng mẫu
  const delCust = await prisma.customer.deleteMany({});
  console.log(`Đã xóa ${delCust.count} khách hàng mẫu.`);

  // 6. Xóa các mã mời Sale
  const delInvite = await prisma.saleInvite.deleteMany({});
  console.log(`Đã xóa ${delInvite.count} mã mời Sale.`);

  // 7. Xóa toàn bộ tài khoản nhân viên Sale ảo (giữ lại ADMIN)
  const nonAdminUsers = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { id: true, code: true, name: true },
  });

  console.log(`Tìm thấy ${nonAdminUsers.length} tài khoản Sale ảo cần xóa.`);

  for (const u of nonAdminUsers) {
    // Xóa kết nối và xác minh của user này
    await prisma.integrationCapabilityVerification.deleteMany({ where: { userId: u.id } });
    await prisma.integrationConnection.deleteMany({ where: { userId: u.id } });
    await prisma.notification.deleteMany({ where: { userId: u.id } });
    await prisma.auditLog.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    console.log(` - Đã xóa tài khoản: ${u.code} - ${u.name}`);
  }

  // 8. Kiểm tra lại tài khoản Admin còn lại
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, code: true, name: true, email: true, role: true },
  });
  console.log('\n--- KẾT QUẢ DỌN DẸP ---');
  console.log(`Hệ thống sạch sẽ 100%! Hiện tại chỉ còn ${remainingUsers.length} tài khoản quản trị:`);
  remainingUsers.forEach((u) => {
    console.log(`👑 [${u.role}] ${u.code} - ${u.name} (${u.email})`);
  });
}

main()
  .catch((err) => {
    console.error('Lỗi dọn dẹp dữ liệu:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
